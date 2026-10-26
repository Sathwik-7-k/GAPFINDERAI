"use client";

import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BookMarked, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Database,
  Download, FileText, FolderOpen, LayoutDashboard, Lightbulb, LoaderCircle, Menu,
  LogOut, Network, Plus, Send, ShieldCheck, Sparkles, Target, Timer, Trash2, Upload, X,
} from "lucide-react";
import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import type { StudyDocument, StudyTask, StudyTopic } from "@/lib/study-data";

type PageName = "Overview" | "Topic map" | "Diagnosis" | "Revision plan" | "Library" | "Data & privacy";
type AuthUser = { id: string; name: string; email: string };
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
export default function Home() {
  const [page, setPage] = useState<PageName>("Overview");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Upload your syllabus or notes to get started. I’ll use those materials to answer questions and cite the sections I rely on.",
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
  const [quizOutcomes, setQuizOutcomes] = useState<boolean[]>([]);
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [activityBusy, setActivityBusy] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" }));
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreWorkspace() {
      try {
        const authResponse = await fetch("/api/auth", { cache: "no-store" });
        if (!authResponse.ok) throw new Error("Could not check your sign-in status.");
        const authState = await authResponse.json() as { user: AuthUser | null };
        if (!authState.user) return;
        const workspaceResponse = await fetch("/api/workspace", { cache: "no-store" });
        if (!workspaceResponse.ok) throw new Error("Could not load your personal workspace.");
        const state = await workspaceResponse.json() as { documents: StudyDocument[]; topics: StudyTopic[]; tasks: StudyTask[]; attempts: number; analyticsOptIn: boolean };
        if (!active) return;
        setUser(authState.user);
        applyWorkspace(state);
      } catch (error) {
        if (active) setNotice(error instanceof Error ? error.message : "Could not load your workspace.");
      } finally {
        if (active) {
          setHydrated(true);
          setAuthReady(true);
        }
      }
    }
    void restoreWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    const snapshot = { documents, topics, tasks, attempts, analyticsOptIn };
    const timeout = window.setTimeout(() => {
      void fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      }).then((response) => {
        if (!response.ok) setNotice("Your latest changes could not be saved. Please refresh and sign in again.");
      }).catch(() => setNotice("Your latest changes could not be saved. Check your connection."));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [documents, topics, tasks, attempts, analyticsOptIn, hydrated, user]);

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
  const tutorSuggestions = weakTopics[0] ? [
    `Explain ${weakTopics[0].name} in simple terms`,
    `Quiz me on ${weakTopics[0].name}`,
    `What should I know about ${weakTopics[0].name}?`,
  ] : [];
  const completedTasks = tasks.filter((task) => task.done).length;
  const assessedTopics = topics.filter((topic) => topic.status !== "Unassessed");
  const averageMastery = assessedTopics.length ? Math.round(assessedTopics.reduce((sum, topic) => sum + topic.mastery, 0) / assessedTopics.length) : 0;
  const displayName = user?.name ?? "";
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const tasksByPriority = [...tasks].sort((first, second) => {
    const firstMastery = topics.find((topic) => first.topic.includes(topic.name))?.mastery ?? 100;
    const secondMastery = topics.find((topic) => second.topic.includes(topic.name))?.mastery ?? 100;
    return firstMastery - secondMastery;
  });
  const currentQuestion = quiz[quizIndex];

  function applyWorkspace(state: { documents: StudyDocument[]; topics: StudyTopic[]; tasks: StudyTask[]; attempts: number; analyticsOptIn: boolean }) {
    setDocuments(state.documents);
    setTopics(state.topics);
    setTasks(state.tasks);
    setAttempts(state.attempts);
    setAnalyticsOptIn(state.analyticsOptIn);
  }

  async function enterWorkspace(nextUser: AuthUser) {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    if (!response.ok) throw new Error("Account created, but its workspace could not be loaded.");
    const state = await response.json() as { documents: StudyDocument[]; topics: StudyTopic[]; tasks: StudyTask[]; attempts: number; analyticsOptIn: boolean };
    setUser(nextUser);
    applyWorkspace(state);
    setAuthReady(true);
    setHydrated(true);
  }

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    setDocuments([]);
    setTopics([]);
    setTasks([]);
    setAttempts(0);
    setAnalyticsOptIn(false);
    setPage("Overview");
    setMessages([]);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploadBusy(true);
    const addedDocuments: StudyDocument[] = [];
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
        addedDocuments.push({
          id: crypto.randomUUID(), title: file.name,
          kind: file.name.toLowerCase().endsWith(".pdf") ? "PDF material" : "Text material",
          updated: "Just now", content: content.slice(0, 160_000),
        });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `Could not read ${file.name}.`);
      }
    }
    if (addedDocuments.length) {
      const nextDocuments = [...addedDocuments, ...documents];
      const totalTextBytes = nextDocuments.reduce((total, document) => total + new Blob([document.content]).size, 0);
      if (nextDocuments.length > 20 || totalTextBytes > 1_000_000) {
        setNotice("Your workspace supports up to 20 materials and 1 MB of extracted text. Remove a source before adding more.");
        setUploadBusy(false);
        return;
      }
      setDocuments(nextDocuments);
      try {
        const saveResponse = await fetch("/api/workspace", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documents: nextDocuments, topics, tasks, attempts, analyticsOptIn }),
        });
        if (!saveResponse.ok) throw new Error("Could not save your uploaded materials.");
        const response = await fetch("/api/study", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "map" }),
        });
        const result = await response.json() as { topics?: StudyTopic[]; error?: string };
        if (!response.ok || !result.topics?.length) throw new Error(result.error ?? "Material was added, but no topics could be mapped.");
        setTopics(result.topics);
        setTasks(makeRevisionTasks(result.topics, tasks));
        setPage("Overview");
        setMobileNavOpen(false);
        setNotice(`${addedDocuments.length} source${addedDocuments.length === 1 ? "" : "s"} added. Your topic map is ready for a diagnostic.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not map these materials.");
      }
    }
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
        body: JSON.stringify({ action: "chat", question }),
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
    if (!documents.length) {
      setPage("Library");
      setNotice("Upload a syllabus or notes before starting a diagnostic.");
      return;
    }
    setPage("Diagnosis");
    setQuizBusy(true);
    setQuizResult(null);
    setSelectedAnswer("");
    setQuizScore(null);
    setQuizOutcomes([]);
    setQuiz([]);
    try {
      const response = await fetch("/api/study", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quiz" }),
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
          source: currentQuestion.source,
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
    const outcomes = [...quizOutcomes];
    outcomes[quizIndex] = quizResult.correct;
    setQuizOutcomes(outcomes);
    if (quizIndex + 1 < quiz.length) {
      setQuizIndex((index) => index + 1);
      setQuizResult(null);
      setSelectedAnswer("");
      return;
    }
    const nextCorrectCount = outcomes.filter(Boolean).length;
    const score = Math.round((nextCorrectCount / quiz.length) * 100);
    setQuizScore(score);
    setAttempts((value) => value + 1);
    const topicScores = new Map<string, boolean[]>();
    quiz.forEach((question, index) => {
      const relatedTopics = topics.filter((topic) => question.topic.toLowerCase().includes(topic.name.toLowerCase()) || topic.name.toLowerCase().includes(question.topic.toLowerCase()));
      for (const topic of relatedTopics) topicScores.set(topic.id, [...(topicScores.get(topic.id) ?? []), outcomes[index] ?? false]);
    });
    if (!topicScores.size && weakTopics[0]) topicScores.set(weakTopics[0].id, outcomes);
    void trackActivity({ kind: "diagnostic", page: "Diagnosis", score });
    for (const topicId of topicScores.keys()) void trackActivity({ kind: "topic_view", page: "Diagnosis", topicId });
    setTopics((current) => current.map((topic) => {
      const results = topicScores.get(topic.id);
      if (!results?.length) return topic;
      const topicScore = Math.round(results.filter(Boolean).length / results.length * 100);
      const mastery = topic.status === "Unassessed"
        ? topicScore
        : Math.round(topic.mastery * 0.7 + topicScore * 0.3);
      const status = mastery < 55 ? "Focus" : mastery < 80 ? "Building" : "Strong";
      const evidence = `${results.filter(Boolean).length} of ${results.length} diagnostic answers correct`;
      const reason = status === "Strong"
        ? `Strong on this check: ${evidence} from your uploaded material.`
        : status === "Building"
          ? `Some understanding is in place: ${evidence}. Review this section and check again.`
          : `Needs focused review: ${evidence}. Revisit this section before your next check.`;
      return { ...topic, mastery, status, reason, evidence };
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

  async function persistWorkspace(snapshot: { documents: StudyDocument[]; topics: StudyTopic[]; tasks: StudyTask[]; attempts: number; analyticsOptIn: boolean }) {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) throw new Error("Could not save your workspace. Please retry.");
  }

  async function remapMaterials() {
    if (!documents.length || uploadBusy) return;
    setUploadBusy(true);
    try {
      const response = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "map" }) });
      const result = await response.json() as { topics?: StudyTopic[]; error?: string };
      if (!response.ok || !result.topics?.length) throw new Error(result.error ?? "Could not map topics from your materials.");
      const nextTasks = makeRevisionTasks(result.topics, tasks);
      await persistWorkspace({ documents, topics: result.topics, tasks: nextTasks, attempts, analyticsOptIn });
      setTopics(result.topics);
      setTasks(nextTasks);
      setNotice("Topic map refreshed from your current study materials.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not map your materials.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function removeDocument(id: string) {
    const remainingDocuments = documents.filter((document) => document.id !== id);
    const remainingTitles = new Set(remainingDocuments.map((document) => document.title));
    const remainingTopics = topics.filter((topic) => remainingTitles.has(topic.source));
    const remainingTasks = tasks.filter((task) => remainingTopics.some((topic) => topic.name === task.topic));
    try {
      await persistWorkspace({ documents: remainingDocuments, topics: remainingTopics, tasks: remainingTasks, attempts, analyticsOptIn });
      setDocuments(remainingDocuments);
      setTopics(remainingTopics);
      setTasks(remainingTasks);
      let nextTopics = remainingTopics;
      let nextTasks = remainingTasks;
      if (remainingDocuments.length) {
        const response = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "map" }) });
        const result = await response.json() as { topics?: StudyTopic[]; error?: string };
        if (!response.ok || !result.topics?.length) throw new Error(result.error ?? "Could not remap the remaining materials.");
        nextTopics = result.topics;
        nextTasks = makeRevisionTasks(nextTopics, tasks);
      }
      await persistWorkspace({ documents: remainingDocuments, topics: nextTopics, tasks: nextTasks, attempts, analyticsOptIn });
      setTopics(nextTopics);
      setTasks(nextTasks);
      startNewConversation();
      setNotice("Material removed and your workspace map refreshed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove that material.");
    }
  }

  async function setActivityConsent(enabled: boolean) {
    try {
      const response = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: enabled }),
      });
      if (!response.ok) throw new Error("Could not update the activity setting.");
      setAnalyticsOptIn(enabled);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the activity setting.");
    }
  }

  async function clearActivityHistory() {
    try {
      const response = await fetch("/api/activity", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not clear the activity history.");
      setActivity([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not clear the activity history.");
    }
  }

  function selectPage(nextPage: PageName) {
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  function startNewConversation() {
    setMessages([{
      role: "assistant",
      content: documents.length
        ? "What would you like to understand from your study material? I’ll cite the sections I use."
        : "Upload your syllabus or notes to get started. I’ll use those materials to answer questions and cite the sections I rely on.",
    }]);
    setChatDraft("");
  }

  function askAboutTask(task: StudyTask) {
    const topic = topics.find((item) => item.name === task.topic);
    setChatDraft(`Help me study ${task.topic}. Use my uploaded material and explain the next useful step.`);
    setSelectedTask(null);
    setPage("Overview");
    window.setTimeout(() => document.getElementById("tutor-input")?.focus(), 0);
    void trackActivity({ kind: "topic_view", page: "Revision session", topicId: topic?.id });
  }

  if (!authReady) return <main className="auth-loading"><LoaderCircle className="spin" size={23} /><span>Opening your study space…</span></main>;
  if (!user) return <AuthPage onAuthenticated={enterWorkspace} />;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><Target size={19} /></div><div><span className="brand-name">gapfinder</span><span className="brand-ai">AI</span></div><button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button></div>
        <div className="workspace-switcher"><div className="workspace-avatar">{initials}</div><div className="workspace-copy"><strong>My study space</strong><span>{documents.length} sources connected</span></div></div>
        <span className="nav-label">STUDY SPACE</span>
        <nav className="main-nav" aria-label="Main navigation">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? "nav-item-active" : ""}`} onClick={() => selectPage(name)}><Icon size={18} /><span>{name}</span>{name === "Diagnosis" && <span className="nav-pill">{attempts}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="streak-card"><div className="streak-top"><span>YOUR PROGRESS</span></div><div className="progress-facts"><span>{topics.length} mapped topics</span><span>{attempts} diagnostics completed</span></div></div><button className="profile-row" onClick={() => void signOut()} aria-label="Sign out"><span className="profile-avatar">{initials}</span><span className="profile-copy"><strong>{displayName}</strong><small>{user.email}</small></span><LogOut size={15} /></button></div>
      </aside>
      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <section className="main-column">
        <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button><div className="breadcrumb"><span>My study space</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="topbar-actions"><span className="today-label">{currentDate.toUpperCase()}</span><span className="topbar-avatar">{initials}</span></div></header>
        <div className="page-content">
          {page === "Overview" && documents.length === 0 && <WelcomePage name={displayName} onUpload={() => fileInput.current?.click()} />}
          {page === "Overview" && documents.length > 0 && <>
            <div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR LEARNING, IN FOCUS</span><h1>Welcome back, {displayName.split(" ")[0]}<span className="heading-period">.</span></h1><p>Your study space is built from {documents.length} source{documents.length === 1 ? "" : "s"} you uploaded. Start a diagnostic when you’re ready to check your understanding.</p></div><button className="button button-primary" onClick={() => void startQuiz()}><Sparkles size={16} /> Start a diagnostic <ArrowRight size={15} /></button></div>
            <div className="overview-grid"><div className="overview-main">
              <section className="mastery-panel panel"><div className="panel-heading"><div><span className="eyebrow">YOUR MATERIAL MAP</span><h2>Your knowledge, at a glance</h2></div><button className="text-button" onClick={() => selectPage("Topic map")}>Topic map <ArrowRight size={14} /></button></div>
                <div className="mastery-content"><div className="mastery-ring" style={{ "--mastery": `${averageMastery}%` } as CSSProperties}><div className="mastery-ring-inner"><strong>{assessedTopics.length ? <>{averageMastery}<small>%</small></> : "—"}</strong><span>{assessedTopics.length ? "overall mastery" : "not assessed yet"}</span></div></div><div className="mastery-summary"><div className="summary-topline"><strong>{attempts ? `${attempts} diagnostics completed` : "Your baseline starts with a diagnostic"}</strong></div><p>Topic confidence is based on your answers to questions grounded in your own uploaded material.</p><div className="mastery-legend"><span><i className="legend-dot dot-strong" /> Strong <b>{topics.filter((topic) => topic.status === "Strong").length}</b></span><span><i className="legend-dot dot-medium" /> Building <b>{topics.filter((topic) => topic.status === "Building").length}</b></span><span><i className="legend-dot dot-focus" /> Needs focus <b>{topics.filter((topic) => topic.status === "Focus").length}</b></span><span><i className="legend-dot dot-unassessed" /> Unassessed <b>{topics.filter((topic) => topic.status === "Unassessed").length}</b></span></div></div></div>
                <div className="panel-divider" /><div className="topic-priority-heading"><strong>Priority topics</strong><button className="quiet-link" onClick={() => selectPage("Topic map")}>See all topics <ChevronRight size={14} /></button></div><div className="priority-list">{weakTopics.slice(0, 3).map((topic, index) => <TopicRow key={topic.id} topic={topic} rank={index + 1} onClick={() => { setChatDraft(`Explain ${topic.name} using my uploaded material`); document.getElementById("tutor-input")?.focus(); }} />)}</div>
              </section>
              <section className="plan-panel panel"><div className="panel-heading"><div><span className="eyebrow">A PLAN THAT ADAPTS</span><h2>Your next study steps</h2></div><button className="text-button" onClick={() => selectPage("Revision plan")}>Full plan <ArrowRight size={14} /></button></div><div className="plan-progress-line"><span>{completedTasks} of {tasks.length} sessions complete</span><span>{Math.round(completedTasks / Math.max(tasks.length, 1) * 100)}%</span></div><div className="progress-track"><i style={{ width: `${completedTasks / Math.max(tasks.length, 1) * 100}%` }} /></div><div className="task-list compact-task-list">{tasksByPriority.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onStart={() => setSelectedTask(task)} />)}</div></section>
            </div><aside className="overview-rail">
              <section className="today-card panel"><div className="rail-title"><div><span className="eyebrow">YOUR NEXT STEP</span><h2>Today’s focus</h2></div><Lightbulb size={17} className="focus-icon-small" /></div><div className="focus-callout"><span className="focus-icon"><Target size={16} /></span><div><strong>{weakTopics[0]?.name ?? "Run a diagnostic"}</strong><p>{weakTopics[0]?.reason ?? "Answer a few questions from your materials to see where to focus."}</p></div></div><div className="focus-meta"><span><FileText size={14} /> {documents.length} sources</span><span><CircleHelp size={14} /> {attempts} attempts</span></div><button className="button button-ink button-full" onClick={() => weakTopics.length ? selectPage("Revision plan") : void startQuiz()}>{weakTopics.length ? "Open revision plan" : "Start diagnostic"} <ArrowRight size={15} /></button></section>
              <section className="activity-panel panel"><div className="panel-heading"><div><span className="eyebrow">YOUR PROGRESS</span><h2>Study activity</h2></div><span className="activity-total">{attempts}</span></div><p className="real-progress-copy">{attempts === 1 ? "One diagnostic completed" : `${attempts} diagnostics completed`} · {completedTasks} of {tasks.length} revision sessions completed.</p><button className="quiet-link" onClick={() => selectPage("Data & privacy")}>{analyticsOptIn ? "View learning activity" : "Activity tracking is off"} <ArrowRight size={14} /></button></section>
              <div className="teacher-note"><span><BookMarked size={16} /></span><p><strong>Built from your material</strong><br />Every diagnosis links back to the notes and papers you uploaded.</p></div>
            </aside></div>
          </>}

          {page === "Topic map" && (topics.length ? <TopicMapPage topics={topics} onAsk={(topic) => { setChatDraft(`Explain ${topic} using my uploaded material`); document.getElementById("tutor-input")?.focus(); }} /> : <WelcomePage name={displayName} onUpload={() => fileInput.current?.click()} />)}
          {page === "Diagnosis" && <div className="content-narrow"><div className="page-heading"><span className="eyebrow">A QUICK CHECK, GROUNDED IN YOUR NOTES</span><h1>Diagnostic check<span className="heading-period">.</span></h1><p>Questions are created from your own materials. Each answer includes its source and a clear explanation.</p></div>
            {!quiz.length && !quizBusy && <section className="diagnostic-start panel"><div className="diagnostic-art"><span><Target size={29} /></span><i /><i /><i /></div><div className="diagnostic-copy"><span className="eyebrow">ABOUT 5 MINUTES</span><h2>Find out what’s sticking.</h2><p>We’ll pull a short set of questions from {documents.length} {documents.length === 1 ? "study source" : "study sources"}. Your topic map and revision plan update when you finish.</p><div className="diagnostic-facts"><span><CircleHelp size={15} /> Questions from your sources</span><span><FileText size={15} /> Cited to your notes</span><span><Sparkles size={15} /> Adaptive follow-up</span></div><button className="button button-primary" onClick={() => void startQuiz()}><Sparkles size={16} /> Generate my diagnostic <ArrowRight size={15} /></button></div></section>}
            {quizBusy && !quiz.length && <section className="loading-panel panel"><LoaderCircle className="spin" size={25} /><strong>Building questions from your material…</strong><span>Finding useful passages and linking each question to its source.</span></section>}
            {quizScore !== null && <section className="result-panel panel"><div className="result-score"><span className="eyebrow">DIAGNOSTIC COMPLETE</span><strong>{quizScore}<small>%</small></strong><span>on this attempt</span></div><div className="result-copy"><h2>{quizScore >= 80 ? "That knowledge is holding." : quizScore >= 50 ? "Good signals, with room to grow." : "Now we know where to focus."}</h2><p>Your topic confidence and next revision steps have been updated from this attempt.</p><div className="result-actions"><button className="button button-primary" onClick={() => selectPage("Topic map")}>Review my topic map <ArrowRight size={15} /></button><button className="button button-secondary" onClick={() => void startQuiz()}>Try another check</button></div></div></section>}
            {quiz.length > 0 && quizScore === null && currentQuestion && <section className="quiz-panel panel"><div className="quiz-topline"><div><span className="eyebrow">QUESTION {quizIndex + 1} OF {quiz.length}</span><h2>{currentQuestion.topic}</h2></div><button className="quiet-link" onClick={() => { setQuiz([]); setQuizResult(null); }}>Exit check <X size={14} /></button></div><div className="quiz-progress">{quiz.map((question, index) => <i key={`${question.topic}-${index}`} className={index < quizIndex ? "quiz-step-done" : index === quizIndex ? "quiz-step-current" : ""} />)}</div><div className="question-source"><FileText size={14} /><span>{currentQuestion.source.title} <b>·</b> {currentQuestion.source.section}</span></div><h3 className="question-text">{currentQuestion.question}</h3><div className="answer-options">{currentQuestion.options.map((option, index) => <button key={`${index}-${option}`} className={`answer-option ${selectedAnswer === option ? "answer-selected" : ""} ${quizResult && option === currentQuestion.answer ? "answer-correct" : ""} ${quizResult && selectedAnswer === option && !quizResult.correct ? "answer-wrong" : ""}`} onClick={() => !quizResult && setSelectedAnswer(option)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{quizResult && option === currentQuestion.answer && <CheckCircle2 size={17} />}</button>)}</div>{quizResult ? <><div className={`answer-feedback ${quizResult.correct ? "feedback-correct" : "feedback-review"}`}><span className="feedback-icon">{quizResult.correct ? <CheckCircle2 size={18} /> : <Lightbulb size={18} />}</span><div><strong>{quizResult.correct ? "That’s right." : "Let’s strengthen this."}</strong><p>{quizResult.explanation}</p>{quizResult.source && <small>Source: {quizResult.source.title} · {quizResult.source.section}</small>}</div></div><button className="button button-primary quiz-submit" onClick={continueQuiz}>{quizIndex + 1 === quiz.length ? "See my results" : "Next question"} <ArrowRight size={15} /></button></> : <button className="button button-primary quiz-submit" disabled={!selectedAnswer || quizBusy} onClick={() => void submitAnswer()}>{quizBusy && <LoaderCircle className="spin" size={16} />} Check answer <ArrowRight size={15} /></button>}</section>}
          </div>}
          {page === "Revision plan" && (tasks.length ? <RevisionPlanPage tasks={tasksByPriority} topics={topics} onToggle={toggleTask} onStartTask={setSelectedTask} onStartQuiz={() => void startQuiz()} dateLabel={currentDate} /> : <WelcomePage name={displayName} onUpload={() => fileInput.current?.click()} />)}
          {page === "Library" && <><div className="library-remap-row"><button className="button button-secondary" onClick={() => void remapMaterials()} disabled={!documents.length || uploadBusy}><Network size={15} /> Refresh topic map</button></div><LibraryPage documents={documents} topics={topics} onUpload={() => fileInput.current?.click()} onRemove={(id) => void removeDocument(id)} uploadBusy={uploadBusy} /></>}
          {page === "Data & privacy" && <DataPrivacyPage documents={documents.length} topics={topics.length} tasks={tasks.length} attempts={attempts} analyticsOptIn={analyticsOptIn} activity={activity} busy={activityBusy} onConsent={(enabled) => void setActivityConsent(enabled)} onClear={() => void clearActivityHistory()} />}
        </div>
      </section>

      <aside className="tutor-column"><div className="tutor-header"><div className="tutor-heading-icon"><Sparkles size={17} /></div><div><strong>Study companion</strong><span><i /> Material-aware tutor</span></div><button className="icon-button tutor-more" aria-label="Start new conversation" title="Start new conversation" onClick={startNewConversation}><Plus size={17} /></button></div><div className="tutor-context"><span className="context-icon"><BookOpen size={15} /></span><span><strong>{documents.length} sources connected</strong><small>Answers stay grounded in your library</small></span></div><div className="chat-stream"><div className="chat-date"><span /> TODAY <span /></div>
        {messages.map((message, index) => <div className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}><div className="chat-avatar">{message.role === "assistant" ? <Sparkles size={14} /> : "AM"}</div><div className="chat-body"><div className="chat-author">{message.role === "assistant" ? "Gapfinder" : "You"}<span>{message.role === "assistant" ? "· grounded answer" : "· just now"}</span></div><p>{message.content}</p>{message.sources?.map((source, sourceIndex) => <div className="source-citation" key={`${source.title}-${sourceIndex}`}><div className="citation-top"><FileText size={13} /><strong>{source.title}</strong></div><span>{source.section}</span><blockquote>“{source.quote}”</blockquote></div>)}</div></div>)}
        {chatBusy && <div className="chat-thinking"><span /><span /><span /><small>Finding a useful passage…</small></div>}{documents.length > 0 && tutorSuggestions.length > 0 && messages.length < 3 && <div className="suggestion-list"><span>TRY ASKING</span>{tutorSuggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendChat(suggestion)}>{suggestion}<ArrowUpRight size={13} /></button>)}</div>}
      </div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}><textarea id="tutor-input" rows={2} value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder={documents.length ? "Ask about your material…" : "Upload material to start a conversation…"} aria-label="Ask the study companion" disabled={!documents.length} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendChat(); } }} /><div className="composer-bottom"><span><Sparkles size={12} /> Answers cite your material</span><button type="submit" aria-label="Send message" disabled={!chatDraft.trim() || chatBusy || !documents.length}><Send size={15} /></button></div></form><div className="tutor-footnote"><i className="secure-dot" /> Private to your study space <span>·</span> Verify important details</div></aside>

      <input ref={fileInput} type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" multiple hidden onChange={(event) => void handleUpload(event)} />
      {selectedTask && <StudySessionDialog task={selectedTask} topics={topics} documents={documents} onClose={() => setSelectedTask(null)} onComplete={() => { toggleTask(selectedTask.id); setSelectedTask(null); }} onAsk={() => askAboutTask(selectedTask)} />}
      {notice && <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </main>
  );
}

function TopicRow({ topic, rank, onClick }: { topic: StudyTopic; rank: number; onClick: () => void }) {
  return <button className="topic-row" onClick={onClick}><span className={`topic-rank rank-${rank}`}>{String(rank).padStart(2, "0")}</span><span className="topic-row-main"><span className="topic-row-title">{topic.name}</span><span className="topic-row-meta">{topic.reason}</span></span><span className={`status-chip status-${topic.status.toLowerCase()}`}>{topic.status}</span><span className="topic-percent">{topic.mastery}%</span><ChevronRight size={15} className="topic-chevron" /></button>;
}

function TaskRow({ task, onToggle, onStart }: { task: StudyTask; onToggle: () => void; onStart?: () => void }) {
  return <div className={`task-row ${task.done ? "task-complete" : ""}`}><button className="task-check" aria-label={task.done ? "Mark session incomplete" : "Mark session complete"} onClick={onToggle}>{task.done && <Check size={13} />}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.topic} <i>·</i> {task.duration}</span></div><span className={`task-priority task-priority-${task.priority.toLowerCase()}`}>{task.priority}</span>{!task.done && <button className="task-arrow" aria-label={`Start ${task.title}`} title={`Start ${task.title}`} onClick={onStart}><ArrowRight size={15} /></button>}</div>;
}

function TopicMapPage({ topics, onAsk }: { topics: StudyTopic[]; onAsk: (topic: string) => void }) {
  const sorted = [...topics].sort((first, second) => first.mastery - second.mastery);
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR KNOWLEDGE, MADE VISIBLE</span><h1>Topic map<span className="heading-period">.</span></h1><p>Confidence is estimated from your diagnostic answers, not how long you’ve studied.</p></div><span className="map-summary"><Network size={16} /> {topics.length} topics mapped</span></div><div className="topic-map-list">{sorted.map((topic, index) => <article className="map-topic panel" key={topic.id}><div className="map-topic-head"><span className="map-topic-number">{String(index + 1).padStart(2, "0")}</span><div className="map-topic-title"><span className="eyebrow">{topic.unit}</span><h2>{topic.name}</h2></div><span className={`status-chip status-${topic.status.toLowerCase()}`}>{topic.status}</span></div><p className="map-topic-reason">{topic.reason}</p><div className="map-topic-progress"><div className="progress-track"><i className={`mastery-${topic.status.toLowerCase()}`} style={{ width: `${topic.mastery}%` }} /></div><strong>{topic.mastery}%</strong><span>confidence</span></div><div className="map-topic-footer"><span><FileText size={14} /> {topic.source}</span><span>{topic.evidence}</span><button className="quiet-link" onClick={() => onAsk(topic.name)}>Ask tutor <ArrowUpRight size={13} /></button></div></article>)}</div><div className="map-legend"><span><i className="legend-dot dot-focus" /> Needs focus: below 55%</span><span><i className="legend-dot dot-medium" /> Building: 55–79%</span><span><i className="legend-dot dot-strong" /> Strong: 80%+</span></div></div>;
}

function RevisionPlanPage({ tasks, topics, onToggle, onStartTask, onStartQuiz, dateLabel }: { tasks: StudyTask[]; topics: StudyTopic[]; onToggle: (id: string) => void; onStartTask: (task: StudyTask) => void; onStartQuiz: () => void; dateLabel: string }) {
  const weakest = [...topics].sort((first, second) => first.mastery - second.mastery)[0];
  const totalMinutes = tasks.reduce((total, task) => total + (Number.parseInt(task.duration, 10) || 0), 0);
  const timeLabel = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">BUILT AROUND YOUR GAPS</span><h1>Revision plan<span className="heading-period">.</span></h1><p>Short sessions ordered by your current topic confidence. Your plan adjusts after each diagnostic.</p></div><button className="button button-secondary" onClick={onStartQuiz}><Sparkles size={15} /> Refresh with a check</button></div><div className="plan-summary-strip"><div><span className="eyebrow">PLANNED TIME</span><strong>{timeLabel}</strong><small>{tasks.length} personalized sessions</small></div><div className="plan-summary-divider" /><div><span className="eyebrow">COMPLETED</span><strong>{tasks.filter((task) => task.done).length} <small>/ {tasks.length}</small></strong><small>Progress in your account</small></div><div className="plan-summary-note"><Lightbulb size={17} /><p><strong>Why this order?</strong><br />Topics with lower confidence are listed first in your plan.</p></div></div><div className="plan-week-heading"><div><span className="eyebrow">UPDATED {dateLabel}</span><h2>Your study sessions</h2></div><span className="plan-time-total"><Clock3 size={14} /> {timeLabel} planned</span></div><div className="full-task-list">{tasks.map((task, index) => <div className="timeline-task" key={task.id}><div className="timeline-marker"><span className={task.done ? "marker-done" : ""}>{task.done ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><i /></div><div className="timeline-task-content"><TaskRow task={task} onToggle={() => onToggle(task.id)} onStart={() => onStartTask(task)} /><p>{task.description}</p></div></div>)}</div><section className="plan-recommendation"><div className="recommendation-icon"><ArrowDownRight size={19} /></div><div><span className="eyebrow">NEXT BEST MOVE</span><h3>Begin with {weakest?.name ?? "your highest-priority topic"}</h3><p>{weakest?.reason ?? "A short focused review will help make your next session count."}</p></div><button className="button button-ink" onClick={onStartQuiz}>Check understanding <ArrowRight size={15} /></button></section></div>;
}

function StudySessionDialog({ task, topics, documents, onClose, onComplete, onAsk }: { task: StudyTask; topics: StudyTopic[]; documents: StudyDocument[]; onClose: () => void; onComplete: () => void; onAsk: () => void }) {
  const topic = topics.find((item) => item.name === task.topic);
  const document = documents.find((item) => item.title === topic?.source);
  const source = document && topic ? { title: document.title, section: topic.name, quote: "" } : undefined;
  const excerpt = document ? findStudyExcerpt(task.topic, document.content) : "";
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div className="session-overlay"><button className="session-scrim" aria-label="Close study session" onClick={onClose} /><section className="session-dialog" role="dialog" aria-modal="true" aria-labelledby="session-title"><div className="session-heading"><div><span className="eyebrow">FOCUSED STUDY SESSION · {task.duration}</span><h2 id="session-title">{task.title}</h2></div><button className="icon-button" aria-label="Close study session" onClick={onClose}><X size={17} /></button></div><p className="session-topic">{task.topic}</p><p className="session-description">{task.description}</p>{source && <div className="session-source"><span><FileText size={14} /> {source.title} · {source.section}</span>{excerpt && <blockquote>{excerpt}</blockquote>}</div>}<div className="session-actions"><button className="button button-secondary" onClick={onAsk}><Sparkles size={15} /> Ask tutor about this</button><button className="button button-primary" onClick={onComplete}><Check size={15} /> Mark session complete</button></div></section></div>;
}

function findStudyExcerpt(topic: string, content: string) {
  const topicWords = topic.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  const paragraphs = content.split(/\n\s*\n+/).map((paragraph) => paragraph.replace(/\s+/g, " ").trim()).filter(Boolean);
  const ranked = paragraphs.map((paragraph) => ({
    paragraph,
    score: topicWords.filter((word) => paragraph.toLowerCase().includes(word)).length,
  })).sort((first, second) => second.score - first.score);
  return (ranked[0]?.paragraph ?? content.replace(/\s+/g, " ").trim()).slice(0, 640);
}

function LibraryPage({ documents, topics, onUpload, onRemove, uploadBusy }: { documents: StudyDocument[]; topics: StudyTopic[]; onUpload: () => void; onRemove: (id: string) => void; uploadBusy: boolean }) {
  return <div className="content-narrow"><div className="page-heading heading-with-action"><div><span className="eyebrow">YOUR SOURCES, YOUR SPACE</span><h1>Study library<span className="heading-period">.</span></h1><p>Upload syllabi, notes, textbook excerpts, and past papers. Tutor answers and questions use these sources.</p></div><button className="button button-primary" onClick={onUpload} disabled={uploadBusy}>{uploadBusy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Add material</button></div><button className="upload-dropzone" onClick={onUpload}><span className="upload-drop-icon"><Upload size={21} /></span><strong>Choose study material for your space</strong><span>PDF, TXT or Markdown · Up to 12 MB per file</span><span className="button button-secondary upload-browse">Browse files</span></button><div className="library-toolbar"><div><span className="eyebrow">CONNECTED MATERIAL</span><h2>{documents.length} sources</h2></div><span className="filter-button">All materials <ChevronDown size={14} /></span></div>{documents.length ? <div className="library-list">{documents.map((document, index) => { const mappedTopics = topics.filter((topic) => topic.source === document.title).length; return <article className="library-item" key={document.id}><span className={`file-icon file-icon-${index % 3}`}><FileText size={19} /></span><div className="library-item-copy"><strong>{document.title}</strong><span>{document.kind} <i>·</i> {document.updated}</span><small>{mappedTopics} {mappedTopics === 1 ? "topic" : "topics"} mapped from this source</small></div><span className="indexed-status"><i /> Ready</span><button className="remove-document" onClick={() => onRemove(document.id)} aria-label={`Remove ${document.title}`}><X size={16} /></button></article>; })}</div> : <div className="empty-library"><FolderOpen size={28} /><strong>Your library is ready for its first source.</strong><span>Add a syllabus, notes, or a past paper to get started.</span><button className="button button-primary" onClick={onUpload}><Upload size={15} /> Upload material</button></div>}<div className="library-privacy"><BookOpen size={16} /><span><strong>Your materials are stored in your account workspace.</strong> Export a copy at any time from Data & privacy.</span></div></div>;
}

function DataPrivacyPage({ documents, topics, tasks, attempts, analyticsOptIn, activity, busy, onConsent, onClear }: { documents: number; topics: number; tasks: number; attempts: number; analyticsOptIn: boolean; activity: ActivityRecord[]; busy: boolean; onConsent: (enabled: boolean) => void; onClear: () => void }) {
  const studySeconds = activity.filter((event) => event.kind === "study_time").reduce((total, event) => total + event.durationSeconds, 0);
  return <div className="content-narrow"><div className="page-heading"><span className="eyebrow">YOUR WORKSPACE, YOUR CHOICE</span><h1>Data & privacy<span className="heading-period">.</span></h1><p>See what is saved in your account, choose whether in-app activity is recorded, and export or clear your data.</p></div>
    <section className="database-card panel"><div className="database-icon"><Database size={21} /></div><div className="database-info"><span className="eyebrow">LOCAL SQLITE DATABASE</span><h2>gapfinder.sqlite</h2><p><code>data/gapfinder.sqlite</code> · Stored on this machine and excluded from Git.</p></div><a className="button button-secondary" href="/api/workspace/export" download><Download size={15} /> Export backup</a></section>
    <div className="database-stats"><div className="panel"><span className="eyebrow">SOURCES</span><strong>{documents}</strong><small>study documents</small></div><div className="panel"><span className="eyebrow">TOPIC MAP</span><strong>{topics}</strong><small>tracked topics</small></div><div className="panel"><span className="eyebrow">REVISION</span><strong>{tasks}</strong><small>study sessions</small></div><div className="panel"><span className="eyebrow">DIAGNOSTICS</span><strong>{attempts}</strong><small>recorded attempts</small></div></div>
    <section className="consent-panel panel"><div className="consent-copy"><span className="eyebrow">OPTIONAL LEARNING ANALYTICS</span><h2>Share in-app study activity</h2><p>When enabled, GapFinder records the pages and topics you open, study time while the app is visible, completed plan sessions, and diagnostic scores. This helps summarize learning patterns inside this workspace.</p><p className="privacy-boundary"><ShieldCheck size={15} /> No device-wide tracking, browser history, other apps, keystrokes, or raw tutor messages are collected.</p></div><button type="button" role="switch" aria-checked={analyticsOptIn} aria-label="Share in-app study activity" className={`consent-switch ${analyticsOptIn ? "consent-on" : ""}`} onClick={() => onConsent(!analyticsOptIn)}><span /></button><span className={`consent-state ${analyticsOptIn ? "consent-state-on" : ""}`}>{analyticsOptIn ? "On" : "Off"}</span></section>
    <section className="activity-panel-full panel"><div className="activity-history-heading"><div><span className="eyebrow">ACTIVITY STORED IN SQLITE</span><h2>Recent learning activity</h2></div><div className="activity-actions"><span>{busy ? "Loading…" : `${activity.length} recent events`}</span><button className="quiet-link clear-activity" disabled={!activity.length} onClick={onClear}><Trash2 size={14} /> Clear history</button></div></div>
      {activity.length ? <div className="activity-history-list">{activity.slice(0, 20).map((event) => <div className="activity-history-item" key={event.id}><span className={`activity-kind-icon kind-${event.kind}`} aria-hidden="true">{event.kind === "study_time" ? <Timer size={15} /> : event.kind === "diagnostic" ? <CircleHelp size={15} /> : event.kind === "task_completed" ? <Check size={15} /> : event.kind === "topic_view" ? <BookOpen size={15} /> : <LayoutDashboard size={15} />}</span><div><strong>{activityTitle(event)}</strong><span>{event.topicName ?? event.documentTitle ?? event.page ?? "Study space"}</span></div><time>{new Date(event.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>{event.score !== null && <b className="activity-score">{event.score}%</b>}</div>)}</div> : <div className="activity-empty"><Clock3 size={19} /><span>{analyticsOptIn ? "Your opted-in activity will appear here as you study." : "Activity tracking is off. Turn it on above to record in-app learning patterns."}</span></div>}
      <div className="activity-summary"><span><Timer size={14} /> {Math.floor(studySeconds / 60)} min tracked in recent activity</span><span>{analyticsOptIn ? "Collection stops when you switch it off." : "Nothing is being collected while tracking is off."}</span></div>
    </section>
    <p className="database-warning">Your account data is isolated in the local SQLite database. Before public deployment, use HTTPS, persistent managed storage, regular backups, and add email verification and sign-in rate limits.</p>
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

function makeRevisionTasks(topics: StudyTopic[], existingTasks: StudyTask[] = []): StudyTask[] {
  return [...topics]
    .sort((first, second) => first.mastery - second.mastery)
    .slice(0, 6)
    .map((topic, index) => ({
      id: `review-${topic.id}`,
      title: `Review ${topic.name}`,
      topic: topic.name,
      duration: index < 2 ? "20 min" : "15 min",
      priority: index < 2 ? "High" : index < 4 ? "Medium" : "Low",
      description: `Revisit “${topic.name}” in ${topic.source}, then check your understanding with a source-based question.`,
      done: existingTasks.find((task) => task.id === `review-${topic.id}`)?.done ?? false,
    }));
}

function WelcomePage({ name, onUpload }: { name: string; onUpload: () => void }) {
  return <div className="welcome-page"><span className="eyebrow">YOUR STUDY SPACE IS READY</span><h1>Let’s find what to focus on, {name.split(" ")[0]}<span className="heading-period">.</span></h1><p>Start with a syllabus, class notes, a textbook chapter, or a past paper. GapFinder will map your material before it asks you to revise it.</p><button className="button button-primary" onClick={onUpload}><Upload size={16} /> Add your first material <ArrowRight size={15} /></button><div className="welcome-steps"><span><i>01</i><strong>Add a source</strong><small>PDF, text, or Markdown</small></span><span><i>02</i><strong>Map its topics</strong><small>Sections from your material</small></span><span><i>03</i><strong>Check your gaps</strong><small>Cited questions and feedback</small></span></div></div>;
}

function AuthPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => Promise<void> }) {
  const [mode, setMode] = useState<"signin" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, name, email, password }),
      });
      const result = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error ?? "Could not sign you in.");
      await onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not sign you in.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><div className="auth-aside"><div className="auth-brand" aria-label="GapFinder"><span className="brand-mark"><Target size={19} /></span><span>gapfinder</span><small>AI</small></div><div className="auth-pitch"><span className="eyebrow">STUDY WITH INTENTION</span><h1>Find the gaps before the exam does.</h1><p>Bring your own study material. Get a clear picture of what you know and a better next step.</p><div className="auth-proof"><span><BookOpen size={16} /> Grounded in your materials</span><span><Target size={16} /> Built around your gaps</span><span><ShieldCheck size={16} /> Your own study space</span></div></div><span className="auth-aside-note">Your workspace starts empty and belongs to your account.</span></div><section className="auth-main"><div className="auth-form-wrap"><div className="auth-tabs" role="tablist" aria-label="Account action"><button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => { setMode("register"); setError(""); }}>Create account</button><button role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button></div><span className="eyebrow">{mode === "register" ? "A PERSONAL SPACE FOR YOUR STUDIES" : "WELCOME BACK"}</span><h2>{mode === "register" ? "Create your account" : "Sign in to GapFinder"}</h2><p className="auth-subtitle">{mode === "register" ? "Your materials and progress stay in your account." : "Continue with your study materials and progress."}</p><form className="auth-form" onSubmit={submit}>{mode === "register" && <label>Your name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we address you?" /></label>}<label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={12} maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" /></label>{mode === "register" && <span className="password-note">Use at least 12 characters. Your password is stored as a one-way hash.</span>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : null}{mode === "register" ? "Create account" : "Sign in"}<ArrowRight size={15} /></button></form><p className="auth-footnote">By continuing, you create a private GapFinder study workspace. You can add your materials after signing in.</p></div></section></main>;
}
