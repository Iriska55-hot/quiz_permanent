export const quiz = {
  name: "inSkills Academy",
  eyebrow: "Permanent Make-up Quiz",
  title: "Wie könnte Permanent Make-up an Ihnen aussehen?",
  lead: "Beantworten Sie drei kurze Fragen zu Ihrem gewünschten Look. Danach wählen Sie ein eigenes Foto aus und sehen eine persönliche Vorschau für Augenbrauen, Lippen oder Lidstriche.",
  startCta: "Quiz starten",
  questions: [
    {
      id: "bottleneck",
      title: "Welcher Bereich interessiert Sie?",
      options: [
        { label: "Augenbrauen", scores: { content: 10 } },
        { label: "Lippen", scores: { sales: 10 } },
        { label: "Augen – Lidstriche", scores: { operations: 10 } },
      ],
    },
    {
      id: "input",
      title: "Wie sichtbar soll der Look sein?",
      options: [
        { label: "Möglichst natürlich", scores: {} },
        { label: "Sichtbar, aber dezent", scores: {} },
        { label: "Ausdrucksstark", scores: {} },
      ],
    },
    {
      id: "shade",
      title: "Welcher Farbton gefällt Ihnen für die Vorschau?",
      optionsByZone: [
        ["Hellbraun", "Mittelbraun", "Dunkelbraun"],
        ["Nude-Rosé", "Rosé", "Beerenton"],
        ["Braun", "Anthrazit", "Schwarz"],
      ],
    },
  ],
  results: {
    content: {
      title: "Augenbrauen – Ihre Wahl",
      text: "Sie interessieren sich für Permanent Make-up der Augenbrauen. Bei der Beratung können Sie Form, Farbton und Techniken wie Powder Brows oder Ombre Brows ansprechen. Das Quiz ersetzt keine persönliche Einschätzung.",
      action: "Für einen Termin mit 20 % Rabatt schreiben Sie per WhatsApp an +49 175 8221111. Nennen Sie dabei die Augenbrauen.",
    },
    sales: {
      title: "Lippen – Ihre Wahl",
      text: "Sie interessieren sich für Permanent Make-up der Lippen. Bei der Beratung können Sie Farbton, Kontur und Techniken wie Aquarell Lips ansprechen. Das Quiz ersetzt keine persönliche Einschätzung.",
      action: "Für einen Termin mit 20 % Rabatt schreiben Sie per WhatsApp an +49 175 8221111. Nennen Sie dabei die Lippen.",
    },
    operations: {
      title: "Lidstriche – Ihre Wahl",
      text: "Sie interessieren sich für Permanent Make-up der Augenlider. Bei der Beratung können Sie Wimpernkranzverdichtung oder klassische und weiche Lidstriche ansprechen. Das Quiz ersetzt keine persönliche Einschätzung.",
      action: "Für einen Termin mit 20 % Rabatt schreiben Sie per WhatsApp an +49 175 8221111. Nennen Sie dabei die Lidstriche.",
    },
  },
};

export function questionOptions(question, answers) {
  if (question.options) return question.options;
  return (question.optionsByZone?.[answers.bottleneck] || []).map((label) => ({ label, scores: {} }));
}
