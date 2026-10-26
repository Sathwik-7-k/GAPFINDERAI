import { extractText } from "unpdf";
import { getCurrentUser } from "@/lib/auth";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_TEXT_LENGTH = 160_000;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to upload study materials." }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a PDF file to upload." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "PDF files must be 12 MB or smaller." }, { status: 413 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "This endpoint accepts PDF files only." }, { status: 415 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractText(bytes, { mergePages: true });
    const text = extracted.text;
    if (!text.trim()) {
      return Response.json({ error: "No selectable text was found. Scanned PDFs need OCR first." }, { status: 422 });
    }
    return Response.json({ text: text.slice(0, MAX_TEXT_LENGTH), pages: extracted.totalPages });
  } catch {
    return Response.json({ error: "Could not read this PDF. Check that it is a valid, text-based PDF." }, { status: 400 });
  }
}