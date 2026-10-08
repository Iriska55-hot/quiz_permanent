export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function setNotice(message, type = "success") {
  const node = qs("#global-notice");
  if (!node) return;
  node.textContent = message;
  node.className = `notice notice--${type}`;
  node.hidden = false;
  window.clearTimeout(window.__aircNoticeTimer);
  window.__aircNoticeTimer = window.setTimeout(() => {
    node.hidden = true;
  }, 4500);
}

export function renderShell({ title, nav, content }) {
  document.title = title;
  const root = qs("#app");
  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#/">inSkills Academy</a>
      <nav class="nav" aria-label="Hauptnavigation">
        ${nav.map((item) => `<a href="${item.href}" ${item.active ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("")}
      </nav>
    </header>
    <main id="main">${content}</main>
    <div id="global-notice" class="notice" hidden role="status" aria-live="polite"></div>
    <footer class="site-footer">
      <span>inSkills Academy · Permanent Make-up Quiz</span>
      <a href="#/styleguide">Design</a>
    </footer>
  `;
}

export function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  return hash.split("?")[0];
}

export function onRouteChange(callback) {
  addEventListener("hashchange", callback);
  callback();
}

export function statusLabel(status) {
  return ({
    new: "Neu",
    in_progress: "In Bearbeitung",
    done: "Fertig",
    archived: "Archiviert",
    contacted: "Kontaktiert",
    proposal: "Angebot",
    won: "Vereinbart",
    lost: "Abgeschlossen",
    blocked: "Blockiert",
  })[status] || status;
}

export function renderLogin() {
  return `
    <section class="panel narrow">
      <p class="eyebrow">Interner Bereich</p>
      <h1>Als Inhaber anmelden</h1>
      <p class="lead">Im lokalen Modus ist keine Anmeldung nötig. Dieses Formular erscheint, wenn Supabase aktiviert ist.</p>
      <form id="login-form" class="stack">
        <label>E-Mail<input name="email" type="email" autocomplete="username" required></label>
        <label>Passwort<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="button" type="submit">Im Arbeitsbereich anmelden</button>
        <p id="login-error" class="field-error" hidden></p>
      </form>
    </section>
  `;
}
