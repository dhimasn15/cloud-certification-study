import fs from "node:fs/promises";
import path from "node:path";
import { parseCsv, type ExamQuestion } from "./exam-parser";

export type { ExamQuestion } from "./exam-parser";

export type ExamSource = {
  name: string;
  file: string;
  count: number;
  correct: number;
  score: number;
  added: string;
  questions: ExamQuestion[];
};

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "imports");

async function csvFiles() {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(sourceDirectory, { withFileTypes: true });
    files.push(...entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv")).map((entry) => path.join(sourceDirectory, entry.name)));
  } catch { /* The imports directory may not exist yet. */ }
  return [...new Set(files)];
}

export async function getExamSources(): Promise<ExamSource[]> {
  const files = await csvFiles();
  const sources = await Promise.all(files.map(async (file) => {
    const questions = parseCsv(await fs.readFile(file, "utf8"), path.basename(file, ".csv"));
    const correct = questions.filter((question) => /1\.00/.test(question.status) || /correct/i.test(question.status)).length;
    const stat = await fs.stat(file);
    return { name: path.basename(file, ".csv"), file: path.relative(root, file), count: questions.length, correct, score: questions.length ? Math.round(correct / questions.length * 100) : 0, added: stat.mtime.toISOString(), questions };
  }));
  return sources.filter((source) => source.count > 0).sort((a, b) => b.added.localeCompare(a.added));
}
