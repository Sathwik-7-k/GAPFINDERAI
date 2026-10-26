import type { StudyDocument } from "@/lib/study-data";

type RetrievedChunk = {
  title: string;
  section: string;
  text: string;
  score: number;
};

type StudyRequest = {
  action?: "chat" | "quiz" | "evaluate";
  question?: string;
  answer?: string;
  expectedAnswer?: string;
  explanation?: string;
  source?: { title: string; section: string; quote: string };
  documents?: StudyDocument[];
};

type QuizQuestion = {
  topic: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const MAX_DOCUMENTS = 20;
const MAX_DOCUMENT_CHARS = 160_000;
const MAX_CONTEXT_CHARS = 14_000;
const STOP_WORDS = new Set(["about", "after", "again", "also", "because", "could", "does", "from", "have", "help", "into", "just", "material", "more", "please", "that", "their", "them", "there", "these", "this", "using", "what", "when", "where", "which", "with", "would", "your"]);

function words(value: string) {
  return value.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !STOP_WORDS.has(word)) ?? [];
}

function splitIntoChunks(document: StudyDocument): RetrievedChunk[] {
  const normalized = document.content.slice(0, MAX_DOCUMENT_CHARS).replace(/\r/g, "");
  const sections = normalized.split(/\n\s*\n+/);
  const chunks: RetrievedChunk[] = [];
  let section = "Source text";
  let buffer = "";

  const flush = () => {
    const text = buffer.trim();
    if (text.length > 35) chunks.push({ title: document.title, section, text: text.slice(0, 1800), score: 0 });
    buffer = "";
  };

  for (const item of sections) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lines = trimmed.split(/\n+/);
    if (lines.length > 1 && lines[0].length < 90 && !/[.!?]$/.test(lines[0])) {
      flush();
      section = lines.shift()?.replace(/^#+\s*/, "") || section;
    }
    const body = (lines.join(" ").trim() || trimmed).replace(/\s+/g, " ");
    const sentences = body.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      for (let offset = 0; offset < sentence.length; offset += 1400) {
        const part = sentence.slice(offset, offset + 1400);
        if (buffer.length + part.length > 1500) flush();
        buffer += `${buffer ? " " : ""}${part}`;
        if (offset + 1400 < sentence.length) flush();
      }
    }
  }
  flush();
  return chunks;
}

function retrieve(documents: StudyDocument[], query: string, limit = 5) {
  const queryWords = new Set(words(query));
  return documents
    .slice(0, MAX_DOCUMENTS)
    .flatMap(splitIntoChunks)
    .map((chunk) => {
      const chunkWords = words(chunk.text);
      const matches = chunkWords.filter((word) => queryWords.has(word)).length;
      const uniqueMatches = new Set(chunkWords.filter((word) => queryWords.has(word))).size;
      return { ...chunk, score: uniqueMatches + matches / Math.max(chunkWords.length, 1) };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

function makeSources(chunks: RetrievedChunk[]) {
  return chunks.map((chunk) => ({
    title: chunk.title,
    section: chunk.section,
    quote: chunk.text.replace(/\s+/g, " ").slice(0, 220),
  }));
}

function contextFor(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => `[S${index + 1}] ${chunk.title} · ${chunk.section}\n${chunk.text}`)
    .join("\n\n")
    .slice(0, MAX_CONTEXT_CHARS);
}

async function askGemini(prompt: string, json = false): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || null;
  } catch {
    return null;
  }
}

function fallbackQuestions(chunks: RetrievedChunk[]) {
  const statements = chunks
    .flatMap((chunk) => chunk.text.split(/(?<=[.!?])\s+/).map((sentence) => ({ sentence: sentence.trim(), chunk })))
    .filter(({ sentence }) => sentence.length >= 45 && sentence.length <= 230 && /[a-z]/i.test(sentence));
  const selected = statements.slice(0, 5);
  return selected.map(({ sentence, chunk }, index) => {
    const distractors = statements
      .filter((item) => item.sentence !== sentence)
      .slice(index, index + 3)
      .map((item) => item.sentence);
    while (distractors.length < 3) distractors.push("This detail is not stated in the selected source.");
    const options = [sentence, ...distractors].sort((first, second) => first.localeCompare(second));
    return {
      topic: chunk.section,
      question: `Which statement is supported by “${chunk.section}” in your material?`,
      options,
      answer: sentence,
      explanation: `Your source states: “${sentence}”`,
      source: { title: chunk.title, section: chunk.section, quote: sentence },
    };
  });
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: StudyRequest;
  try {
    body = (await request.json()) as StudyRequest;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const action = body.action;
  if (!action || !["chat", "quiz", "evaluate"].includes(action)) {
    return Response.json({ error: "Choose a supported study action." }, { status: 400 });
  }
  const documents = Array.isArray(body.documents)
    ? body.documents.filter((document) => typeof document?.title === "string" && typeof document?.content === "string").slice(0, MAX_DOCUMENTS)
    : [];
  if (!documents.length) return Response.json({ error: "Add readable study material before starting." }, { status: 400 });

  if (action === "chat") {
    const question = body.question?.trim().slice(0, 1200) ?? "";
    if (!question) return Response.json({ error: "Write a question for the tutor." }, { status: 400 });
    const chunks = retrieve(documents, question);
    if (!chunks.length) {
      return Response.json({ answer: "I couldn’t find a passage in your uploaded material that answers that. Try a topic or phrase from your notes, or add another source.", sources: [] });
    }
    const context = contextFor(chunks);
    const generated = await askGemini(`You are a study tutor. Answer the student's question using only the SOURCE EXCERPTS below. Do not add outside facts. If the sources do not support an answer, say so. Explain clearly in a few sentences, and refer to sources as [S1], [S2], etc.\n\nSOURCE EXCERPTS:\n${context}\n\nSTUDENT QUESTION: ${question}`);
    const answer = generated ?? `Your material explains that ${chunks[0].text.replace(/\s+/g, " ").slice(0, 430)}${chunks[0].text.length > 430 ? "…" : ""} You can use this as the starting point; ask a follow-up about any part you want to unpack.`;
    return Response.json({ answer, sources: makeSources(chunks.slice(0, 3)), mode: generated ? "gemini-rag" : "retrieval-demo" });
  }

  if (action === "quiz") {
    const rankedChunks = retrieve(documents, "syllabus important concepts definitions examples processes exam questions", 10);
    const chunks = rankedChunks.length ? rankedChunks : documents.slice(0, MAX_DOCUMENTS).flatMap(splitIntoChunks).slice(0, 10);
    if (!chunks.length) return Response.json({ error: "No usable passages were found in the uploaded material." }, { status: 422 });
    const context = contextFor(chunks);
    const generated = await askGemini(`Create 5 multiple-choice diagnostic questions using ONLY these source excerpts. Each question must test understanding, have four concise options, exactly one correct answer, an explanation grounded in the excerpt, and a source identifier. Return JSON only in this shape: {"questions":[{"topic":"short topic","question":"...","options":["...","...","...","..."],"answer":"exact correct option","explanation":"...","sourceIndex":1,"sourceQuote":"short exact quote"}]}. Do not invent facts.\n\nSOURCE EXCERPTS:\n${context}`, true);
    const parsed = generated ? parseJson<{ questions?: (Omit<QuizQuestion, "source"> & { sourceIndex?: number; sourceQuote?: string })[] }>(generated) : null;
    const questions = parsed?.questions
      ?.filter((question) => question.question && question.answer && Array.isArray(question.options) && question.options.length >= 2)
      .slice(0, 5)
      .map((question) => {
        const source = chunks[Math.max(0, Math.min(chunks.length - 1, (question.sourceIndex ?? 1) - 1))];
        return {
          topic: question.topic || source.section,
          question: question.question,
          options: question.options.slice(0, 4),
          answer: question.answer,
          explanation: question.explanation || "Compare your answer with the cited passage.",
          source: { title: source.title, section: source.section, quote: question.sourceQuote || source.text.slice(0, 200) },
        };
      });
    return Response.json({ questions: questions?.length ? questions : fallbackQuestions(chunks), mode: questions?.length ? "gemini-rag" : "retrieval-demo" });
  }

  const selected = body.answer?.trim() ?? "";
  const expected = body.expectedAnswer?.trim() ?? "";
  if (!selected || !expected) return Response.json({ error: "An answer and reference answer are required." }, { status: 400 });
  const chunks = retrieve(documents, `${body.question ?? ""} ${expected}`, 3);
  const context = contextFor(chunks);
  const generated = await askGemini(`Evaluate the student's response using only the reference answer and source excerpt. Return JSON only: {"correct":boolean,"explanation":"brief kind explanation"}.\nQUESTION: ${body.question ?? ""}\nREFERENCE ANSWER: ${expected}\nEXPECTED EXPLANATION: ${body.explanation ?? ""}\nSTUDENT ANSWER: ${selected}\nSOURCE EXCERPT:\n${context}`, true);
  const evaluation = generated ? parseJson<{ correct?: boolean; explanation?: string }>(generated) : null;
  const correct = evaluation?.correct ?? selected === expected;
  return Response.json({
    correct,
    explanation: evaluation?.explanation || body.explanation || (correct ? "Your answer matches the source-backed answer." : `The source-backed answer is: ${expected}`),
    source: body.source,
    mode: evaluation ? "gemini-grounded-evaluation" : "reference-check",
  });
}