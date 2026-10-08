const allowedOrigins = new Set([
  "https://iriska55-hot.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

const zones = {
  brows: "eyebrows: add realistic permanent makeup to the eyebrows only",
  lips: "lips: add realistic permanent makeup to the lips only",
  eyeliner: "eyes: add subtle permanent eyeliner to the upper lash lines only",
};

const effects = {
  natural: "very natural and soft",
  balanced: "visible but restrained",
  expressive: "more expressive while still realistic",
};

const maxPhotoBytes = 3 * 1024 * 1024;
const maxResultBytes = 4 * 1024 * 1024;

function headers(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}

function errorResponse(message, status, origin) {
  return Response.json({ error: message }, { status, headers: headers(origin) });
}

function isImage(bytes, type) {
  if (type === "image/jpeg") return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (type === "image/webp") {
    return bytes.length >= 12 && Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString() === "WEBP";
  }
  return false;
}

export async function OPTIONS(request) {
  const origin = request.headers.get("origin");
  if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: headers(origin) });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (!allowedOrigins.has(origin)) return new Response(null, { status: 403 });

  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > 4 * 1024 * 1024) return errorResponse("Das Foto ist zu groß.", 413, origin);

  let form;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Die Anfrage konnte nicht gelesen werden.", 400, origin);
  }

  if (form.get("consent") !== "yes") return errorResponse("Bitte bestätigen Sie die Bildverarbeitung.", 400, origin);

  const zone = form.get("zone");
  const effect = form.get("effect");
  if (!Object.hasOwn(zones, zone) || !Object.hasOwn(effects, effect)) {
    return errorResponse("Bitte wählen Sie einen gültigen Bereich und Effekt.", 400, origin);
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > maxPhotoBytes) {
    return errorResponse("Bitte wählen Sie ein Foto bis 3 MB.", 400, origin);
  }

  const imageBytes = new Uint8Array(await photo.arrayBuffer());
  if (!isImage(imageBytes, photo.type)) return errorResponse("Bitte wählen Sie ein JPG-, PNG- oder WebP-Foto.", 400, origin);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse("Die Foto-Verarbeitung ist noch nicht eingerichtet.", 503, origin);

  const providerForm = new FormData();
  providerForm.set("model", "gpt-image-1.5");
  providerForm.set("image", new File([imageBytes], "portrait", { type: photo.type }));
  providerForm.set("prompt", `Edit this exact portrait. ${zones[zone]}. Desired effect: ${effects[effect]}. Preserve the person's identity, facial geometry, skin texture, expression, hair, clothing, lighting and background. Do not change any other facial area. Create a plausible cosmetic visualization, not a guarantee of a procedure result.`);
  providerForm.set("input_fidelity", "high");
  providerForm.set("output_format", "jpeg");
  providerForm.set("output_compression", "75");
  providerForm.set("quality", "medium");
  providerForm.set("size", "1024x1024");

  let providerResponse;
  try {
    providerResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: providerForm,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    return errorResponse("Die Foto-Verarbeitung ist vorübergehend nicht erreichbar.", 502, origin);
  }

  if (!providerResponse.ok) return errorResponse("Der Beispiel-Look konnte nicht erstellt werden.", 502, origin);

  let encoded;
  try {
    encoded = (await providerResponse.json()).data?.[0]?.b64_json;
  } catch {
    return errorResponse("Die Antwort der Foto-Verarbeitung ist ungültig.", 502, origin);
  }
  if (typeof encoded !== "string") return errorResponse("Die Antwort der Foto-Verarbeitung ist ungültig.", 502, origin);

  const output = Buffer.from(encoded, "base64");
  if (!output.length || output.length > maxResultBytes || !isImage(output, "image/jpeg")) {
    return errorResponse("Das Ergebnis konnte nicht angezeigt werden.", 502, origin);
  }

  return new Response(output, { status: 200, headers: { ...headers(origin), "content-type": "image/jpeg" } });
}
