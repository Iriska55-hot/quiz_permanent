import { quiz, questionOptions } from "./project.js";
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
import { validatePhoto } from "./photo-validation.js";
import { getResultStage, whatsappUrl } from "./result-flow.js";
import { createTryOn } from "./try-on-client.js";

const STATE_KEY = "airc_quiz_state_v1";
const RESULT_KEY = "airc_quiz_result_v1";
let photoPreviewUrl = null;
let offerOpen = false;
let selectedPhoto = null;
let exampleUrl = null;
let processing = false;
let photoConsent = false;
let processingError = '';
const tryOn = createTryOn();

const nav = (active) => [
  { href: "#/", label: "Startseite", active: active === "/" },
  { href: "#/quiz", label: "Quiz", active: active === "/quiz" },
  { href: "#/workspace", label: "Ergebnisse", active: active === "/workspace" },
  { href: "#/styleguide", label: "Design", active: active === "/styleguide" },
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
  return ["content", "sales", "operations"][answers.bottleneck];
}

function renderHome() {
  renderShell({
    title: `${quiz.name} — ${quiz.title}`,
    nav: nav("/"),
    footer: false,
    content: `
      <section class="hero">
        <div class="container">
          <p class="eyebrow">${escapeHtml(quiz.eyebrow)}</p>
          <h1>${escapeHtml(quiz.title)}</h1>
          <p class="lead">${escapeHtml(quiz.lead)}</p>
          <div class="actions">
            <a class="button" href="#/quiz">${escapeHtml(quiz.startCta)}</a>
          </div>
        </div>
      </section>
    `,
  });
}

function renderQuiz() {
  const state = readState();
  const step = Math.min(state.step, quiz.questions.length - 1);
  const question = quiz.questions[step];
  const options = questionOptions(question, state.answers);
  const selected = state.answers[question.id];
  const percent = Math.round((step / quiz.questions.length) * 100);

  renderShell({
    title: `Frage ${step + 1} – ${quiz.name}`,
    nav: nav("/quiz"),
    content: `
      <section class="section">
        <div class="narrow panel">
          <div class="split">
            <p class="eyebrow">Frage ${step + 1} von ${quiz.questions.length}</p>
            <span class="small muted">${percent}%</span>
          </div>
          <div class="progress" aria-label="Fortschritt im Quiz"><span style="width:${percent}%"></span></div>
          <h1 style="font-size:clamp(32px,6vw,52px);margin-top:28px">${escapeHtml(question.title)}</h1>
          <form id="question-form" class="stack">
            ${options.map((option, index) => `
              <label class="option">
                <input type="radio" name="answer" value="${index}" ${selected === index ? "checked" : ""}>
                <span>${escapeHtml(option.label)}</span>
              </label>
            `).join("")}
            <p id="question-error" class="field-error" hidden>Bitte wählen Sie eine Antwort aus.</p>
            <div class="split">
              ${step > 0 ? '<button id="back" class="button button--secondary" type="button">Zurück</button>' : "<span></span>"}
              <button class="button" type="submit">${step === quiz.questions.length - 1 ? "Foto auswählen" : "Weiter"}</button>
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
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      photoPreviewUrl = null;
      if (exampleUrl) URL.revokeObjectURL(exampleUrl);
      exampleUrl = null;
      selectedPhoto = null;
      photoConsent = false;
      processingError = '';
      offerOpen = false;
      writeState({ step: 0, answers: {} });
      location.hash = "#/result";
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Das Ergebnis konnte nicht gespeichert werden.", "error");
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
  const zone = result.title.split(" – ")[0];
  const stage = getResultStage({ photoReady: Boolean(photoPreviewUrl), resultReady: Boolean(exampleUrl), offerOpen });
  renderShell({
    title: `${stage === "offer" ? "Angebot" : "Foto"} – ${quiz.name}`,
    nav: nav(""),
    content: `
      <section class="section">
        <div class="narrow panel">
          ${stage === "offer" ? `
            <p class="eyebrow">Ihr nächster Schritt</p>
            <h1 style="font-size:clamp(36px,7vw,60px)">${escapeHtml(result.title)}</h1>
            <p class="lead">${escapeHtml(result.text)}</p>
            <div class="grid grid-2 photo-preview">
              <figure><figcaption>Vorher</figcaption><img src="${photoPreviewUrl}" alt="Ihr Originalfoto"></figure>
              <figure><figcaption>Beispiel-Look</figcaption><img src="${exampleUrl}" alt="Vorschau für ${escapeHtml(zone)}"></figure>
            </div>
            <p class="small muted">Dies ist eine virtuelle Make-up-Vorschau. Das tatsächliche Ergebnis einer Permanent-Make-up-Behandlung kann abweichen.</p>
            <article class="card stack" style="margin-top:24px">
              <span class="badge">20 % Rabatt</span>
              <h2>240 € statt 299 €</h2>
              <p>Die Bedingungen der Aktion erfahren Sie direkt bei der Fachkraft.</p>
              <a class="button" href="${whatsappUrl(zone)}" target="_blank" rel="noopener">Fachkraft per WhatsApp schreiben</a>
              <p class="small muted">WhatsApp öffnet eine vorbereitete Nachricht. Das Foto wird nicht mitgesendet. Telefonnummer: +49 175 8221111.</p>
            </article>
          ` : `
            <p class="eyebrow">Schritt nach den Fragen</p>
            <h1 style="font-size:clamp(36px,7vw,60px)">Foto für Ihre Vorschau</h1>
            <p class="lead">Gewählter Bereich: ${escapeHtml(zone)}. Wählen Sie jetzt ein Foto aus.</p>
            <section class="card stack" style="margin-top:24px" aria-labelledby="photo-title">
              <h2 id="photo-title">Foto auswählen</h2>
              <label for="photo-input">JPG, PNG oder WebP, bis 3 MB</label>
              <input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" ${processing ? 'disabled' : ''}>
              <p id="photo-error" class="field-error" role="alert" ${processingError ? '' : 'hidden'}>${escapeHtml(processingError)}</p>
              <div id="photo-preview" class="photo-preview" ${photoPreviewUrl ? "" : "hidden"}>
                <p class="small muted">Ausgewähltes Originalfoto – noch keine Bearbeitung</p>
                <img id="photo-image" alt="Ihr ausgewähltes Originalfoto" ${photoPreviewUrl ? `src="${photoPreviewUrl}"` : ""}>
                <form id="try-on-form" class="stack">
                  <p class="small muted">Für die Vorschau wird Ihr Foto an Perfect Corp übermittelt. Dort werden Foto und Ergebnis bis zu 30 Tage gespeichert. In diesem Quiz bleiben die Bilder nur während der geöffneten Sitzung verfügbar.</p>
                  <label class="option"><input id="photo-consent" type="checkbox" ${photoConsent ? 'checked' : ''} ${processing ? 'disabled' : ''}><span>Ich stimme der Übermittlung und Verarbeitung meines Fotos durch Perfect Corp für die Vorschau zu.</span></label>
                  <button class="button" type="submit" ${processing ? 'disabled' : ''}>${processing ? 'Vorschau wird erstellt …' : 'Vorschau erstellen'}</button>
                  <p role="status" aria-live="polite">${processing ? 'Wir erstellen Ihren Beispiel-Look. Bitte warten Sie.' : ''}</p>
                </form>
              </div>
            </section>
          `}
        </div>
      </section>
    `,
  });

  qs("#photo-input")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const error = qs("#photo-error");
    const message = await validatePhoto(file);
    if (message) {
      error.textContent = message;
      error.hidden = false;
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const image = qs("#photo-image");
    image.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      image.onerror = null;
      image.onload = null;
      if (photoPreviewUrl) image.src = photoPreviewUrl;
      else {
        image.removeAttribute("src");
        qs("#photo-preview").hidden = true;
      }
      error.textContent = "Das Foto konnte nicht geöffnet werden. Bitte wählen Sie ein anderes.";
      error.hidden = false;
    };
    image.onload = () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      photoPreviewUrl = nextUrl;
      selectedPhoto = file;
      photoConsent = false;
      processingError = '';
      renderResult();
    };
    image.src = nextUrl;
  });

  qs('#photo-consent')?.addEventListener('change', event => { photoConsent = event.currentTarget.checked; });
  qs('#try-on-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (processing) return;
    if (!photoConsent) {
      processingError = 'Bitte bestätigen Sie die Bildverarbeitung.';
      renderResult();
      return;
    }
    processing = true;
    processingError = '';
    const sourcePhoto = selectedPhoto;
    renderResult();
    try {
      let photo = selectedPhoto;
      if (photo.type === 'image/webp') {
        const bitmap = await createImageBitmap(photo);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        bitmap.close();
        const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!png || png.size > 3 * 1024 * 1024) throw new Error('Bitte wählen Sie stattdessen ein JPG- oder PNG-Foto bis 3 MB.');
        photo = new File([png], 'portrait.png', { type: 'image/png' });
      }
      const output = await tryOn.submit({ photo, resultKey: saved.resultKey, answers: saved.answers, consent: photoConsent });
      if (selectedPhoto !== sourcePhoto) return;
      if (exampleUrl) URL.revokeObjectURL(exampleUrl);
      exampleUrl = URL.createObjectURL(output);
      offerOpen = true;
    } catch (error) {
      processingError = error.message || 'Die Vorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.';
    } finally {
      processing = false;
      if (location.hash === '#/result') renderResult();
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
            <p class="eyebrow">Interner Bereich</p>
            <h1 style="font-size:clamp(38px,6vw,64px)">Quiz-Ergebnisse</h1>
            <p class="lead">${store.mode === "local" ? "Ergebnisse in diesem Browser." : "Ergebnisse des Arbeitsbereichs."}</p>
          </div>
          ${store.mode === "supabase" ? '<button id="logout" class="button button--secondary">Abmelden</button>' : ""}
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
              <span class="badge">${escapeHtml(record.payload.resultTitle || "Ergebnis")}</span>
              <p><strong>${escapeHtml(record.payload.contact || "Kein Demo-Kontakt gespeichert")}</strong></p>
              <p class="record-meta">${formatDate(record.created_at)}</p>
            </article>
          `).join("") : '<div class="empty"><h3>Noch keine Ergebnisse</h3><p>Starten Sie das Quiz und sehen Sie sich die drei möglichen Ergebnisse an.</p><a class="button" href="#/quiz">Quiz öffnen</a></div>'}
        </div>
      </div>
    </section>
  `;
}

async function renderWorkspace() {
  renderShell({
    title: `Ergebnisse – ${quiz.name}`,
    nav: nav("/workspace"),
    content: '<section class="section"><div class="container">Wird geladen …</div></section>',
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
        error.textContent = cause instanceof Error ? cause.message : "Die Anmeldung ist fehlgeschlagen.";
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
    setNotice(error.message || "Ein Fehler ist aufgetreten.", "error");
  });
});
