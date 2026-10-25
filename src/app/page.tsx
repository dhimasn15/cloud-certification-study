"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Cloud, ExternalLink, FileText, Filter, Plus, Search, Sparkles, Target, X } from "lucide-react";
import { parseCsv, type ExamQuestion } from "@/lib/exam-parser";

type Question = ExamQuestion;
type Source = { name: string; file: string; count: number; correct: number; score: number; added: string; questions: Question[] };
type FilterType = "all" | "review" | "correct";

const navItems = [{ label: "Overview", icon: Target }, { label: "Review queue", icon: BookOpen }, { label: "Exam sources", icon: FileText }];
const isCorrect = (question: Question) => /1\.00|correct/i.test(question.status);
const sourceLabel = (name: string) => name.replace(/^quiz-/, "").replace(/[-_]/g, " ");

const localExplanations = [
  { keywords: ["workforce identity federation", "entra id"], title: "Workforce Identity Federation", text: "Workforce Identity Federation digunakan untuk pengguna manusia yang login memakai identity provider eksternal seperti Microsoft Entra ID. Workforce berarti human user; Workload Identity Federation digunakan untuk aplikasi atau workload.", memory: "Workforce = manusia, Workload = aplikasi." },
  { keywords: ["signed url", "signed urls", "expire automatically", "expiration"], title: "Signed URL", text: "Signed URL memberikan akses sementara ke object Cloud Storage tertentu tanpa mengharuskan penerima memiliki akun Google. Waktu kedaluwarsa melekat pada URL dan akses berakhir otomatis.", memory: "Satu object, akses sementara, tanpa akun Google." },
  { keywords: ["cloud nat", "private google access"], title: "Cloud NAT dan Private Google Access", text: "Cloud NAT menyediakan koneksi outbound ke internet untuk VM tanpa external IP. Private Google Access memungkinkan VM tersebut mengakses Google APIs seperti Cloud Storage tanpa melewati NAT.", memory: "NAT untuk internet, Private Google Access untuk Google APIs." },
  { keywords: ["spot vm", "spot vms", "preemption"], title: "Spot VM", text: "Spot VM cocok untuk workload yang bisa dihentikan dan dilanjutkan, seperti batch processing. Harganya lebih murah, tetapi VM dapat di-preempt dan tidak memiliki SLA.", memory: "Murah karena bisa dihentikan; gunakan checkpoint." },
  { keywords: ["custom machine", "custom machine type", "vcpus", "memory"], title: "Custom machine type", text: "Custom machine type memungkinkan jumlah vCPU dan memori disesuaikan dengan kebutuhan workload. Ini mengurangi resource yang terbuang ketika predefined machine type tidak pas.", memory: "Bayar bentuk resource yang benar-benar dipakai." },
  { keywords: ["shared vpc"], title: "Shared VPC", text: "Shared VPC menggunakan host project untuk mengelola jaringan, subnet, dan firewall, sementara service project digunakan oleh tim aplikasi. IAM Network User dapat dibatasi pada subnet tertentu.", memory: "Satu jaringan terpusat, banyak project aplikasi." },
  { keywords: ["cloud spanner", "spanner"], title: "Cloud Spanner", text: "Cloud Spanner adalah database relasional yang mendukung konsistensi kuat dan skalabilitas horizontal, termasuk konfigurasi multi-region untuk workload global.", memory: "Relasional, global, konsisten, dan scalable." },
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSource, setActiveSource] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showImport, setShowImport] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");

  const currentSource = sources[activeSource];
  const sourceQuestions = currentSource?.questions ?? [];
  const filteredQuestions = useMemo(() => sourceQuestions.filter((question) => filter === "all" || (filter === "correct" ? isCorrect(question) : !isCorrect(question))), [sourceQuestions, filter]);
  const current = sourceQuestions.find((question) => question.id === selectedQuestion) ?? filteredQuestions[0];
  const correctCount = sourceQuestions.filter(isCorrect).length;
  const score = sourceQuestions.length ? Math.round(correctCount / sourceQuestions.length * 100) : 0;
  const currentExplanation = current && !isCorrect(current)
    ? localExplanations.find((item) => item.keywords.some((keyword) => `${current.prompt} ${current.answer}`.toLowerCase().includes(keyword)))
    : undefined;

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !fileName) setFileName(file.name.replace(/\.csv$/i, ""));
  }

  async function importExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !fileName.trim()) return;
    const questions = parseCsv(await selectedFile.text(), fileName.trim());
    if (!questions.length) { setNotice("CSV tidak berisi soal yang bisa dibaca."); return; }
    const correct = questions.filter(isCorrect).length;
    const source: Source = { name: fileName.trim(), file: selectedFile.name, count: questions.length, correct, score: Math.round(correct / questions.length * 100), added: new Date().toISOString(), questions };
    setSources((current) => [...current, source]);
    setActiveSource(sources.length); setSelectedQuestion(null); setFilter("all"); setShowImport(false); setSelectedFile(null); setFileName("");
    setNotice(`${source.name} berhasil diimpor dari browser.`);
  }

  function changeSource(value: number) { setActiveSource(value); setSelectedQuestion(null); setFilter("all"); }

  function askGemini(question: Question) {
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  }

  function promptFor(question: Question) {
    const options = question.options.length ? question.options.map((option) => `${option.label}. ${option.text}`).join("\n") : "Pilihan tidak terbaca dari CSV.";
    return `Saya sedang belajar untuk sertifikasi Google Cloud. Tolong jelaskan pertanyaan berikut menggunakan bahasa Indonesia yang jelas dan mudah dipahami.\n\nPertanyaan:\n${question.prompt}\n\nPilihan jawaban:\n${options}\n\nJawaban benar dari hasil review:\n${question.answer || question.correctAnswer || "Tidak tersedia"}\n\nTolong jelaskan mengapa jawaban tersebut benar, mengapa pilihan lain kurang tepat, konsep Google Cloud yang diuji, dan ringkasan singkat yang mudah diingat. Jangan hanya menerjemahkan soal. Jika ada informasi yang bergantung pada perubahan dokumentasi Google Cloud, tandai bagian tersebut.`;
  }

  async function copyPrompt(question: Question) {
    try {
      await navigator.clipboard.writeText(promptFor(question));
      setNotice("Prompt berhasil disalin. Sekarang buka Gemini, paste, lalu tekan Enter.");
    } catch {
      setNotice("Clipboard tidak tersedia. Gunakan prompt yang tampil di bawah untuk menyalin manual.");
    }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Cloud size={17} /></span><span>lattice</span></div>
      <div className="workspace-switcher"><span className="avatar">DN</span><span><b>Dhimsn</b><small>My workspace</small></span><ChevronDown size={15} /></div>
      <nav className="main-nav" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => setActiveNav(label)}><Icon size={17} /><span>{label}</span>{label === "Review queue" && <span className="nav-count">{sourceQuestions.filter((question) => !isCorrect(question)).length}</span>}</button>)}
        <p className="nav-label second">Your exams</p>
        <button className="nav-item"><span className="exam-dot blue" /><span>Cloud Digital Leader</span><ChevronRight className="nav-arrow" size={15} /></button>
        <button className="nav-item"><span className="exam-dot violet" /><span>Associate Cloud Engineer</span><ChevronRight className="nav-arrow" size={15} /></button>
      </nav>
      <div className="sidebar-bottom"><button className="help-link"><CircleHelp size={16} />Help & feedback</button><div className="sidebar-rule" /><div className="profile-row"><span className="avatar dark">DN</span><span><b>Dhimasn</b><small>Settings</small></span><ChevronDown size={15} /></div></div>
    </aside>

    <section className="content">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{activeNav}</b></div><div className="top-actions"><button className="icon-button" aria-label="Search"><Search size={18} /></button><button className="avatar top-avatar">AR</button></div></header>
      <div className="page-wrap">
        <section className="page-heading"><div><p className="eyebrow">Local CSV workspace</p><h1>{activeNav === "Overview" ? "Keep your cloud knowledge sharp." : activeNav}</h1><p className="heading-copy">Pilih satu file CSV untuk melihat soal dan hasilnya.</p></div><button className="primary-button" onClick={() => setShowImport(true)}><Plus size={17} /> Add exam review</button></section>
        {notice && <div className="notice"><span><Check size={16} />{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div>}

        <section className="source-picker"><div><span className="eyebrow">Active source</span><b>{currentSource ? sourceLabel(currentSource.name) : "Belum ada CSV"}</b></div><select value={activeSource} onChange={(event) => changeSource(Number(event.target.value))} disabled={!sources.length}>{sources.length ? sources.map((source, index) => <option value={index} key={source.file}>{sourceLabel(source.name)} · {source.count} soal</option>) : <option>Import CSV untuk mulai</option>}</select></section>

        <section className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Accuracy</span><Target size={17} /></div><strong>{score}<span>%</span></strong><div className="stat-meta">{sourceQuestions.length ? `${correctCount} benar dari ${sourceQuestions.length} soal` : "Belum ada soal diimpor"}</div></div><div className="stat-card"><div className="stat-top"><span>Questions</span><BookOpen size={17} /></div><strong>{sourceQuestions.length}</strong><div className="stat-meta">Di CSV aktif</div></div><div className="stat-card"><div className="stat-top"><span>Source files</span><FileText size={17} /></div><strong>{sources.length}</strong><div className="stat-meta">Tersedia di data/imports</div></div><div className="stat-card focus-card"><div className="stat-top"><span>Needs attention</span><span className="focus-number">{sourceQuestions.length - correctCount} soal</span></div><strong className="focus-title">Review queue</strong><div className="progress-line"><span style={{ width: `${score}%` }} /></div><div className="stat-meta">{score}% sudah benar</div></div></section>

        <div className="section-header"><div><h2>Review queue</h2><p>{currentSource ? `Questions from ${sourceLabel(currentSource.name)}.` : "Pilih CSV untuk melihat pertanyaan."}</p></div><button className="text-button" onClick={() => setFilter("review")}>Open review queue <ArrowUpRight size={15} /></button></div>
        <section className="review-layout"><div className="question-list-panel"><div className="panel-toolbar"><div className="segmented"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All <span>{sourceQuestions.length}</span></button><button className={filter === "review" ? "selected" : ""} onClick={() => setFilter("review")}>Review <span>{sourceQuestions.length - correctCount}</span></button><button className={filter === "correct" ? "selected" : ""} onClick={() => setFilter("correct")}>Correct <span>{correctCount}</span></button></div><button className="filter-button"><Filter size={15} /> CSV</button></div><div className="question-list">{filteredQuestions.length ? filteredQuestions.map((question) => <button key={question.id} className={`question-row ${current?.id === question.id ? "selected" : ""}`} onClick={() => setSelectedQuestion(question.id)}><span className={`status-icon ${isCorrect(question) ? "correct" : "review"}`}>{isCorrect(question) ? <Check size={13} /> : <span>!</span>}</span><span className="question-row-copy"><span className="question-row-title">Question {question.id}</span><span className={`question-row-status ${isCorrect(question) ? "correct-text" : "wrong-text"}`}>{isCorrect(question) ? "Benar" : "Salah"}</span><span className="question-row-topic">{sourceLabel(question.source)}</span></span><ChevronRight size={16} /></button>) : <div className="empty-state"><FileText size={20} /><b>Belum ada CSV</b><span>Import hasil review untuk mulai belajar.</span></div>}</div></div><article className="explanation-panel">{current ? <><div className="question-meta"><span className={`pill ${isCorrect(current) ? "correct" : "review"}`}>{isCorrect(current) ? "Benar" : "Salah"}</span><span>{currentSource?.name} · Question {current.id}</span></div><h3>{current.prompt}</h3><div className="options-grid">{current.options.map((option) => <div key={option.label} className={`option ${option.label === current.correctAnswer ? "correct-option" : ""}`}><span className="option-label">{option.label}</span><span>{option.text}</span>{option.label === current.correctAnswer && <Check size={14} />}</div>)}</div><div className="answer-box"><span className="answer-label">Correct answer from CSV</span><p>{current.answer || current.correctAnswer || "Tidak tersedia di CSV"}</p></div>{!isCorrect(current) && <div className="local-explanation">{currentExplanation ? <><div className="local-heading"><span className="ai-icon"><BookOpen size={15} /></span><b>{currentExplanation.title}</b><span className="ai-label">Pembahasan lokal</span></div><p>{currentExplanation.text}</p><div className="memory-aid"><b>Ingat:</b> {currentExplanation.memory}</div></> : <><div className="local-heading"><span className="ai-icon"><BookOpen size={15} /></span><b>Pembahasan lokal belum tersedia</b></div><p>Belum ada materi lokal yang cocok untuk soal ini. Gunakan prompt manual di bawah untuk meminta bantuan Gemini.</p></>}</div>}<div className="ai-explanation"><div className="ai-heading"><span className="ai-icon"><Sparkles size={15} /></span><b>Penjelasan tambahan</b><span className="ai-label">Tanpa API</span></div><p>Salin prompt ke clipboard, buka Gemini, lalu paste secara manual. Cara ini tidak membutuhkan API key atau biaya AI.</p><div className="ai-actions"><button className="copy-button" onClick={() => copyPrompt(current)}><FileText size={14} /> Copy prompt</button><button className="gemini-button" onClick={() => askGemini(current)}><Sparkles size={15} /> Buka Gemini <ArrowUpRight size={14} /></button></div><details className="prompt-preview"><summary>Lihat prompt</summary><pre>{promptFor(current)}</pre></details></div></> : <div className="empty-detail"><FileText size={28} /><h3>Import exam review untuk mulai</h3><p>Masukkan link review Moodle, login di Brave, dan aplikasi akan membaca CSV yang dibuat scraper.</p><button className="primary-button" onClick={() => setShowImport(true)}><Plus size={16} /> Import review</button></div>}</article></section>

        <div className="section-header sources-heading"><div><h2>Exam sources</h2><p>File CSV yang tersedia di `data/imports`.</p></div><button className="text-button" onClick={() => setActiveNav("Exam sources")}>View all sources <ArrowUpRight size={15} /></button></div><section className="sources-panel"><div className="source-table-head"><span>Source</span><span>Questions</span><span>Score</span><span>Added</span><span>Status</span><span /></div>{sources.length ? sources.map((source, index) => <button className={`source-row source-row-button ${index === activeSource ? "active-source" : ""}`} key={source.file} onClick={() => changeSource(index)}><span className="source-name"><span className="file-icon"><FileText size={16} /></span><span><b>{sourceLabel(source.name)}</b><small>{source.file}</small></span></span><span>{source.count} soal</span><span className="score">{source.score}%</span><span className="muted">{new Date(source.added).toLocaleDateString("id-ID")}</span><span><span className="ready"><span />Ready</span></span><ExternalLink size={15} className="row-external" /></button>) : <div className="empty-source">Belum ada file CSV. Gunakan Add exam review untuk mengimpor.</div>}</section><p className="disclaimer"><FileText size={14} /> No database. CSV files in `data/imports` are the source of truth.</p>
      </div>
    </section>

    {showImport && <div className="modal-backdrop" onClick={() => setShowImport(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="modal-kicker">Browser import</span><h2>Upload exam review</h2><p>Scrape hasil review di laptop menggunakan script lokal, lalu upload file CSV hasilnya ke sini.</p></div><button className="close-button" onClick={() => setShowImport(false)}><X size={18} /></button></div><form onSubmit={importExam}><label htmlFor="file-name">Nama exam</label><div className="name-input"><FileText size={17} /><input id="file-name" type="text" placeholder="Contoh: ACE - Practice Exam 01" value={fileName} onChange={(event) => setFileName(event.target.value)} required /><span>LABEL</span></div><p className="input-hint">Nama ini hanya digunakan sebagai label sumber di halaman belajar.</p><label htmlFor="csv-file">File hasil scraping (.csv)</label><div className="file-upload"><input id="csv-file" type="file" accept=".csv,text/csv" onChange={selectFile} required /><span>{selectedFile ? selectedFile.name : "Pilih file CSV dari laptop"}</span></div><div className="modal-footer"><span><FileText size={15} /> Diproses di browser, tanpa database</span><button className="primary-button" type="submit" disabled={!selectedFile || !fileName.trim()}><Plus size={16} /> Add source</button></div></form></div></div>}
  </main>;
}
