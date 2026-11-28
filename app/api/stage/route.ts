import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Every stage writes its own file under pipeline/<project>/ so a single stage
 * can be re-run (or hand-edited) without replaying the whole pipeline.
 */

const STAGES = ["brief", "formats", "script", "voice", "animation", "export", "chat"] as const;
type StageFile = (typeof STAGES)[number];

const ROOT = path.join(process.cwd(), "pipeline");

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60) || "ad";
}

function isStage(value: string): value is StageFile {
  return (STAGES as ReadonlyArray<string>).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const project = safeName(url.searchParams.get("project") ?? "");
  const dir = path.join(ROOT, project);

  const data: Record<string, unknown> = {};
  try {
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.endsWith(".json")) return;
        const key = entry.replace(/\.json$/, "");
        if (!isStage(key)) return;
        try {
          data[key] = JSON.parse(await fs.readFile(path.join(dir, entry), "utf8"));
        } catch {
          // Ignore a half-written file.
        }
      }),
    );
  } catch {
    return Response.json({ project, data: {}, exists: false });
  }

  return Response.json({ project, data, exists: true });
}

export async function POST(request: Request) {
  let body: { project?: string; stage?: string; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const project = safeName(body.project ?? "");
  if (!body.stage || !isStage(body.stage)) {
    return Response.json({ error: "Unknown stage." }, { status: 400 });
  }

  const dir = path.join(ROOT, project);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${body.stage}.json`);
  await fs.writeFile(file, JSON.stringify(body.data, null, 2), "utf8");

  return Response.json({
    saved: true,
    path: path.relative(process.cwd(), file).split(path.sep).join("/"),
    savedAt: new Date().toISOString(),
  });
}
