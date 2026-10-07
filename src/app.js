import { quiz } from "./project.js";
import { store } from "./data/store.js";
import {
  escapeHtml,
  formatDate,
  onRouteChange,
  qs,
  qsa,
  renderLogin,
  renderShell,
  route,
  setNotice,
} from "./ui.js";
import { renderStyleguide } from "./styleguide.js";

const STATE_KEY = "airc_quiz_state_v1";
const RESULT_KEY = "airc_quiz_result_v1";

const nav = (active) => [
  { href: "#/", label: "Главная", active: active === "/" },
  { href: "#/quiz", label: "Квиз", active: active === "/quiz" },
  { href: "#/workspace", label: "Результаты", active: active === "/workspace" },
  { href: "#/styleguide", label: "Стиль", active: active === "/styleguide" },
];

function readState() {
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{"step":0,"answers":{}}');
  } catch {
    return { step: 0, answers: {} };
  }
}

function writeState(state) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function calculate(answers) {
  const scores = { content: 0, sales: 0, operations: 0 };
  for (const question of quiz.questions) {
    const index = answers[question.id];
    const option = question.options[index];
    if (!option) continue;
    for (const [key, value] of Object.entries(option.scores)) scores[key] += value;
  }
  const order = ["sales", "operations", "content"];
  return order.sort((a, b) => scores[b] - scores[a])[0];
}

function renderHome() {
  renderShell({
    title: `${quiz.name} — ${quiz.title}`,
    nav: nav("/"),
    content: `
      <section class="hero">
        <div class="container hero-grid">
          <div>
            <p class="eyebrow">${escapeHtml(quiz.eyebrow)}</p>
            <h1>${escapeHtml(quiz.title)}</h1>
            <p class="lead">${escapeHtml(quiz.lead)}</p>
            <div class="actions">
              <a class="button" href="#/quiz">${escapeHtml(quiz.startCta)}</a>
            </div>
          </div>
          <aside class="panel">
            <span class="metric">${quiz.questions.length}</span>
            <h2 style="font-size:30px">коротких вопросов</h2>
            <p class="muted">Результат рассчитывается по прозрачной таблице в <code>src/project.js</code>. Каждый результат достижим.</p>
          </aside>
        </div>
      </section>
      <section class="section section--soft">
        <div class="container grid grid-3">
          ${Object.values(quiz.results).map((result) => `
            <article class="card">
              <h3>${escapeHtml(result.title)}</h3>
              <p>${escapeHtml(result.text)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `,
  });
}

function renderQuiz() {
  const state = readState();
  const step = Math.min(state.step, quiz.questions.length - 1);
  const question = quiz.questions[step];
  const selected = state.answers[question.id];
  const percent = Math.round((step / quiz.questions.length) * 100);

  renderShell({
    title: `Вопрос ${step + 1} — ${quiz.name}`,
    nav: nav("/quiz"),
    content: `
      <section class="section">
        <div class="narrow panel">
          <div class="split">
            <p class="eyebrow">Вопрос ${step + 1} из ${quiz.questions.length}</p>
            <span class="small muted">${percent}%</span>
          </div>
          <div class="progress" aria-label="Прогресс квиза"><span style="width:${percent}%"></span></div>
          <h1 style="font-size:clamp(32px,6vw,52px);margin-top:28px">${escapeHtml(question.title)}</h1>
          <form id="question-form" class="stack">
            ${question.options.map((option, index) => `
              <label class="option">
                <input type="radio" name="answer" value="${index}" ${selected === index ? "checked" : ""}>
                <span>${escapeHtml(option.label)}</span>
              </label>
            `).join("")}
            <p id="question-error" class="field-error" hidden>Выбери один вариант.</p>
            <div class="split">
              ${step > 0 ? '<button id="back" class="button button--secondary" type="button">Назад</button>' : "<span></span>"}
              <button class="button" type="submit">${step === quiz.questions.length - 1 ? "Показать результат" : "Следующий вопрос"}</button>
            </div>
          </form>
        </div>
      </section>
    `,
  });

  qs("#back")?.addEventListener("click", () => {
    writeState({ ...state, step: Math.max(0, step - 1) });
    renderQuiz();
  });

  qs("#question-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("answer");
    if (value === null) {
      qs("#question-error").hidden = false;
      return;
    }

    const answers = { ...state.answers, [question.id]: Number(value) };
    if (step < quiz.questions.length - 1) {
      writeState({ step: step + 1, answers });
      renderQuiz();
      return;
    }

    const resultKey = calculate(answers);
    const result = quiz.results[resultKey];
    const payload = {
      resultKey,
      resultTitle: result.title,
      answers,
      contact: "",
    };

    try {
      const record = await store.create("quiz_result", payload, "done");
      sessionStorage.setItem(RESULT_KEY, JSON.stringify({ ...payload, recordId: record.id }));
      writeState({ step: 0, answers: {} });
      location.hash = "#/result";
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не удалось сохранить результат", "error");
    }
  });
}

function renderResult() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || "null");
  } catch {
    saved = null;
  }

  if (!saved) {
    location.hash = "#/quiz";
    return;
  }

  const result = quiz.results[saved.resultKey];
  renderShell({
    title: `Результат — ${quiz.name}`,
    nav: nav(""),
    content: `
      <section class="section">
        <div class="narrow panel">
          <p class="eyebrow">Твой результат</p>
          <h1 style="font-size:clamp(36px,7vw,60px)">${escapeHtml(result.title)}</h1>
          <p class="lead">${escapeHtml(result.text)}</p>
          <article class="card" style="margin-top:24px">
            <span class="badge">Первое действие</span>
            <p style="font-size:20px"><strong>${escapeHtml(result.action)}</strong></p>
          </article>

          <form id="contact-form" class="stack" style="margin-top:28px">
            <label>
              Получить продолжение по почте или в Telegram
              <input name="contact" maxlength="120" placeholder="необязательно">
              <span class="help">Польза уже показана. Контакт не блокирует результат.</span>
            </label>
            <button class="button" type="submit">Сохранить контакт</button>
          </form>

          <div class="actions">
            <button id="restart" class="button button--secondary">Пройти ещё раз</button>
          </div>
        </div>
      </section>
    `,
  });

  qs("#restart").addEventListener("click", () => {
    sessionStorage.removeItem(RESULT_KEY);
    writeState({ step: 0, answers: {} });
    location.hash = "#/quiz";
  });

  qs("#contact-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const contact = String(new FormData(event.currentTarget).get("contact") || "").trim();
    if (!contact) {
      setNotice("Контакт можно не оставлять. Результат уже у тебя.");
      return;
    }
    try {
      if (store.mode === "local") {
        const existing = (await store.list("quiz_result")).find((item) => item.id === saved.recordId);
        if (existing) {
          await store.update(saved.recordId, { payload: { ...existing.payload, contact } });
        }
      } else {
        await store.create("lead", {
          contact,
          source: "quiz_result",
          resultKey: saved.resultKey,
          resultTitle: saved.resultTitle,
        });
      }
      setNotice("Контакт сохранён");
      event.currentTarget.reset();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Не удалось сохранить контакт", "error");
    }
  });
}

async function workspaceMarkup() {
  const session = await store.session();
  if (store.mode === "supabase" && !session) return renderLogin();
  const records = await store.list("quiz_result");
  const counts = records.reduce((acc, record) => {
    const key = record.payload.resultKey || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return `
    <section class="section">
      <div class="container">
        <div class="split">
          <div>
            <p class="eyebrow">Рабочий экран</p>
            <h1 style="font-size:clamp(38px,6vw,64px)">Прохождения</h1>
            <p class="lead">${store.mode === "local" ? "Статистика этого браузера." : "Результаты рабочей области."}</p>
          </div>
          ${store.mode === "supabase" ? '<button id="logout" class="button button--secondary">Выйти</button>' : ""}
        </div>

        <div class="grid grid-3" style="margin:30px 0">
          ${Object.entries(quiz.results).map(([key, result]) => `
            <article class="card">
              <span class="metric">${counts[key] || 0}</span>
              <h3>${escapeHtml(result.title)}</h3>
            </article>
          `).join("")}
        </div>

        <div class="record-list">
          ${records.length ? records.map((record) => `
            <article class="record">
              <span class="badge">${escapeHtml(record.payload.resultTitle || "Результат")}</span>
              <p><strong>${escapeHtml(record.payload.contact || "Контакт не оставлен")}</strong></p>
              <p class="record-meta">${formatDate(record.created_at)}</p>
            </article>
          `).join("") : '<div class="empty"><h3>Прохождений пока нет</h3><p>Пройди квиз один раз и проверь все ветки.</p><a class="button" href="#/quiz">Открыть квиз</a></div>'}
        </div>
      </div>
    </section>
  `;
}

async function renderWorkspace() {
  renderShell({
    title: `Результаты — ${quiz.name}`,
    nav: nav("/workspace"),
    content: '<section class="section"><div class="container">Загружаю…</div></section>',
  });
  qs("#main").innerHTML = await workspaceMarkup();

  const loginForm = qs("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const error = qs("#login-error");
      try {
        await store.signIn(String(data.get("email")), String(data.get("password")));
        await renderWorkspace();
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : "Не удалось войти";
        error.hidden = false;
      }
    });
    return;
  }

  qs("#logout")?.addEventListener("click", async () => {
    await store.signOut();
    await renderWorkspace();
  });
}

async function render() {
  const current = route();
  if (current === "/quiz") return renderQuiz();
  if (current === "/result") return renderResult();
  if (current === "/workspace") return renderWorkspace();
  if (current === "/styleguide") return renderStyleguide();
  return renderHome();
}

onRouteChange(() => {
  render().catch((error) => {
    console.error(error);
    setNotice(error.message || "Ошибка приложения", "error");
  });
});
