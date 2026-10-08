import { renderShell } from "./ui.js";

export function renderStyleguide(activePath = "/styleguide") {
  renderShell({
    title: "Design – inSkills Academy",
    nav: [
      { href: "#/", label: "Startseite", active: false },
      { href: "#/workspace", label: "Ergebnisse", active: false },
      { href: "#/styleguide", label: "Design", active: true },
    ],
    content: `
      <section class="section">
        <div class="container">
          <p class="eyebrow">DESIGN_SYSTEM.md</p>
          <h1 style="font-size:clamp(38px,6vw,64px)">Design des Projekts</h1>
          <p class="lead">Hier sehen Sie die verwendeten Farben, Abstände und Elemente auf einen Blick.</p>

          <div class="style-row">
            <strong>Farben</strong>
            <div class="swatches">
              <div class="swatch" style="background:#0d0b09;color:#f8f4eb">Hintergrund</div>
              <div class="swatch" style="background:#1b1712;color:#f8f4eb">Karte</div>
              <div class="swatch" style="background:#f8f4eb;color:#0d0b09">Text</div>
              <div class="swatch" style="background:#f3d47a;color:#0d0b09">Akzent</div>
              <div class="swatch" style="background:#f0a8a0;color:#0d0b09">Fehler</div>
            </div>
          </div>

          <div class="style-row">
            <strong>Schaltflächen</strong>
            <div class="inline">
              <button class="button">Hauptaktion</button>
              <button class="button button--secondary">Weitere Aktion</button>
              <button class="button button--danger">Kritische Aktion</button>
            </div>
          </div>

          <div class="style-row">
            <strong>Felder</strong>
            <div class="stack" style="max-width:520px">
              <label>Feldname<input value="Beispielwert"></label>
              <label>Kommentar<textarea>Ein kurzer Beispieltext zeigt Zeilenhöhe und Umbrüche.</textarea></label>
              <p class="field-error">Bitte korrigieren Sie Ihre Eingabe.</p>
            </div>
          </div>

          <div class="style-row">
            <strong>Karte</strong>
            <article class="card" style="max-width:560px">
              <span class="badge">In Bearbeitung</span>
              <h3 style="margin-top:14px">Eine klare Aussage</h3>
              <p class="muted">Die Karte ergänzt die wichtigste Aktion auf der Seite.</p>
            </article>
          </div>
        </div>
      </section>
    `,
  });
}
