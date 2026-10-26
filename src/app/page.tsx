"use client";

import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookMarked, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Database,
  Download, FileText, FolderOpen, LayoutDashboard, Lightbulb, LoaderCircle, Menu,
  Network, Plus, Send, ShieldCheck, Sparkles, Target, Timer, Trash2, Upload, X,
} from "lucide-react";
import { type ChangeEvent, type CSSProperties, useEffect, useRef, useState } from "react";
import { initialDocuments, initialTasks, initialTopics, type StudyDocument, type StudyTask, type StudyTopic } from "@/lib/study-data";

type PageName = "Overview" | "Topic map" | "Diagnosis" | "Revision plan" | "Library" | "Data & privacy";
type Source = { title: string; section: string; quote: string };
type ChatMessage = { role: "assistant" | "user"; content: string; sources?: Source[] };
type QuizQuestion = { topic: string; question: string; options: string[]; answer: string; explanation: string; source: Source };
type QuizResult = { correct: boolean; explanation: string; source?: Source };
type ActivityRecord = { id: number; kind: string; page: string | null; topicName: string | null; documentTitle: string | null; durationSeconds: number; score: number | null; createdAt: string };
type ActivityInput = { kind: "page_view" | "topic_view" | "study_time" | "task_completed" | "diagnostic"; page?: string; topicId?: string; documentId?: string; durationSeconds?: number; score?: number };

const navItems = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Topic map", icon: Network },
  { name: "Diagnosis", icon: CircleHelp },
  { name: "Revision plan", icon: CalendarDays },
  { name: "Library", icon: FolderOpen },
  { name: "Data & privacy", icon: Database },
] as const;
const suggestions = ["Explain my weakest topic", "Quiz me on cell transport", "Why is respiration medium?"];

export default function Home() {
  const [page, setPage] = useState<PageName>("Overview");
  const [documents, setDocuments] = useState(initialDocuments);
  const [topics, setTopics] = useState(initialTopics);
  const [tasks, setTasks] = useState(initialTasks);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hi Amina. I’ve mapped your biology material. Your clearest opportunity is membrane transport, so I can explain it, find the exact section, or test you on it.",
    sources: [{ title: "Cell biology syllabus.pdf", section: "Unit 2 · Membrane transport", quote: "The cell membrane is selectively permeable, controlling which substances enter and leave the cell." }],
  }]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(2);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [activityBusy, setActivityBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function restoreWorkspace() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Database unavailable");
        const state = await response.json() as { documents: StudyDocument[]; topics: StudyTopic[]; tasks: StudyTask[]; attempts: number; analyticsOptIn: boolean };
        if (!active) return;
        setDocuments(state.documents);
        setTopics(state.topics);
        setTasks(state.tasks);
        setAttempts(state.attempts);
        setAnalyticsOptIn(state.analyticsOptIn);
      } catch {
        try {
          const saved = localStorage.getItem("gapfinder-workspace-v1");
          if (saved && active) {
            const state = JSON.parse(saved) as { documents?: StudyDocument[]; topics?: StudyTopic[]; tasks?: StudyTask[]; attempts?: number; analyticsOptIn?: boolean };
            if (state.documents?.length) setDocuments(state.documents);
            if (state.topics?.length) setTopics(state.topics);
            if (state.tasks?.length) setTasks(state.tasks);
            if (typeof state.attempts === "number") setAttempts(state.attempts);
            if (typeof state.analyticsOptIn === "boolean") setAnalyticsOptIn(state.analyticsOptIn);
          }
        } catch {
          localStorage.removeItem("gapfinder-workspace-v1");
        }
      } finally {
        if (active) setHydrated(true);
      }
    }
    void restoreWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = { documents, topics, tasks, attempts, analyticsOptIn };
    localStorage.setItem("gapfinder-workspace-v1", JSON.stringify(snapshot));
    const timeout = window.setTimeout(() => {
      void fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [documents, topics, tasks, attempts, analyticsOptIn, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!hydrated || !analyticsOptIn) return;
    const startedAt = Date.now();
    void trackActivity({ kind: "page_view", page });
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void trackActivity({ kind: "study_time", page, durationSeconds: 30 });
    }, 30_000);
    return () => {
      window.clearInterval(interval);
      const durationSeconds = Math.min(3600, Math.round((Date.now() - startedAt) / 1000));
      if (durationSeconds > 0) void trackActivity({ kind: "study_time", page, durationSeconds });
    };
  }, [page, analyticsOptIn, hydrated]);

  useEffect(() => {
    if (page !== "Data & privacy") return;
    setActivityBusy(true);
    void fetch("/api/activity", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { events?: ActivityRecord[] }) => setActivity(result.events ?? []))
      .finally(() => setActivityBusy(false));
  }, [page]);

  const weakTopics = [...topics].sort((first, second) => first.mastery - second.mastery);
  const completedTasks = tasks.filter((task) => task.done).length;
  const averageMastery = Math.round(topics.reduce((sum, topic) => sum + topic.mastery, 0) / Math.max(topics.length, 1));
  const tasksByPriority = [...tasks].sort((first, second) => {
    const firstMastery = topics.find((topic) => first.topic.includes(topic.name))?.mastery ?? 100;
    const secondMastery = topics.find((topic) => second.topic.includes(topic.name))?.mastery ?? 100;
    return firstMastery - secondMastery;
  });
  const currentQuestion = quiz[quizIndex];

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploadBusy(true);
    let added = 0;
    for (const file of files) {
      if (file.size > 12 * 1024 * 1024) {
        setNotice(`${file.name} is larger than the 12 MB upload limit.`);
        continue;
      }
      try {
        let content: string;
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/materials/parse", { method: "POST", body: formData });
          const result = (await response.json()) as { text?: string; error?: string };
          if (!response.ok) throw new Error(result.error ?? "Could not read this PDF.");
          content = result.text ?? "";
        } else {
          content = await file.text();
        }
        if (!content.trim()) throw new Error("No readable text was found in this file.");
        setDocuments((current) => [{
          id: crypto.randomUUID(), title: file.name,
          kind: file.name.toLowerCase().endsWith(".pdf") ? "PDF material" : "Text material",
          updated: "Just now", content: content.slice(0, 160_000),
        }, ...current]);
        added += 1;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `Could not read ${file.name}.`);
      }
    }
    if (added) setNotice(`${added} material${added > 1 ? "s" : ""} added and ready to use.`);
    setUploadBusy(false);
  }

  async function sendChat(text = chatDraft) {
    const question = text.trim();
    if (!question || chatBusy) return;
    const topic = topics.find((item) => question.toLowerCase().includes(item.name.toLowerCase()));
    const sourceDocument = documents.find((item) => question.toLowerCase().includes(item.title.toLowerCase()));
    void trackActivity({ kind: "topic_view", page: "Study companion", topicId: topic?.id, documentId: sourceDocument?.id });
    setMessages((current) => [...current, { role: "user", content: question }]);
    setChatDraft("");
    setChatBusy(true);
    try {
      const response = await fetch("/api/study", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", question, documents }),
      });
      const result = (await response.json()) as { answer?: string; sources?: Source[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The tutor is unavailable right now.");
      setMessages((current) => [...current, { role: "assistant", content: result.answer ?? "I could not find a useful passage yet.", sources: result.sources }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "The tutor is unavailable right now." }]);
    } finally {
      setChatBusy(false);
    }
  }

  async function startQuiz() {
    setPage("Diagnosis");
    setQuizBusy(true);
    setQuizResult(null);
    setSelectedAnswer("");
    setQuizScore(null);
    setQuizCorrectCount(0);
    setQuiz([]);
    try {
      const response = await fetch("/api/study", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quiz", documents }),
      });
      const result = (await response.json()) as { questions?: QuizQuestion[]; error?: string };
      if (!response.ok || !result.questions?.length) throw new Error(result.error ?? "Add a readable study document to create a diagnostic.");
      setQuiz(result.questions);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create a diagnostic.");
    } finally {
      setQuizBusy(false);
    }
  }

  async function submitAnswer() {
    if (!currentQuestion || !selectedAnswer || quizBusy) return;
    setQuizBusy(true);
    try {
      const response = await fetch("/api/study", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate", question: currentQuestion.question, answer: selectedAnswer,
          expectedAnswer: currentQuestion.answer, explanation: currentQuestion.explanation,
          source: currentQuestion.source, documents,
        }),
      });
      const result = (await response.json()) as QuizResult & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not evaluate that answer.");
      setQuizResult(result);
    } catch (error) {
      setQuizResult({ correct: selectedAnswer === currentQuestion.answer, explanation: error instanceof Error ? error.message : currentQuestion.explanation, source: currentQuestion.source });
    } finally {
      setQuizBusy(false);
    }
  }

  function continueQuiz() {
    if (!quiz.length || !quizResult) return;
    const nextCorrectCount = quizCorrectCount + Number(quizResult.correct);
    setQuizCorrectCount(nextCorrectCount);
    if (quizIndex + 1 < quiz.length) {
      setQuizIndex((index) => index + 1);
      setQuizResult(null);
      setSelectedAnswer("");
      return;
    }
    const score = Math.round((nextCorrectCount / quiz.length) * 100);
    setQuizScore(score);
    setAttempts((value) => value + 1);
    const adjustment = score >= 80 ? 4 : score >= 60 ? 2 : -4;
    const matchedTopicIds = new Set(quiz.flatMap((question) => topics
      .filter((topic) => question.topic.toLowerCase().includes(topic.name.toLowerCase()) || topic.name.toLowerCase().includes(question.topic.toLowerCase()))
      .map((topic) => topic.id)));
    if (!matchedTopicIds.size && weakTopics[0]) matchedTopicIds.add(weakTopics[0].id);
    void trackActivity({ kind: "diagnostic", page: "Diagnosis", score });
    for (const topicId of matchedTopicIds) void trackActivity({ kind: "topic_view", page: "Diagnosis", topicId });
    setTopics((current) => current.map((topic) => {
      if (!matchedTopicIds.has(topic.id)) return topic;
      const mastery = Math.max(20, Math.min(98, topic.mastery + adjustment));
      return { ...topic, mastery, status: mastery < 55 ? "Focus" : mastery < 80 ? "Building" : "Strong" };
    }));
    setNotice("Diagnostic complete. Your topic map and next study steps have been refreshed.");
  }

  function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (task && !task.done) {
      const topic = topics.find((item) => task.topic.includes(item.name));
      void trackActivity({ kind: "task_completed", page: page, topicId: topic?.id });
    }
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  async function setActivityConsent(enabled: boolean) {
    setAnalyticsOptIn(enabled);
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: enabled }),
    });
  }

  async function clearActivityHistory() {
    await fetch("/api/activity", { method: "DELETE" });
    setActivity([]);
  }

  function selectPage(nextPage: PageName) {
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><Target size={19} /></div><div><span className="brand-name">gapfinder</span><span className="brand-ai">AI</span></div><button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button></div>
        <div className="workspace-switcher"><div className="workspace-avatar">B</div><div className="workspace-copy"><strong>Biology · A level</strong><span>Personal workspace</span></div><ChevronDown size={15} /></div>
        <span className="nav-label">STUDY SPACE</span>
        <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? "nav-item-active" : ""}`} onClick={() => selectPage(name)}><Icon size={18} /><span>{name}</span>{name === "Diagnosis" && <span className="nav-pill">{attempts}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="streak-card"><div className="streak-top"><span className="streak-spark">✳</span><span>YOUR STREAK</span><span className="streak-value">6 days</span></div><div className="streak-days"><span className="streak-done">M</span><span className="streak-done">T</span><span className="streak-done">W</span><span className="streak-done">T</span><span className="streak-done">F</span><span className="streak-today">S</span><span>S</span></div></div><button className="profile-row"><span className="profile-avatar">AM</span><span className="profile-copy"><strong>Amina Mercer</strong><small>Year 12 student</small></span><ChevronDown size={15} /></button></div>
      </aside>
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <section className="main-column">
        <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button><div className="breadcrumb"><span>Biology · A level</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-actions"><span className="today-label">MONDAY, 26 OCT</span><button className="icon-button notification-button" aria-label="Notifications"><span className="notification-dot" /><Sparkles size={17} /></button><span className="topbar-avatar">AM</span></div></header>
        <div className="page-content">
          {page === "Overview" && <>
            <div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR LEARNING, IN FOCUS</span><h1>Good morning, Amina<span className="heading-period">.</span></h1><p>Small, focused sessions add up. Here’s where to put your energy today.</p></div><button className="button button-primary" onClick={() => void startQuiz()}><Sparkles size={16} /> Start a diagnostic <ArrowRight size={15} /></button></div>
            <div className="overview-grid"><div className="overview-main">
              <section className="mastery-panel panel"><div className="panel-heading"><div><span className="eyebrow">SUBJECT SNAPSHOT</span><h2>Your biology, at a glance</h2></div><button className="text-button" onClick={() => selectPage("Topic map")}>Topic map <ArrowRight size={14} /></button></div>
                <div className="mastery-content"><div className="mastery-ring" style={{ "--mastery": `${averageMastery}%` } as CSSProperties}><div className="mastery-ring-inner"><strong>{averageMastery}<small>%</small></strong><span>overall mastery</span></div></div><div className="mastery-summary"><div className="summary-topline"><strong>There’s a clear next step.</strong><span className="change-positive"><ArrowUpRight size={14} /> +6% this week</span></div><p>Your strongest topics are holding steady. A little work on transport could lift your overall confidence quickly.</p><div className="mastery-legend"><span><i className="legend-dot dot-strong" /> Strong <b>{topics.filter((topic) => topic.status === "Strong").length}</b></span><span><i className="legend-dot dot-medium" /> Building <b>{topics.filter((topic) => topic.status === "Building").length}</b></span><span><i className="legend-dot dot-focus" /> Needs focus <b>{topics.filter((topic) => topic.status === "Focus").length}</b></span></div></div></div>
                <div className="panel-divider" /><div className="topic-priority-heading"><strong>Priority topics</strong><button className="quiet-link" onClick={() => selectPage("Topic map")}>See all topics <ChevronRight size={14} /></button></div><div className="priority-list">{weakTopics.slice(0, 3).map((topic, index) => <TopicRow key={topic.id} topic={topic} rank={index + 1} onClick={() => { setChatDraft(`Explain ${topic.name} using my uploaded material`); document.getElementById("tutor-input")?.focus(); }} />)}</div>
              </section>
              <section className="plan-panel panel"><div className="panel-heading"><div><span className="eyebrow">A PLAN THAT ADAPTS</span><h2>Your next study steps</h2></div><button className="text-button" onClick={() => selectPage("Revision plan")}>Full plan <ArrowRight size={14} /></button></div><div className="plan-progress-line"><span>{completedTasks} of {tasks.length} sessions complete</span><span>{Math.round(completedTasks / Math.max(tasks.length, 1) * 100)}%</span></div><div className="progress-track"><i style={{ width: `${completedTasks / Math.max(tasks.length, 1) * 100}%` }} /></div><div className="task-list compact-task-list">{tasksByPriority.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} />)}</div></section>
            </div><aside className="overview-rail">
              <section className="today-card panel"><div className="rail-title"><div><span className="eyebrow">MONDAY, OCT 26</span><h2>Today’s focus</h2></div><span className="sun-mark">✳</span></div><div className="focus-callout"><span className="focus-icon"><Lightbulb size={16} /></span><div><strong>Membrane transport</strong><p>One focused session could move this topic from shaky to steady.</p></div></div><div className="focus-meta"><span><Clock3 size={14} /> 25 min</span><span><BookOpen size={14} /> Unit 2 · Notes</span></div><button className="button button-ink button-full" onClick={() => selectPage("Revision plan")}>Begin focus session <ArrowRight size={15} /></button></section>
              <section className="activity-panel panel"><div className="panel-heading"><div><span className="eyebrow">KEEP YOUR MOMENTUM</span><h2>Study rhythm</h2></div><span className="activity-total">3.4h</span></div><div className="activity-chart" role="img" aria-label="Study time over the past seven days"><div className="chart-guides"><i /><i /><i /></div>{[38, 56, 29, 72, 46, 83, 35].map((height, index) => <div className="chart-day" key={index}><div className={`chart-bar ${index === 5 ? "chart-bar-today" : ""}`} style={{ height: `${height}%` }} /><span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div><div className="activity-foot"><span><i className="legend-dot dot-strong" /> This week</span><span>+18% from last week <ArrowUpRight size={13} /></span></div></section>
              <div className="teacher-note"><span><BookMarked size={16} /></span><p><strong>Built from your material</strong><br />Every diagnosis links back to the notes and papers you uploaded.</p></div>
            </aside></div>
          </>}

          {page === "Topic map" && <TopicMapPage topics={topics} onAsk={(topic) => { setChatDraft(`Explain ${topic} using my uploaded material`); document.getElementById("tutor-input")?.focus(); }} />}
          {page === "Diagnosis" && <div className="content-narrow"><div className="page-heading"><span className="eyebrow">A QUICK CHECK, GROUNDED IN YOUR NOTES</span><h1>Diagnostic check<span className="heading-period">.</span></h1><p>Questions are created from your own materials. Each answer includes its source and a clear explanation.</p></div>
            {!quiz.length && !quizBusy && <section className="diagnostic-start panel"><div className="diagnostic-art"><span><Target size={29} /></span><i /><i /><i /></div><div className="diagnostic-copy"><span className="eyebrow">ABOUT 5 MINUTES</span><h2>Find out what’s sticking.</h2><p>We’ll pull a short set of questions from {documents.length} {documents.length === 1 ? "study source" : "study sources"}. Your topic map and revision plan update when you finish.</p><div className="diagnostic-facts"><span><CircleHelp size={15} /> 5 questions</span><span><FileText size={15} /> Cited to your notes</span><span><Sparkles size={15} /> Adaptive follow-up</span></div><button className="button button-primary" onClick={() => void startQuiz()}><Sparkles size={16} /> Generate my diagnostic <ArrowRight size={15} /></button></div></section>}
            {quizBusy && !quiz.length && <section className="loading-panel panel"><LoaderCircle className="spin" size={25} /><strong>Building questions from your material…</strong><span>Finding useful passages and linking each question to its source.</span></section>}
            {quizScore !== null && <section className="result-panel panel"><div className="result-score"><span className="eyebrow">DIAGNOSTIC COMPLETE</span><strong>{quizScore}<small>%</small></strong><span>on this attempt</span></div><div className="result-copy"><h2>{quizScore >= 80 ? "That knowledge is holding." : quizScore >= 50 ? "Good signals, with room to grow." : "Now we know where to focus."}</h2><p>Your topic confidence and next revision steps have been updated from this attempt.</p><div className="result-actions"><button className="button button-primary" onClick={() => selectPage("Topic map")}>Review my topic map <ArrowRight size={15} /></button><button className="button button-secondary" onClick={() => void startQuiz()}>Try another check</button></div></div></section>}
            {quiz.length > 0 && quizScore === null && currentQuestion && <section className="quiz-panel panel"><div className="quiz-topline"><div><span className="eyebrow">QUESTION {quizIndex + 1} OF {quiz.length}</span><h2>{currentQuestion.topic}</h2></div><button className="quiet-link" onClick={() => { setQuiz([]); setQuizResult(null); }}>Exit check <X size={14} /></button></div><div className="quiz-progress">{quiz.map((question, index) => <i key={`${question.topic}-${index}`} className={index < quizIndex ? "quiz-step-done" : index === quizIndex ? "quiz-step-current" : ""} />)}</div><div className="question-source"><FileText size={14} /><span>{currentQuestion.source.title} <b>·</b> {currentQuestion.source.section}</span></div><h3 className="question-text">{currentQuestion.question}</h3><div className="answer-options">{currentQuestion.options.map((option, index) => <button key={`${index}-${option}`} className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""} ${quizResult && option === currentQuestion.answer ? "answer-correct" : ""} ${quizResult && selectedAnswer === option && !quizResult.correct ? "answer-wrong" : ""}`} onClick={() => !quizResult && setSelectedAnswer(option)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{quizResult && option === currentQuestion.answer && <CheckCircle2 size={17} />}</button>)}</div>{quizResult ? <><div className={`answer-feedback ${quizResult.correct ? "feedback-correct" : "feedback-review"}`}><span className="feedback-icon">{quizResult.correct ? <CheckCircle2 size={18} /> : <Lightbulb size={18} />}</span><div><strong>{quizResult.correct ? "That’s right." : "Let’s strengthen this."}</strong><p>{quizResult.explanation}</p>{quizResult.source && <small>Source: {quizResult.source.title} · {quizResult.source.section}</small>}</div></div><button className="button button-primary quiz-submit" onClick={continueQuiz}>{quizIndex + 1 === quiz.length ? "See my results" : "Next question"} <ArrowRight size={15} /></button></> : <button className="button button-primary quiz-submit" disabled={!selectedAnswer || quizBusy} onClick={() => void submitAnswer()}>{quizBusy && <LoaderCircle className="spin" size={16} />} Check answer <ArrowRight size={15} /></button>}</section>}
          </div>}
          {page === "Revision plan" && <RevisionPlanPage tasks={tasksByPriority} topics={topics} onToggle={toggleTask} onStartQuiz={() => void startQuiz()} />}
          {page === "Library" && <LibraryPage documents={documents} onUpload={() => fileInput.current?.click()} onRemove={(id) => setDocuments((current) => current.filter((item) => item.id !== id))} uploadBusy={uploadBusy} />}
          {page === "Data & privacy" && <DataPrivacyPage documents={documents.length} topics={topics.length} tasks={tasks.length} attempts={attempts} analyticsOptIn={analyticsOptIn} activity={activity} busy={activityBusy} onConsent={(enabled) => void setActivityConsent(enabled)} onClear={() => void clearActivityHistory()} />}
        </div>
      </section>

      <aside className="tutor-column"><div className="tutor-header"><div className="tutor-heading-icon"><Sparkles size={17} /></div><div><strong>Study companion</strong><span><i /> Material-aware tutor</span></div><button className="icon-button tutor-more" aria-label="Tutor options" onClick={() => setMessages([])}><Plus size={17} /></button></div><div className="tutor-context"><span className="context-icon"><BookOpen size={15} /></span><span><strong>{documents.length} sources connected</strong><small>Answers stay grounded in your library</small></span><ChevronDown size={14} /></div><div className="chat-stream"><div className="chat-date"><span /> TODAY <span /></div>
        {messages.map((message, index) => <div className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}><div className="chat-avatar">{message.role === "assistant" ? <Sparkles size={14} /> : "AM"}</div><div className="chat-body"><div className="chat-author">{message.role === "assistant" ? "Gapfinder" : "You"}<span>{message.role === "assistant" ? "· grounded answer" : "· just now"}</span></div><p>{message.content}</p>{message.sources?.map((source, sourceIndex) => <div className="source-citation" key={`${source.title}-${sourceIndex}`}><div className="citation-top"><FileText size={13} /><strong>{source.title}</strong></div><span>{source.section}</span><blockquote>“{source.quote}”</blockquote></div>)}</div></div>)}
        {chatBusy && <div className="chat-thinking"><span /><span /><span /><small>Finding a useful passage…</small></div>}{messages.length < 3 && <div className="suggestion-list"><span>TRY ASKING</span>{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendChat(suggestion)}>{suggestion}<ArrowUpRight size={13} /></button>)}</div>}
      </div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><textarea id="tutor-input" rows={2} value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Ask about your material…" aria-label="Ask the study companion" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendChat(); } }} /><div className="composer-bottom"><span><Sparkles size={12} /> Answers cite your material</span><button type="submit" aria-label="Send message" disabled={!chatDraft.trim() || chatBusy}><Send size={15} /></button></div></form><div className="tutor-footnote"><i className="secure-dot" /> Private to your study space <span>·</span> Verify important details</div></aside>

      <input ref={fileInput} type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" multiple hidden onChange={(event) => void handleUpload(event)} />
      {notice && <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </main>
  );
}

function TopicRow({ topic, rank, onClick }: { topic: StudyTopic; rank: number; onClick: () => void }) {
  return <button className="topic-row" onClick={onClick}><span className={`topic-rank rank-${rank}`}>{String(rank).padStart(2, "0")}</span><span className="topic-row-main"><span className="topic-row-title">{topic.name}</span><span className="topic-row-meta">{topic.reason}</span></span><span className={`status-chip status-${topic.status.toLowerCase()}`}>{topic.status}</span><span className="topic-percent">{topic.mastery}%</span><ChevronRight size={15} className="topic-chevron" /></button>;
}

function TaskRow({ task, onToggle }: { task: StudyTask; onToggle: () => void }) {
  return <div className={`task-row ${task.done ? "task-complete" : ""}`}><button className="task-check" aria-label={task.done ? "Mark session incomplete" : "Mark session complete"} onClick={onToggle}>{task.done && <Check size={13} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.topic} <i>·</i> {task.duration}</span></div><span className={`task-priority task-priority-${task.priority.toLowerCase()}`}>{task.priority}</span>{!task.done && <button className="task-arrow" aria-label={`Start ${task.title}`}><ArrowRight size={15} /></button>}</div>;
}

function TopicMapPage({ topics, onAsk }: { topics: StudyTopic[]; onAsk: (topic: string) => void }) {
  const sorted = [...topics].sort((first, second) => first.mastery - second.mastery);
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR KNOWLEDGE, MADE VISIBLE</span><h1>Topic map<span className="heading-period">.</span></h1><p>Confidence is estimated from your diagnostic answers, not how long you’ve studied.</p></div><span className="map-summary"><Network size={16} /> {topics.length} topics mapped</span></div><div className="topic-map-list">{sorted.map((topic, index) => <article className="map-topic panel" key={topic.id}><div className="map-topic-head"><span className="map-topic-number">{String(index + 1).padStart(2, "0")}</span><div className="map-topic-title"><span className="eyebrow">{topic.unit}</span><h2>{topic.name}</h2></div><span className={`status-chip status-${topic.status.toLowerCase()}`}>{topic.status}</span></div><p className="map-topic-reason">{topic.reason}</p><div className="map-topic-progress"><div className="progress-track"><i className={`mastery-${topic.status.toLowerCase()}`} style={{ width: `${topic.mastery}%` }} /></div><strong>{topic.mastery}%</strong><span>confidence</span></div><div className="map-topic-footer"><span><FileText size={14} /> {topic.source}</span><span>{topic.evidence}</span><button className="quiet-link" onClick={() => onAsk(topic.name)}>Ask tutor <ArrowUpRight size={13} /></button></div></article>)}</div><div className="map-legend"><span><i className="legend-dot dot-focus" /> Needs focus: below 55%</span><span><i className="legend-dot dot-medium" /> Building: 55–79%</span><span><i className="legend-dot dot-strong" /> Strong: 80%+</span></div></div>;
}

function RevisionPlanPage({ tasks, topics, onToggle, onStartQuiz }: { tasks: StudyTask[]; topics: StudyTopic[]; onToggle: (id: string) => void; onStartQuiz: () => void }) {
  const weakest = [...topics].sort((first, second) => first.mastery - second.mastery)[0];
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">BUILT AROUND YOUR GAPS</span><h1>Revision plan<span className="heading-period">.</span></h1><p>Short sessions ordered by impact. Your plan adjusts after each diagnostic.</p></div><button className="button button-secondary" onClick={onStartQuiz}><Sparkles size={15} /> Refresh with a check</button></div><div className="plan-summary-strip"><div><span className="eyebrow">AVAILABLE THIS WEEK</span><strong>2h 30m</strong><small>5 focused sessions</small></div><div className="plan-summary-divider" /><div><span className="eyebrow">COMPLETED</span><strong>{tasks.filter((task) => task.done).length} <small>/ {tasks.length}</small></strong><small>Keep your pace steady</small></div><div className="plan-summary-note"><Lightbulb size={17} /><p><strong>Why this order?</strong><br />Topics with lower confidence and higher exam relevance come first.</p></div></div><div className="plan-week-heading"><div><span className="eyebrow">WEEK OF OCTOBER 26</span><h2>Your study sessions</h2></div><span className="plan-time-total"><Clock3 size={14} /> 2h 30m planned</span></div><div className="full-task-list">{tasks.map((task, index) => <div className="timeline-task" key={task.id}><div className="timeline-marker"><span className={task.done ? "marker-done" : ""}>{task.done ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><i /></div><div className="timeline-task-content"><TaskRow task={task} onToggle={() => onToggle(task.id)} /><p>{task.description}</p></div></div>)}</div><section className="plan-recommendation"><div className="recommendation-icon"><ArrowDownRight size={19} /></div><div><span className="eyebrow">NEXT BEST MOVE</span><h3>Begin with {weakest?.name ?? "your highest-priority topic"}</h3><p>{weakest?.reason ?? "A short focused review will help make your next session count."}</p></div><button className="button button-ink" onClick={onStartQuiz}>Check understanding <ArrowRight size={15} /></button></section></div>;
}

function LibraryPage({ documents, onUpload, onRemove, uploadBusy }: { documents: StudyDocument[]; onUpload: () => void; onRemove: (id: string) => void; uploadBusy: boolean }) {
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR SOURCES, YOUR SPACE</span><h1>Study library<span className="heading-period">.</span></h1><p>Upload syllabi, notes, textbook excerpts, and past papers. Tutor answers and questions use these sources.</p></div><button className="button button-primary" onClick={onUpload} disabled={uploadBusy}>{uploadBusy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Add material</button></div><button className="upload-dropzone" onClick={onUpload}><span className="upload-drop-icon"><Upload size={21} /></span><strong>Drop a file into your study space</strong><span>PDF, TXT or Markdown · Up to 12 MB per file</span><span className="button button-secondary upload-browse">Browse files</span></button><div className="library-toolbar"><div><span className="eyebrow">CONNECTED MATERIAL</span><h2>{documents.length} sources</h2></div><span className="filter-button">All materials <ChevronDown size={14} /></span></div>{documents.length ? <div className="library-list">{documents.map((document, index) => <article className="library-item" key={document.id}><span className={`file-icon file-icon-${index % 3}`}><FileText size={19} /></span><div className="library-item-copy"><strong>{document.title}</strong><span>{document.kind} <i>·</i> {document.updated}</span><small>{Math.max(1, Math.ceil(document.content.length / 1800))} sections indexed for retrieval</small></div><span className="indexed-status"><i /> Ready</span><button className="remove-document" onClick={() => onRemove(document.id)} aria-label={`Remove ${document.title}`}><X size={16} /></button></article>)}</div> : <div className="empty-library"><FolderOpen size={28} /><strong>Your library is ready for its first source.</strong><span>Add a syllabus, notes, or a past paper to get started.</span><button className="button button-primary" onClick={onUpload}><Upload size={15} /> Upload material</button></div>}<div className="library-privacy"><BookOpen size={16} /><span><strong>Your study materials stay in this browser for this demo.</strong> Configure persistent storage and authentication before using real student data.</span></div></div>;
}

function DataPrivacyPage({ documents, topics, tasks, attempts, analyticsOptIn, activity, busy, onConsent, onClear }: { documents: number; topics: number; tasks: number; attempts: number; analyticsOptIn: boolean; activity: ActivityRecord[]; busy: boolean; onConsent: (enabled: boolean) => void; onClear: () => void }) {
  const studySeconds = activity.filter((event) => event.kind === "study_time").reduce((total, event) => total + event.durationSeconds, 0);
  return <div className="content-narrow"><div className="page-heading"><span className="eyebrow">YOUR WORKSPACE, YOUR CHOICE</span><h1>Data & privacy<span className="heading-period">.</span></h1><p>See what is saved in the local database, choose whether in-app activity is recorded, and export or clear your data.</p></div>
    <section className="database-card panel"><div className="database-icon"><Database size={21} /></div><div className="database-info"><span className="eyebrow">LOCAL SQLITE DATABASE</span><h2>gapfinder.sqlite</h2><p><code>data/gapfinder.sqlite</code> · Stored on this machine and excluded from Git.</p></div><a className="button button-secondary" href="/api/workspace/export" download><Download size={15} /> Export backup</a></section>
    <div className="database-stats"><div className="panel"><span className="eyebrow">SOURCES</span><strong>{documents}</strong><small>study documents</small></div><div className="panel"><span className="eyebrow">TOPIC MAP</span><strong>{topics}</strong><small>tracked topics</small></div><div className="panel"><span className="eyebrow">REVISION</span><strong>{tasks}</strong><small>study sessions</small></div><div className="panel"><span className="eyebrow">DIAGNOSTICS</span><strong>{attempts}</strong><small>recorded attempts</small></div></div>
    <section className="consent-panel panel"><div className="consent-copy"><span className="eyebrow">OPTIONAL LEARNING ANALYTICS</span><h2>Share in-app study activity</h2><p>When enabled, GapFinder records the pages and topics you open, study time while the app is visible, completed plan sessions, and diagnostic scores. This helps summarize learning patterns inside this workspace.</p><p className="privacy-boundary"><ShieldCheck size={15} /> No device-wide tracking, browser history, other apps, keystrokes, or raw tutor messages are collected.</p></div><button type="button" role="switch" aria-checked={analyticsOptIn} aria-label="Share in-app study activity" className={`consent-switch ${analyticsOptIn ? "consent-on" : ""}`} onClick={() => onConsent(!analyticsOptIn)}><span /></button><span className={`consent-state ${analyticsOptIn ? "consent-state-on" : ""}`}>{analyticsOptIn ? "On" : "Off"}</span></section>
    <section className="activity-panel-full panel"><div className="activity-history-heading"><div><span className="eyebrow">ACTIVITY STORED IN SQLITE</span><h2>Recent learning activity</h2></div><div className="activity-actions"><span>{busy ? "Loading…" : `${activity.length} recent events`}</span><button className="quiet-link clear-activity" disabled={!activity.length} onClick={onClear}><Trash2 size={14} /> Clear history</button></div></div>
      {activity.length ? <div className="activity-history-list">{activity.slice(0, 20).map((event) => <div className="activity-history-item" key={event.id}><span className={`activity-kind-icon kind-${event.kind}`} aria-hidden="true">{event.kind === "study_time" ? <Timer size={15} /> : event.kind === "diagnostic" ? <CircleHelp size={15} /> : event.kind === "task_completed" ? <Check size={15} /> : event.kind === "topic_view" ? <BookOpen size={15} /> : <LayoutDashboard size={15} />}</span><div><strong>{activityTitle(event)}</strong><span>{event.topicName ?? event.documentTitle ?? event.page ?? "Study space"}</span></div><time>{new Date(event.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>{event.score !== null && <b className="activity-score">{event.score}%</b>}</div>)}</div> : <div className="activity-empty"><Clock3 size={19} /><span>{analyticsOptIn ? "Your opted-in activity will appear here as you study." : "Activity tracking is off. Turn it on above to record in-app learning patterns."}</span></div>}
      <div className="activity-summary"><span><Timer size={14} /> {Math.floor(studySeconds / 60)} min tracked in recent activity</span><span>{analyticsOptIn ? "Collection stops when you switch it off." : "Nothing is being collected while tracking is off."}</span></div>
    </section>
    <p className="database-warning">This is a single-workspace local demo, not a secure multi-student service. Do not store real student records here or expose this server publicly before adding authentication and per-student authorization.</p>
  </div>;
}

function activityTitle(event: ActivityRecord) {
  if (event.kind === "study_time") return `Studied in ${event.page ?? "GapFinder"}`;
  if (event.kind === "diagnostic") return "Completed a diagnostic";
  if (event.kind === "task_completed") return "Completed a revision session";
  if (event.kind === "topic_view") return "Opened a topic or tutor session";
  return `Viewed ${event.page ?? "the study space"}`;
}

function trackActivity(event: ActivityInput) {
  return fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => undefined);
}
