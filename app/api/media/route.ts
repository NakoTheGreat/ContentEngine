import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "pipeline");

const TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  html: "text/html; charset=utf-8",
  json: "application/json",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const project = (url.searchParams.get("project") ?? "").replace(/[^a-zA-Z0-9-]/g, "");
  const file = (url.searchParams.get("file") ?? "").replace(/[^a-zA-Z0-9._-]/g, "");

  if (!project || !file || file.includes("..")) {
    return Response.json({ error: "Missing file." }, { status: 400 });
  }

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  if (!type) return Response.json({ error: "Unsupported file type." }, { status: 415 });

  const full = path.join(ROOT, project, "audio", file);
  if (!full.startsWith(path.join(ROOT, project))) {
    return Response.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    const data = await fs.readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
}
