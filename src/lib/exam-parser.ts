export type ExamQuestion = {
  id: number;
  status: string;
  prompt: string;
  options: { label: string; text: string }[];
  answer: string;
  correctAnswer: string;
  source: string;
};

function csvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (char === '"' && quoted && csv[i + 1] === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = ""; continue;
    }
    cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (value: string) => value.replace(/^\uFEFF/, "").replace(/\s+/g, " ").trim();

function parseQuestion(raw: string, index: number, status: string, source: string): ExamQuestion {
  const text = clean(raw);
  const questionMatch = text.match(/Question text\s+(.+?)(?=\s+Question \d+\s+(?:Select|Answer)|\s+Select (?:one|one or more):|\s+Answer\s+[A-D]\.)/i);
  const prompt = clean(questionMatch?.[1] || text.split(/\s+(?:Feedback|The correct answer is:)/i)[0]);
  const optionsStart = text.indexOf("Select one:") >= 0 ? text.indexOf("Select one:") + 11 : text.indexOf("Select one or more:") >= 0 ? text.indexOf("Select one or more:") + 20 : text.indexOf("Answer ") >= 0 ? text.indexOf("Answer ") : -1;
  const optionsText = optionsStart >= 0 ? text.slice(optionsStart).split(/\s+Feedback\s+/i)[0].split(/\s+The correct answer is:/i)[0] : "";
  const options = [...optionsText.matchAll(/(?:^|\s)([A-D])\.\s+(.+?)(?=\s+[A-D]\.\s+|$)/gi)].map((match) => ({ label: match[1].toUpperCase(), text: clean(match[2]) }));
  const answer = clean(text.match(/The correct answers? (?:is|are):\s*(.+)$/i)?.[1] || "");
  const matchedOption = options.find((option) => answer.toLowerCase().includes(option.text.toLowerCase()));
  const resolvedStatus = clean(status) || (/(?:Mark|score)\s+1\.00\s+out of\s+1\.00/i.test(text) ? "correct" : "review");
  return { id: Number(text.match(/Question\s+(\d+)/i)?.[1] || index + 1), status: resolvedStatus, prompt, options, answer, correctAnswer: matchedOption?.label || "", source };
}

export function parseCsv(csv: string, source: string): ExamQuestion[] {
  return csvRows(csv).slice(1).filter((row) => row.length >= 3 && row[2]).map((row, index) => parseQuestion(row[2], index, row[1], source));
}
