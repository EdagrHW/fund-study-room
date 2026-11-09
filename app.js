(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  const QUESTION_MAP = new Map(QUESTIONS.map((question) => [question.id, question]));
  const STORAGE_KEY = "fund-study-room-v1";
  const MAX_EXAMS = 30;
  const CATEGORIES = [...new Set(QUESTIONS.map((question) => question.category).filter(Boolean))];
  const viewTitles = {
    dashboard: "学习首页",
    setup: "刷题与模考",
    session: "专注答题",
    wrong: "我的错题",
    bank: "题库与收藏",
    history: "考试记录",
    result: "本次考试成绩",
  };

  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/>',
    practice: '<path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h5M8 15h3"/><path d="m14 16 1.5 1.5L18.5 14"/>',
    wrong: '<path d="M6 3h12v18l-6-4-6 4z"/><path d="m9 8 6 6m0-6-6 6"/>',
    bank: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    cross: '<path d="m6 6 12 12M18 6 6 18"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    shuffle: '<path d="M3 7h3c5 0 7 10 12 10h3M18 14l3 3-3 3M3 17h3c2 0 3-2 4-4M15 7c1-1 2-1 3-1h3M18 3l3 3-3 3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4z"/><path d="M20 4h-4a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h4z"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  }

  function emptyState() {
    return { version: 1, records: {}, favorites: [], session: null, exams: [] };
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function normalizeState(candidate) {
    const clean = emptyState();
    if (!candidate || typeof candidate !== "object") return clean;
    if (candidate.records && typeof candidate.records === "object") {
      Object.entries(candidate.records).forEach(([id, record]) => {
        const numericId = Number(id);
        if (!QUESTION_MAP.has(numericId) || !record || typeof record !== "object") return;
        clean.records[numericId] = {
          attempts: Math.floor(finiteNumber(record.attempts)),
          correct: Math.floor(finiteNumber(record.correct)),
          wrong: Math.floor(finiteNumber(record.wrong)),
          lastAnswer: typeof record.lastAnswer === "string" ? record.lastAnswer.slice(0, 2) : "",
          lastCorrect: typeof record.lastCorrect === "boolean" ? record.lastCorrect : null,
          mastered: Boolean(record.mastered),
          updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
        };
      });
    }
    if (Array.isArray(candidate.favorites)) {
      clean.favorites = [...new Set(candidate.favorites.map(Number).filter((id) => QUESTION_MAP.has(id)))];
    }
    if (Array.isArray(candidate.exams)) {
      clean.exams = candidate.exams.slice(0, MAX_EXAMS).flatMap((exam) => {
        if (!exam || !Array.isArray(exam.ids) || !exam.ids.length) return [];
        const ids = exam.ids.map(Number).filter((id) => QUESTION_MAP.has(id));
        if (!ids.length) return [];
        return [{
          id: String(exam.id || Date.now()),
          date: typeof exam.date === "string" ? exam.date : new Date().toISOString(),
          total: ids.length,
          score: Math.min(100, Math.floor(finiteNumber(exam.score))),
          correct: Math.floor(finiteNumber(exam.correct)),
          wrong: Math.floor(finiteNumber(exam.wrong)),
          unanswered: Math.floor(finiteNumber(exam.unanswered)),
          durationSeconds: Math.floor(finiteNumber(exam.durationSeconds)),
          ids,
          answers: exam.answers && typeof exam.answers === "object" ? { ...exam.answers } : {},
        }];
      });
    }
    const session = candidate.session;
    if (session && ["practice", "exam"].includes(session.mode) && Array.isArray(session.ids)) {
      const ids = [...new Set(session.ids.map(Number).filter((id) => QUESTION_MAP.has(id)))];
      if (ids.length) {
        clean.session = {
          mode: session.mode,
          title: String(session.title || "上次练习").slice(0, 80),
          ids,
          index: Math.min(ids.length - 1, Math.floor(finiteNumber(session.index))),
          answers: session.answers && typeof session.answers === "object" ? { ...session.answers } : {},
          checked: session.checked && typeof session.checked === "object" ? { ...session.checked } : {},
          startedAt: typeof session.startedAt === "string" ? session.startedAt : new Date().toISOString(),
          deadline: finiteNumber(session.deadline),
          durationMinutes: Math.max(1, Math.floor(finiteNumber(session.durationMinutes, 60))),
        };
      }
    }
    return clean;
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      console.warn("学习记录读取失败，将使用新记录。", error);
      return emptyState();
    }
  }

  let state = loadState();
  let currentView = "dashboard";
  let setupMode = "practice";
  let setupConfig = { source: "all", order: "sequential", count: 20, examCount: 50, duration: 60 };
  let bankFilters = { search: "", category: "all", status: "all" };
  let bankLimit = 30;
  let expandedQuestions = new Set();
  let lastResult = null;
  let toastTimer = null;
  let examTimer = null;
  let submittingExam = false;

  const main = document.getElementById("mainContent");

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("学习记录保存失败。", error);
      showToast("浏览器存储不可用，请导出学习数据备份");
    }
    updateWrongBadge();
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[character]);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function wrongIds() {
    return QUESTIONS.filter((question) => {
      const record = state.records[question.id];
      return record && record.lastCorrect === false && !record.mastered;
    }).map((question) => question.id);
  }

  function stats() {
    const records = Object.values(state.records);
    const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
    const correct = records.reduce((sum, record) => sum + record.correct, 0);
    return {
      answered: records.filter((record) => record.attempts > 0).length,
      attempts,
      correct,
      accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
      wrong: wrongIds().length,
      favorites: state.favorites.length,
    };
  }

  function updateWrongBadge() {
    document.getElementById("wrongBadge").textContent = wrongIds().length;
  }

  function recordAnswer(id, selected, shouldSave = true) {
    const question = QUESTION_MAP.get(Number(id));
    if (!question) return;
    const previous = state.records[id] || { attempts: 0, correct: 0, wrong: 0 };
    const isCorrect = selected === question.answer;
    state.records[id] = {
      attempts: previous.attempts + 1,
      correct: previous.correct + (isCorrect ? 1 : 0),
      wrong: previous.wrong + (isCorrect ? 0 : 1),
      lastAnswer: selected,
      lastCorrect: isCorrect,
      mastered: isCorrect,
      updatedAt: new Date().toISOString(),
    };
    if (shouldSave) saveState();
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "时间未知";
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(date);
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes} 分钟` : `${seconds} 秒`;
  }

  function progressBar(percent) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    return `<div class="progress-track"><div class="progress-fill" style="width:${safePercent}%"></div></div>`;
  }

  function emptyBlock(title, description, action = "") {
    return `<div class="card empty-state"><div class="empty-icon">${icon("book")}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}</div>`;
  }

  function dataTools() {
    return `<section class="card data-tools">
      <div><h3>学习数据备份</h3><p>换浏览器或清理缓存前，建议先导出；导入会替换当前浏览器中的学习记录。</p></div>
      <div class="button-row">
        <button class="ghost-button" data-action="import">${icon("upload")}导入</button>
        <button class="ghost-button" data-action="export">${icon("download")}导出</button>
        <button class="text-button danger" data-action="clear-data">清空记录</button>
      </div>
    </section>
    <p class="disclaimer">题目与原卷答案整理自所提供文档，解析由 AI 辅助生成，仅供个人复习。法规与监管规则具有时效性，请以最新法律法规、官方教材及考试通知为准。</p>`;
  }

  function dashboardView() {
    const summary = stats();
    const progress = Math.round((summary.answered / QUESTIONS.length) * 100);
    const session = state.session;
    const categoryRows = CATEGORIES.map((category) => {
      const questions = QUESTIONS.filter((question) => question.category === category);
      const records = questions.map((question) => state.records[question.id]).filter(Boolean);
      const attempts = records.reduce((sum, record) => sum + record.attempts, 0);
      const correct = records.reduce((sum, record) => sum + record.correct, 0);
      const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
      return `<div class="category-row"><div class="category-row-top"><span>${escapeHTML(category)}</span><span class="muted">${attempts ? `${accuracy}% · ${attempts} 次作答` : `未开始 · ${questions.length} 题`}</span></div>${progressBar(accuracy)}</div>`;
    }).join("");
    const recentExam = state.exams[0];
    return `
      ${session ? `<div class="resume-banner"><div><strong>有一份未完成的学习任务</strong><p>${escapeHTML(session.title)} · 已答 ${session.mode === "practice" ? Object.keys(session.checked).filter((id) => session.checked[id]).length : Object.keys(session.answers).length} / ${session.ids.length} 题</p></div><button class="primary-button" data-action="resume-session">继续上次${session.mode === "exam" ? "考试" : "练习"}${icon("arrow")}</button></div>` : ""}
      <section class="hero">
        <div class="hero-content"><div class="eyebrow">FUND QUALIFICATION · 205 QUESTIONS</div><h1>把每一道错题，变成得分点。</h1><p>${summary.answered ? `已经练过 ${summary.answered} 道题。保持节奏，今天也离目标更近一点。` : "真题、解析、模考与错题本都已准备好，从第一道题开始建立复习节奏。"}</p><div class="button-row"><button class="primary-button" data-view="setup">开始刷题${icon("arrow")}</button><button class="ghost-button" data-action="quick-random">${icon("shuffle")}随机 20 题</button></div></div>
        <div class="hero-seal">笃学<br>日进</div>
      </section>
      <section class="stats-grid">
        <div class="card stat-card"><span class="stat-icon">${icon("practice")}</span><div><strong class="stat-value">${summary.answered}<small class="muted" style="font-size:13px"> / ${QUESTIONS.length}</small></strong><span class="stat-label">已练习题数</span></div></div>
        <div class="card stat-card"><span class="stat-icon">${icon("target")}</span><div><strong class="stat-value">${summary.accuracy}%</strong><span class="stat-label">累计正确率</span></div></div>
        <div class="card stat-card"><span class="stat-icon">${icon("wrong")}</span><div><strong class="stat-value">${summary.wrong}</strong><span class="stat-label">待攻克错题</span></div></div>
        <div class="card stat-card"><span class="stat-icon">${icon("star")}</span><div><strong class="stat-value">${summary.favorites}</strong><span class="stat-label">收藏题目</span></div></div>
      </section>
      <div class="dashboard-grid">
        <section class="card panel"><div class="panel-heading"><h2>学习进度</h2><span class="pill green">题库覆盖 ${progress}%</span></div><div class="progress-summary"><strong>${summary.answered}</strong><span class="muted">/ ${QUESTIONS.length} 题</span></div>${progressBar(progress)}<div class="category-list">${categoryRows}</div></section>
        <section class="card panel"><div class="panel-heading"><h2>快捷学习</h2></div><div class="quick-list">
          <button class="quick-action" data-action="quick-wrong"><span>${icon("wrong")}</span><span><strong>错题集中复习</strong><small>${summary.wrong ? `${summary.wrong} 道题等待攻克` : "当前没有待复习错题"}</small></span>${icon("arrow")}</button>
          <button class="quick-action" data-action="quick-favorites"><span>${icon("star")}</span><span><strong>收藏题练习</strong><small>${summary.favorites ? `${summary.favorites} 道重点题` : "刷题时可收藏重点题"}</small></span>${icon("arrow")}</button>
          <button class="quick-action" data-action="quick-exam"><span>${icon("clock")}</span><span><strong>50 题模拟考试</strong><small>随机抽题 · 60 分钟</small></span>${icon("arrow")}</button>
          ${recentExam ? `<button class="quick-action" data-action="exam-detail" data-id="${escapeHTML(recentExam.id)}"><span>${icon("history")}</span><span><strong>上次模考 ${recentExam.score} 分</strong><small>${formatDate(recentExam.date)}</small></span>${icon("arrow")}</button>` : ""}
        </div></section>
      </div>${dataTools()}`;
  }

  function poolForSource(source) {
    if (source.startsWith("category:")) {
      const category = source.slice(9);
      return QUESTIONS.filter((question) => question.category === category).map((question) => question.id);
    }
    if (source === "unanswered") return QUESTIONS.filter((question) => !state.records[question.id]?.attempts).map((question) => question.id);
    if (source === "wrong") return wrongIds();
    if (source === "favorites") return QUESTIONS.filter((question) => state.favorites.includes(question.id)).map((question) => question.id);
    return QUESTIONS.map((question) => question.id);
  }

  function setupView() {
    const pool = poolForSource(setupConfig.source);
    const categories = CATEGORIES.map((category) => `<option value="category:${escapeHTML(category)}" ${setupConfig.source === `category:${category}` ? "selected" : ""}>知识点：${escapeHTML(category)}</option>`).join("");
    return `<div class="page-heading"><div><div class="eyebrow">PRACTICE & EXAM</div><h1>选择今天的学习方式</h1><p>练习逐题看解析，模考检验整体掌握程度。</p></div></div>
      <div class="setup-tabs"><button class="setup-tab ${setupMode === "practice" ? "active" : ""}" data-action="setup-mode" data-mode="practice">自主刷题</button><button class="setup-tab ${setupMode === "exam" ? "active" : ""}" data-action="setup-mode" data-mode="exam">模拟考试</button></div>
      ${setupMode === "practice" ? `<section class="card setup-card"><h2>定制本次练习</h2><p>提交答案后立即显示正误和解析，答对的错题会自动标记为已掌握。</p><div class="form-grid">
        <div class="form-field full"><label for="practiceSource">题目范围</label><select id="practiceSource"><option value="all" ${setupConfig.source === "all" ? "selected" : ""}>全部真题</option><option value="unanswered" ${setupConfig.source === "unanswered" ? "selected" : ""}>尚未练习</option><option value="wrong" ${setupConfig.source === "wrong" ? "selected" : ""}>待复习错题</option><option value="favorites" ${setupConfig.source === "favorites" ? "selected" : ""}>我的收藏</option>${categories}</select></div>
        <div class="form-field"><label for="practiceOrder">出题顺序</label><select id="practiceOrder"><option value="sequential" ${setupConfig.order === "sequential" ? "selected" : ""}>按题号顺序</option><option value="random" ${setupConfig.order === "random" ? "selected" : ""}>随机打乱</option></select></div>
        <div class="form-field"><label for="practiceCount">本次题量</label><input id="practiceCount" type="number" min="1" max="${Math.max(1, pool.length)}" value="${Math.min(setupConfig.count, Math.max(1, pool.length))}"><span class="form-hint">可输入 1—${Math.max(1, pool.length)}，超出范围会自动调整</span></div>
      </div><div class="setup-footer"><span class="pool-count">当前范围共 <strong>${pool.length}</strong> 题可选</span><button class="primary-button" data-action="start-practice" ${pool.length ? "" : "disabled"}>开始刷题${icon("arrow")}</button></div></section>` : `<section class="card setup-card"><h2>模拟真实答题节奏</h2><p>从全部题库随机抽题，答题时不显示答案，交卷后统一评分并生成错题。</p><div class="form-grid">
        <div class="form-field"><label for="examCount">考试题量</label><input id="examCount" type="number" min="5" max="${QUESTIONS.length}" value="${Math.min(setupConfig.examCount, QUESTIONS.length)}"><span class="form-hint">5—${QUESTIONS.length} 题，每题 1 分</span></div>
        <div class="form-field"><label for="examDuration">考试时长（分钟）</label><input id="examDuration" type="number" min="1" max="300" value="${setupConfig.duration}"><span class="form-hint">时间结束后自动交卷</span></div>
      </div><div class="exam-notice">${icon("info")}<span>考试过程中可以切换题目、修改答案；刷新或关闭页面后仍可继续。交卷后未作答题计入错误，成绩和答题明细保存在本机。</span></div><div class="setup-footer"><span class="pool-count">满分 <strong>100</strong> 分，按正确率折算</span><button class="primary-button" data-action="start-exam">进入模拟考试${icon("arrow")}</button></div></section>`}`;
  }

  function startSession(ids, mode, title, durationMinutes = 60) {
    if (!ids.length) {
      showToast("当前范围没有可练习的题目");
      return;
    }
    if (state.session && Array.isArray(state.session.ids) && state.session.ids.length) {
      const taskName = state.session.mode === "exam" ? "模拟考试" : "练习";
      if (!window.confirm(`当前有未完成的${taskName}，开始新任务将替换其未提交进度。确定继续吗？`)) return;
    }
    state.session = {
      mode, title, ids: [...ids], index: 0, answers: {}, checked: {},
      startedAt: new Date().toISOString(),
      durationMinutes,
      deadline: mode === "exam" ? Date.now() + durationMinutes * 60 * 1000 : 0,
    };
    lastResult = null;
    currentView = "session";
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentQuestion() {
    const session = state.session;
    return session ? QUESTION_MAP.get(session.ids[session.index]) : null;
  }

  function answerPanel(question, selected) {
    const correct = selected === question.answer;
    return `<div class="answer-panel"><div class="answer-verdict ${correct ? "good" : "bad"}">${icon(correct ? "check" : "cross")}${correct ? "回答正确" : "回答错误"}</div><div class="answer-line">正确答案：<strong>${escapeHTML(question.answer)}</strong>${correct ? "" : `　你的答案：<strong>${escapeHTML(selected)}</strong>`}</div><p><strong>解析：</strong>${escapeHTML(question.explanation)}</p>${question.answerNote ? `<p class="answer-note"><strong>复核提示：</strong>${escapeHTML(question.answerNote)}</p>` : ""}</div>`;
  }

  function sessionView() {
    const session = state.session;
    const question = currentQuestion();
    if (!session || !question) return emptyBlock("学习任务已结束", "返回首页，开始一组新的练习。", '<button class="primary-button" data-view="setup">开始刷题</button>');
    const selected = session.answers[question.id] || "";
    const checked = session.mode === "practice" && Boolean(session.checked[question.id]);
    const isExam = session.mode === "exam";
    const options = question.options.map((option) => {
      const isSelected = selected === option.key;
      const isAnswer = checked && question.answer === option.key;
      const isWrong = checked && isSelected && selected !== question.answer;
      const classes = ["option-button", !checked && isSelected ? "selected" : "", isAnswer ? "correct" : "", isWrong ? "incorrect" : ""].filter(Boolean).join(" ");
      const result = isAnswer ? '<span class="option-result">正确答案</span>' : isWrong ? '<span class="option-result">你的选择</span>' : "";
      return `<button class="${classes}" data-action="select-option" data-key="${option.key}" ${checked ? "disabled" : ""} aria-pressed="${isSelected}"><span class="option-key">${option.key}</span><span>${escapeHTML(option.text)}</span>${result}</button>`;
    }).join("");
    const palette = session.ids.map((id, index) => {
      const isChecked = Boolean(session.checked[id]);
      const answered = isExam ? Boolean(session.answers[id]) : isChecked;
      const wrong = isChecked && session.answers[id] !== QUESTION_MAP.get(id).answer;
      return `<button class="palette-button ${answered ? "answered" : ""} ${wrong ? "wrong" : ""} ${index === session.index ? "current" : ""}" data-action="goto-question" data-index="${index}" aria-label="第 ${index + 1} 题${answered ? "，已答" : ""}">${index + 1}</button>`;
    }).join("");
    const answeredCount = isExam ? Object.keys(session.answers).filter((id) => session.answers[id]).length : Object.keys(session.checked).filter((id) => session.checked[id]).length;
    const primaryAction = isExam
      ? `<button class="primary-button" data-action="next-question" ${session.index === session.ids.length - 1 ? "disabled" : ""}>下一题${icon("right")}</button>`
      : checked
        ? `<button class="primary-button" data-action="${session.index === session.ids.length - 1 ? "finish-practice" : "next-question"}">${session.index === session.ids.length - 1 ? "完成练习" : "下一题"}${icon(session.index === session.ids.length - 1 ? "check" : "right")}</button>`
        : `<button class="primary-button" data-action="confirm-answer" ${selected ? "" : "disabled"}>确认答案${icon("check")}</button>`;
    const favorite = state.favorites.includes(question.id);
    return `<div class="session-top"><div><div class="eyebrow">${isExam ? "MOCK EXAM" : "FOCUSED PRACTICE"}</div><h1>${escapeHTML(session.title)}</h1></div><div class="session-meta">${isExam ? `<span class="timer" id="examTimer">${icon("clock")}<span>--:--</span></span>` : `<span class="pill green">第 ${session.index + 1} / ${session.ids.length} 题</span>`}<button class="ghost-button" data-action="exit-session">暂时退出</button></div></div>
      <div class="session-layout"><section class="card question-card"><div class="question-header"><span class="question-number">原卷第 ${question.id} 题 · ${escapeHTML(question.category)}</span><button class="favorite-button ${favorite ? "active" : ""}" data-action="toggle-favorite" data-id="${question.id}">${icon("star")}${favorite ? "已收藏" : "收藏"}</button></div><h2 class="question-stem">${escapeHTML(question.stem)}</h2><div class="options-list">${options}</div>${checked ? answerPanel(question, selected) : ""}<div class="question-actions"><button class="ghost-button" data-action="previous-question" ${session.index === 0 ? "disabled" : ""}>${icon("left")}上一题</button><span class="small muted">已答 ${answeredCount} / ${session.ids.length}</span>${primaryAction}</div><div class="keyboard-hint">快捷键：A—D 选项 · Enter 确认/下一题 · ← → 切换题目 · F 收藏</div></section>
      <aside class="card session-sidebar"><div class="panel-heading"><h3>答题卡</h3><span class="small muted">${answeredCount}/${session.ids.length}</span></div><div class="palette">${palette}</div><div class="palette-legend"><span><i class="legend-dot done"></i>已答</span><span><i class="legend-dot"></i>未答</span></div><div class="button-row">${isExam ? `<button class="primary-button" data-action="submit-exam">交卷并评分</button>` : `<button class="ghost-button" data-action="finish-practice">结束本次练习</button>`}<button class="ghost-button" data-action="exit-session">保存并退出</button></div></aside></div>`;
  }

  function bankCard(question, options = {}) {
    const expanded = options.forceExpanded || expandedQuestions.has(question.id);
    const record = state.records[question.id];
    const favorite = state.favorites.includes(question.id);
    const resultAnswer = options.resultAnswer;
    const tags = [
      `<span class="pill">${escapeHTML(question.category)}</span>`,
      record?.attempts ? `<span class="pill">作答 ${record.attempts} 次 · 错 ${record.wrong} 次</span>` : "",
      options.wrongContext ? `<span class="pill red">上次选择 ${escapeHTML(record?.lastAnswer || "未作答")} · 正确答案 ${question.answer}</span>` : "",
      resultAnswer !== undefined ? `<span class="pill ${resultAnswer === question.answer ? "green" : "red"}">本场答案：${escapeHTML(resultAnswer || "未作答")}</span>` : "",
    ].join("");
    return `<article class="card bank-card"><div class="bank-card-top"><h3 class="bank-card-title"><span class="bank-card-id">第 ${question.id} 题</span>${escapeHTML(question.stem)}</h3><button class="favorite-button ${favorite ? "active" : ""}" data-action="toggle-favorite" data-id="${question.id}" aria-label="${favorite ? "取消收藏" : "收藏"}第 ${question.id} 题">${icon("star")}</button></div><div class="bank-card-tags">${tags}</div>${expanded ? `<div class="bank-options">${question.options.map((option) => `<div><strong>${option.key}.</strong> ${escapeHTML(option.text)}</div>`).join("")}</div><div class="bank-answer"><span class="pill green">正确答案 ${question.answer}</span><p><strong>解析：</strong>${escapeHTML(question.explanation)}</p>${question.answerNote ? `<p class="answer-note"><strong>复核提示：</strong>${escapeHTML(question.answerNote)}</p>` : ""}</div>` : ""}<div class="bank-card-actions"><button class="text-button" data-action="toggle-explanation" data-id="${question.id}">${expanded ? "收起题目" : "查看题目与解析"}</button><button class="text-button" data-action="practice-this" data-id="${question.id}">练这道题</button>${options.wrongContext ? `<button class="text-button danger" data-action="remove-wrong" data-id="${question.id}">标记已掌握</button>` : ""}</div></article>`;
  }

  function filteredBankQuestions() {
    const search = bankFilters.search.trim().toLowerCase();
    return QUESTIONS.filter((question) => {
      if (bankFilters.category !== "all" && question.category !== bankFilters.category) return false;
      const record = state.records[question.id];
      if (bankFilters.status === "wrong" && !(record?.lastCorrect === false && !record.mastered)) return false;
      if (bankFilters.status === "favorites" && !state.favorites.includes(question.id)) return false;
      if (bankFilters.status === "unanswered" && record?.attempts) return false;
      if (bankFilters.status === "correct" && record?.lastCorrect !== true) return false;
      if (!search) return true;
      const haystack = `${question.id} ${question.stem} ${question.category} ${question.options.map((option) => option.text).join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  function bankListHTML() {
    const questions = filteredBankQuestions();
    if (!questions.length) return emptyBlock("没有匹配的题目", "试试更换关键词或筛选条件。", '<button class="ghost-button" data-action="reset-filters">重置筛选</button>');
    const visible = questions.slice(0, bankLimit);
    return `<p class="small muted">共找到 ${questions.length} 题${questions.length > visible.length ? `，当前显示前 ${visible.length} 题` : ""}</p><div class="question-list">${visible.map((question) => bankCard(question)).join("")}</div>${questions.length > visible.length ? `<div style="text-align:center;margin-top:20px"><button class="ghost-button" data-action="load-more">再显示 30 题</button></div>` : ""}`;
  }

  function bankView() {
    return `<div class="page-heading"><div><div class="eyebrow">QUESTION LIBRARY</div><h1>题库与收藏</h1><p>搜索知识点，直接看解析，或从任意一道题开始练习。</p></div><span class="pill green">共 ${QUESTIONS.length} 题</span></div><section class="card filter-bar"><div class="search-wrap">${icon("search")}<input class="search-input" id="bankSearch" type="search" placeholder="搜索题干、选项或题号…" value="${escapeHTML(bankFilters.search)}" aria-label="搜索题库"></div><select id="bankCategory" aria-label="按知识点筛选"><option value="all">全部知识点</option>${CATEGORIES.map((category) => `<option value="${escapeHTML(category)}" ${bankFilters.category === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}</select><select id="bankStatus" aria-label="按学习状态筛选"><option value="all" ${bankFilters.status === "all" ? "selected" : ""}>全部状态</option><option value="wrong" ${bankFilters.status === "wrong" ? "selected" : ""}>待复习错题</option><option value="favorites" ${bankFilters.status === "favorites" ? "selected" : ""}>我的收藏</option><option value="unanswered" ${bankFilters.status === "unanswered" ? "selected" : ""}>尚未练习</option><option value="correct" ${bankFilters.status === "correct" ? "selected" : ""}>最近答对</option></select></section><div id="bankList">${bankListHTML()}</div>`;
  }

  function wrongView() {
    const ids = wrongIds();
    return `<div class="page-heading"><div><div class="eyebrow">MISTAKE REVIEW</div><h1>我的错题</h1><p>重新答对后会自动标记为已掌握；也可以手动移出。</p></div>${ids.length ? `<div class="button-row"><button class="ghost-button" data-action="clear-wrong">全部标记已掌握</button><button class="primary-button" data-action="quick-wrong">开始错题练习${icon("arrow")}</button></div>` : ""}</div>${ids.length ? `<div class="question-list">${ids.map((id) => bankCard(QUESTION_MAP.get(id), { wrongContext: true })).join("")}</div>` : emptyBlock("错题本空空如也", "这里会收集练习和模考中的错题。暂时没有错题，去做一组练习检验一下吧。", '<button class="primary-button" data-view="setup">开始刷题</button>')}`;
  }

  function historyView() {
    const exams = state.exams;
    return `<div class="page-heading"><div><div class="eyebrow">EXAM HISTORY</div><h1>考试记录</h1><p>最多保留最近 ${MAX_EXAMS} 次模考，随时回看答题明细。</p></div><button class="primary-button" data-action="quick-exam">新建模考${icon("arrow")}</button></div>${exams.length ? `<div class="history-list">${exams.map((exam) => `<article class="card history-item"><span class="history-score">${exam.score}</span><div class="history-info"><strong>模拟考试 · ${exam.total} 题</strong><span>${formatDate(exam.date)} · 用时 ${formatDuration(exam.durationSeconds)}</span></div><div class="history-detail"><strong>答对 ${exam.correct} 题</strong><span>答错 ${exam.wrong} · 未答 ${exam.unanswered}</span></div><button class="ghost-button" data-action="exam-detail" data-id="${escapeHTML(exam.id)}">查看明细</button></article>`).join("")}</div>` : emptyBlock("还没有模考记录", "完成一次模拟考试后，成绩、用时和答题明细会显示在这里。", '<button class="primary-button" data-action="quick-exam">开始第一次模考</button>')}`;
  }

  function resultView() {
    const result = lastResult;
    if (!result) return emptyBlock("没有找到成绩明细", "请从考试记录中选择一场考试。", '<button class="primary-button" data-view="history">查看考试记录</button>');
    const wrongQuestions = result.ids.filter((id) => result.answers[id] !== QUESTION_MAP.get(id).answer);
    return `<section class="card result-hero"><div class="score-ring" style="--score:${result.score}"><div class="score-ring-inner"><strong>${result.score}</strong><small>分</small></div></div><h1>${result.score >= 80 ? "状态很好，继续保持。" : result.score >= 60 ? "已经及格，再巩固一下错题。" : "别着急，错题正是下一步的方向。"}</h1><p class="muted">${formatDate(result.date)} · ${result.total} 题 · 用时 ${formatDuration(result.durationSeconds)}</p><div class="result-stats"><div><strong style="color:var(--primary)">${result.correct}</strong><span>答对</span></div><div><strong style="color:var(--danger)">${result.wrong}</strong><span>答错</span></div><div><strong>${result.unanswered}</strong><span>未作答</span></div></div><div class="button-row" style="justify-content:center">${wrongQuestions.length ? `<button class="primary-button" data-action="practice-result-wrong">复习本场错题${icon("arrow")}</button>` : ""}<button class="ghost-button" data-action="quick-exam">再考一次</button><button class="ghost-button" data-view="dashboard">返回首页</button></div></section><div class="page-heading" style="margin-top:32px"><div><h2>本场答题明细</h2><p>${wrongQuestions.length ? `以下 ${wrongQuestions.length} 道题需要重点复习，展开即可查看解析。` : "全部回答正确，非常出色。"}</p></div></div>${wrongQuestions.length ? `<div class="question-list">${wrongQuestions.map((id) => bankCard(QUESTION_MAP.get(id), { resultAnswer: result.answers[id] || "" })).join("")}</div>` : ""}`;
  }

  function render(preserveScroll = false) {
    const scrollPosition = window.scrollY;
    clearInterval(examTimer);
    const views = { dashboard: dashboardView, setup: setupView, session: sessionView, bank: bankView, wrong: wrongView, history: historyView, result: resultView };
    main.innerHTML = (views[currentView] || dashboardView)();
    document.getElementById("topbarTitle").textContent = viewTitles[currentView] || "基金自习室";
    document.querySelectorAll(".nav-item").forEach((item) => {
      const activeView = ["session", "result"].includes(currentView) ? "setup" : currentView;
      item.classList.toggle("active", item.dataset.view === activeView);
    });
    updateWrongBadge();
    if (currentView === "session" && state.session?.mode === "exam") {
      updateExamTimer();
      examTimer = setInterval(updateExamTimer, 1000);
    }
    if (preserveScroll) requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  }

  function navigate(view) {
    currentView = view;
    bankLimit = 30;
    closeSidebar();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshBankList() {
    const list = document.getElementById("bankList");
    if (list) list.innerHTML = bankListHTML();
  }

  function updateExamTimer() {
    const session = state.session;
    if (!session || session.mode !== "exam" || submittingExam) return;
    const remaining = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));
    const timer = document.getElementById("examTimer");
    if (timer) {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;
      const text = hours
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      timer.querySelector("span").textContent = text;
      timer.classList.toggle("urgent", remaining <= 300);
    }
    if (remaining <= 0) finishExam(true);
  }

  function finishExam(expired = false) {
    const session = state.session;
    if (!session || session.mode !== "exam" || submittingExam) return;
    submittingExam = true;
    clearInterval(examTimer);
    let correct = 0;
    let unanswered = 0;
    session.ids.forEach((id) => {
      const selected = session.answers[id] || "";
      if (!selected) unanswered += 1;
      if (selected === QUESTION_MAP.get(id).answer) correct += 1;
      recordAnswer(id, selected, false);
    });
    const total = session.ids.length;
    const result = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      total,
      correct,
      wrong: total - correct - unanswered,
      unanswered,
      score: Math.round((correct / total) * 100),
      durationSeconds: Math.min(session.durationMinutes * 60, Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000))),
      ids: [...session.ids],
      answers: { ...session.answers },
    };
    state.exams.unshift(result);
    state.exams = state.exams.slice(0, MAX_EXAMS);
    state.session = null;
    lastResult = result;
    currentView = "result";
    saveState();
    submittingExam = false;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (expired) showToast("考试时间已到，已自动交卷");
  }

  function toggleFavorite(id) {
    const numericId = Number(id);
    const index = state.favorites.indexOf(numericId);
    if (index >= 0) {
      state.favorites.splice(index, 1);
      showToast("已取消收藏");
    } else {
      state.favorites.push(numericId);
      showToast("已加入收藏");
    }
    saveState();
    render(true);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `基金自习室学习记录-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("学习数据已导出");
  }

  function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("open");
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      navigate(viewButton.dataset.view);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const session = state.session;
    const question = currentQuestion();

    if (action === "setup-mode") {
      setupMode = button.dataset.mode;
      render(true);
    } else if (action === "start-practice") {
      let ids = poolForSource(setupConfig.source);
      if (setupConfig.order === "random") ids = shuffle(ids);
      const count = Math.min(ids.length, Math.max(1, Number(setupConfig.count) || 1));
      startSession(ids.slice(0, count), "practice", setupConfig.source === "wrong" ? "错题专项复习" : "真题自主练习");
    } else if (action === "start-exam") {
      const count = Math.min(QUESTIONS.length, Math.max(5, Number(setupConfig.examCount) || 50));
      const duration = Math.min(300, Math.max(1, Number(setupConfig.duration) || 60));
      startSession(shuffle(QUESTIONS.map((item) => item.id)).slice(0, count), "exam", `${count} 题模拟考试`, duration);
    } else if (action === "quick-random") {
      startSession(shuffle(QUESTIONS.map((item) => item.id)).slice(0, 20), "practice", "随机 20 题练习");
    } else if (action === "quick-wrong") {
      startSession(wrongIds(), "practice", "错题专项复习");
    } else if (action === "quick-favorites") {
      startSession(poolForSource("favorites"), "practice", "收藏题专项练习");
    } else if (action === "quick-exam") {
      startSession(shuffle(QUESTIONS.map((item) => item.id)).slice(0, Math.min(50, QUESTIONS.length)), "exam", "50 题模拟考试", 60);
    } else if (action === "resume-session") {
      navigate("session");
    } else if (action === "exit-session") {
      navigate("dashboard");
      showToast("进度已保存，可随时继续");
    } else if (action === "select-option" && session && question) {
      if (session.mode === "practice" && session.checked[question.id]) return;
      session.answers[question.id] = button.dataset.key;
      saveState();
      render(true);
    } else if (action === "confirm-answer" && session && question) {
      const selected = session.answers[question.id];
      if (!selected) return showToast("请先选择一个答案");
      session.checked[question.id] = true;
      recordAnswer(question.id, selected);
      render(true);
    } else if (action === "next-question" && session) {
      session.index = Math.min(session.ids.length - 1, session.index + 1);
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "previous-question" && session) {
      session.index = Math.max(0, session.index - 1);
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "goto-question" && session) {
      session.index = Number(button.dataset.index);
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "finish-practice") {
      if (window.confirm("结束本次练习？已提交的答案和学习进度都会保留。")) {
        state.session = null;
        saveState();
        navigate("dashboard");
        showToast("本次练习已完成");
      }
    } else if (action === "submit-exam") {
      const unanswered = session.ids.length - Object.keys(session.answers).filter((id) => session.answers[id]).length;
      if (window.confirm(unanswered ? `还有 ${unanswered} 题未作答，未答题将计入错误。确定交卷吗？` : "确定交卷并查看成绩吗？")) finishExam();
    } else if (action === "toggle-favorite") {
      toggleFavorite(button.dataset.id);
    } else if (action === "toggle-explanation") {
      const id = Number(button.dataset.id);
      if (expandedQuestions.has(id)) expandedQuestions.delete(id);
      else expandedQuestions.add(id);
      render(true);
    } else if (action === "practice-this") {
      startSession([Number(button.dataset.id)], "practice", `原卷第 ${button.dataset.id} 题专项练习`);
    } else if (action === "remove-wrong") {
      const id = Number(button.dataset.id);
      if (state.records[id]) state.records[id].mastered = true;
      saveState();
      render(true);
      showToast("已标记为掌握，并移出错题本");
    } else if (action === "clear-wrong") {
      if (window.confirm("将当前错题全部标记为已掌握？历史作答次数和正确率不会清除。")) {
        wrongIds().forEach((id) => { state.records[id].mastered = true; });
        saveState();
        render(true);
      }
    } else if (action === "reset-filters") {
      bankFilters = { search: "", category: "all", status: "all" };
      bankLimit = 30;
      render(true);
    } else if (action === "load-more") {
      bankLimit += 30;
      refreshBankList();
    } else if (action === "practice-result-wrong" && lastResult) {
      const ids = lastResult.ids.filter((id) => lastResult.answers[id] !== QUESTION_MAP.get(id).answer);
      startSession(ids, "practice", "本场模考错题复习");
    } else if (action === "exam-detail") {
      lastResult = state.exams.find((exam) => exam.id === button.dataset.id);
      navigate("result");
    } else if (action === "export") {
      exportData();
    } else if (action === "import") {
      document.getElementById("importInput").click();
    } else if (action === "clear-data") {
      if (window.confirm("确定清空当前浏览器中的所有答题、收藏和考试记录吗？此操作无法撤销，建议先导出备份。")) {
        state = emptyState();
        lastResult = null;
        saveState();
        navigate("dashboard");
        showToast("学习记录已清空");
      }
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "practiceSource") {
      setupConfig.source = target.value;
      render(true);
    } else if (target.id === "practiceOrder") {
      setupConfig.order = target.value;
    } else if (target.id === "practiceCount") {
      setupConfig.count = Number(target.value);
    } else if (target.id === "examCount") {
      setupConfig.examCount = Number(target.value);
    } else if (target.id === "examDuration") {
      setupConfig.duration = Number(target.value);
    } else if (target.id === "bankCategory") {
      bankFilters.category = target.value;
      bankLimit = 30;
      refreshBankList();
    } else if (target.id === "bankStatus") {
      bankFilters.status = target.value;
      bankLimit = 30;
      refreshBankList();
    } else if (target.id === "importInput" && target.files?.length) {
      const file = target.files[0];
      file.text().then((text) => {
        const imported = JSON.parse(text);
        if (!imported || typeof imported !== "object" || !imported.records) throw new Error("invalid backup");
        if (!window.confirm("导入将替换当前浏览器中的学习记录，确定继续吗？")) return;
        state = normalizeState(imported);
        lastResult = null;
        saveState();
        navigate("dashboard");
        showToast("学习数据导入成功");
      }).catch(() => showToast("导入失败：请选择本网站导出的有效 JSON 备份")).finally(() => { target.value = ""; });
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "bankSearch") {
      bankFilters.search = event.target.value;
      bankLimit = 30;
      refreshBankList();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (currentView !== "session" || !state.session || event.ctrlKey || event.metaKey || event.altKey) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const question = currentQuestion();
    const session = state.session;
    const key = event.key.toUpperCase();
    if (["A", "B", "C", "D"].includes(key) && question.options.some((option) => option.key === key)) {
      if (!(session.mode === "practice" && session.checked[question.id])) {
        session.answers[question.id] = key;
        saveState();
        render(true);
      }
      event.preventDefault();
    } else if (event.key === "Enter") {
      if (session.mode === "exam") {
        session.index = Math.min(session.ids.length - 1, session.index + 1);
      } else if (!session.checked[question.id]) {
        if (!session.answers[question.id]) return showToast("请先选择一个答案");
        session.checked[question.id] = true;
        recordAnswer(question.id, session.answers[question.id]);
      } else if (session.index < session.ids.length - 1) {
        session.index += 1;
      } else {
        return;
      }
      saveState();
      render();
      event.preventDefault();
    } else if (event.key === "ArrowLeft" && session.index > 0) {
      session.index -= 1;
      saveState();
      render();
    } else if (event.key === "ArrowRight" && session.index < session.ids.length - 1) {
      session.index += 1;
      saveState();
      render();
    } else if (key === "F") {
      toggleFavorite(question.id);
      event.preventDefault();
    }
  });

  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        state = normalizeState(JSON.parse(event.newValue || "null"));
        render(true);
        showToast("已同步其他标签页的学习记录");
      } catch (error) {
        console.warn("其他标签页的学习记录同步失败。", error);
      }
    });
  }

  document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("open");
  });
  document.getElementById("sidebarOverlay").addEventListener("click", closeSidebar);
  document.getElementById("exportButton").addEventListener("click", exportData);

  document.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof window.addEventListener === "function") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("离线功能注册失败，网站仍可正常在线使用。", error);
      });
    });
  }

  if (!QUESTIONS.length) {
    main.innerHTML = emptyBlock("题库加载失败", "请确认 data/questions.js 与 index.html 位于同一网站目录中。", "");
    return;
  }
  render();
  if (state.session?.mode === "exam" && state.session.deadline <= Date.now()) {
    setTimeout(() => finishExam(true), 0);
  }
})();
