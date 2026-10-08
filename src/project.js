export const quiz = {
  name: "inSkills Academy",
  eyebrow: "Permanent Make-up Quiz",
  title: "Welcher Bereich interessiert Sie?",
  lead: "Wählen Sie Augenbrauen, Lippen oder Lidstriche und beantworten Sie fünf kurze Fragen. So können Sie Ihre Wünsche für das Gespräch mit der Fachkraft besser beschreiben.",
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
      id: "frequency",
      title: "Hatten Sie schon einmal Permanent Make-up?",
      options: [
        { label: "Nein, das wäre mein erstes Mal", scores: {} },
        { label: "Ja, ich möchte das Ergebnis auffrischen", scores: {} },
        { label: "Ja, ich wünsche mir diesmal einen anderen Look", scores: {} },
      ],
    },
    {
      id: "input",
      title: "Welcher Look gefällt Ihnen am besten?",
      options: [
        { label: "Möglichst natürlich", scores: {} },
        { label: "Sichtbar, aber dezent", scores: {} },
        { label: "Ausdrucksstark", scores: {} },
      ],
    },
    {
      id: "risk",
      title: "Was ist Ihnen besonders wichtig?",
      options: [
        { label: "Zeit beim Schminken sparen", scores: {} },
        { label: "Meine Gesichtszüge betonen", scores: {} },
        { label: "Ein früheres Ergebnis korrigieren", scores: {} },
      ],
    },
    {
      id: "goal",
      title: "Was möchten Sie bei der Beratung besprechen?",
      options: [
        { label: "Die passende Form", scores: {} },
        { label: "Farbe und Intensität", scores: {} },
        { label: "Ob sich altes Permanent Make-up auffrischen lässt", scores: {} },
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
