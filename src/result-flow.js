export function getResultStage({ photoReady, resultReady, offerOpen }) {
  if (!photoReady) return "photo";
  if (!resultReady) return "photo-ready";
  return offerOpen ? "offer" : "photo-ready";
}

export function whatsappUrl(zone) {
  const message = `Hallo, ich interessiere mich für Permanent Make-up im Bereich ${zone}. Ich möchte die Aktion mit 20 % Rabatt nutzen: 240 € statt 299 €. Bitte teilen Sie mir die Bedingungen mit.`;
  return `https://wa.me/491758221111?text=${encodeURIComponent(message)}`;
}
