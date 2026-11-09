const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const questions = JSON.parse(fs.readFileSync(path.join(root, "data/questions.json"), "utf8"));
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");

function createHarness(saved = {}) {
  const storage = { ...saved };
  const handlers = {};
  const elements = {};
  const navItems = ["dashboard", "setup", "wrong", "bank", "history"].map((view) => ({
    dataset: { view },
    classList: { toggle() {} },
  }));
  function element(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        innerHTML: "",
        textContent: "",
        value: "",
        files: [],
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {},
        querySelector() { return { textContent: "" }; },
        click() {},
      };
    }
    return elements[id];
  }
  const document = {
    activeElement: null,
    getElementById: element,
    querySelectorAll(selector) {
      if (selector === ".nav-item") return navItems;
      return [];
    },
    addEventListener(type, handler) { handlers[type] = handler; },
    createElement() { return element("created"); },
    body: { appendChild() {} },
  };
  const context = {
    console,
    document,
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
      setItem(key, value) { storage[key] = String(value); },
      removeItem(key) { delete storage[key]; },
    },
    window: {
      QUESTION_BANK: questions,
      scrollY: 0,
      scrollTo() {},
      confirm() { return true; },
    },
    requestAnimationFrame(callback) { callback(); },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    Intl,
    Date,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    Boolean,
    RegExp,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });

  function savedState() {
    return JSON.parse(storage["fund-study-room-v1"] || '{"records":{},"favorites":[],"session":null,"exams":[]}');
  }
  function fire(type, target) {
    assert.ok(handlers[type], `Missing ${type} handler`);
    handlers[type]({ target, key: "", preventDefault() {} });
  }
  function click(action, dataset = {}) {
    const button = { dataset: { action, ...dataset }, disabled: false };
    fire("click", { closest: (selector) => selector === "[data-action]" ? button : null });
  }
  function view(name) {
    const button = { dataset: { view: name } };
    fire("click", { closest: (selector) => selector === "[data-view]" ? button : null });
  }
  return { context, storage, elements, handlers, savedState, click, view, fire };
}

const harness = createHarness();
const { elements, savedState, click, view, fire } = harness;
assert.equal(questions.length, 205);
assert.ok(questions.every((question) => question.explanation.length >= 40));
assert.ok(elements.mainContent.innerHTML.includes("205 QUESTIONS"), "Dashboard should render");
assert.equal(savedState().session, null);

click("quick-random");
let state = savedState();
assert.equal(state.session.mode, "practice");
assert.equal(state.session.ids.length, 20);
assert.equal(new Set(state.session.ids).size, 20, "Random practice should not duplicate questions");
const firstId = state.session.ids[0];
const firstQuestion = questions.find((question) => question.id === firstId);
const wrongAnswer = firstQuestion.options.find((option) => option.key !== firstQuestion.answer).key;
click("select-option", { key: wrongAnswer });
click("confirm-answer");
state = savedState();
assert.equal(state.records[firstId].lastCorrect, false);
assert.equal(state.records[firstId].wrong, 1);
assert.ok(elements.mainContent.innerHTML.includes("回答错误"));
assert.ok(elements.mainContent.innerHTML.includes(firstQuestion.explanation));
assert.equal(elements.wrongBadge.textContent, 1);

click("toggle-favorite", { id: String(firstId) });
assert.deepEqual(savedState().favorites, [firstId]);
view("wrong");
assert.ok(elements.mainContent.innerHTML.includes(`第 ${firstId} 题`));
click("quick-wrong");
assert.deepEqual(savedState().session.ids, [firstId]);
click("select-option", { key: firstQuestion.answer });
click("confirm-answer");
state = savedState();
assert.equal(state.records[firstId].lastCorrect, true);
assert.equal(state.records[firstId].mastered, true);
assert.equal(elements.wrongBadge.textContent, 0, "Correct review should remove open wrong question");

click("quick-exam");
state = savedState();
assert.equal(state.session.mode, "exam");
assert.equal(state.session.ids.length, 50);
const examId = state.session.ids[0];
const examQuestion = questions.find((question) => question.id === examId);
click("select-option", { key: examQuestion.answer });
click("submit-exam");
state = savedState();
assert.equal(state.session, null);
assert.equal(state.exams.length, 1);
assert.equal(state.exams[0].correct, 1);
assert.equal(state.exams[0].unanswered, 49);
assert.equal(state.exams[0].score, 2);
assert.ok(elements.mainContent.innerHTML.includes("本次考试成绩") || elements.mainContent.innerHTML.includes("本场答题明细"));

click("practice-result-wrong");
assert.equal(savedState().session.ids.length, 49);
assert.equal(savedState().session.mode, "practice");

const reloaded = createHarness(harness.storage);
assert.equal(reloaded.savedState().session.ids.length, 49, "Session should survive reload");
reloaded.click("resume-session");
assert.ok(reloaded.elements.mainContent.innerHTML.includes("本场模考错题复习"));

reloaded.view("bank");
reloaded.context.document.getElementById("bankList");
assert.ok(reloaded.elements.mainContent.innerHTML.includes("共找到 205 题"));
reloaded.fire("input", { id: "bankSearch", value: "绝对不存在的关键词XYZ" });
assert.ok(reloaded.elements.bankList.innerHTML.includes("没有匹配的题目"));
reloaded.fire("input", { id: "bankSearch", value: "麦考利久期" });
assert.ok(reloaded.elements.bankList.innerHTML.includes("第 14 题"));

reloaded.view("history");
assert.ok(reloaded.elements.mainContent.innerHTML.includes("模拟考试 · 50 题"));
reloaded.click("exam-detail", { id: reloaded.savedState().exams[0].id });
assert.ok(reloaded.elements.mainContent.innerHTML.includes("答对"));
reloaded.click("clear-data");
assert.equal(reloaded.savedState().session, null);
assert.equal(reloaded.savedState().exams.length, 0);
assert.deepEqual(reloaded.savedState().favorites, []);
assert.equal(Object.keys(reloaded.savedState().records).length, 0);

console.log("PASS: 205-question data integrity");
console.log("PASS: random practice, answer checking and explanations");
console.log("PASS: wrong-question creation, review and mastery");
console.log("PASS: favorites and bank search");
console.log("PASS: exam scoring, unanswered handling and result review");
console.log("PASS: session persistence, history and data clearing");
