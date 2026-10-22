const allowedOrigins = new Set([
  "https://iriska55-hot.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

const zones = new Set(["brows", "lips", "eyeliner"]);
const effects = { natural: 25, balanced: 45, expressive: 65 };
const colors = {
  brows: { light: "#80634E", medium: "#604735", dark: "#3C2B25" },
  lips: { light: "#B8787C", medium: "#A85561", dark: "#854454" },
  eyeliner: { light: "#5A4034", medium: "#3D3D43", dark: "#202025" },
};
const providerBase = "https://yce-api-01.makeupar.com/s2s/v2.0";

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
  if (type === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

function makeupEffect(zone, intensity, shade) {
  const color = colors[zone][shade];
  if (zone === "brows") return { category: "eyebrows", pattern: { type: "color" }, palettes: [{ color, colorIntensity: intensity, texture: "matte" }] };
  if (zone === "lips") return { category: "lip_color", shape: { name: "original" }, style: { type: "full" }, morphology: { fullness: 0, wrinkless: 0 }, palettes: [{ color, texture: "matte", colorIntensity: intensity }] };
  return { category: "eye_liner", pattern: { name: "Arabic3" }, palettes: [{ color, texture: "matte", colorIntensity: intensity }] };
}

async function providerJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status !== 200 || !body.data) {
    const error = new Error('Provider request failed');
    error.providerCode = typeof body.error_code === 'string' ? body.error_code.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80) : `HTTP${response.status}`;
    throw error;
  }
  return body.data;
}

function trustedFileUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".amazonaws.com")) throw new Error("Untrusted file URL");
    return url.href;
  } catch {
    throw new Error("Untrusted file URL");
  }
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
  const shade = form.get("shade");
  if (!zones.has(zone) || !Object.hasOwn(effects, effect) || !Object.hasOwn(colors[zone] || {}, shade)) {
    return errorResponse("Bitte wählen Sie einen gültigen Bereich, Effekt und Farbton.", 400, origin);
  }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > maxPhotoBytes) {
    return errorResponse("Bitte wählen Sie ein Foto bis 3 MB.", 400, origin);
  }

  const imageBytes = new Uint8Array(await photo.arrayBuffer());
  if (!isImage(imageBytes, photo.type)) return errorResponse("Bitte wählen Sie ein JPG- oder PNG-Foto.", 400, origin);

  const apiKey = process.env.PERFECTCORP_API_KEY;
  if (!apiKey) return errorResponse("Die Foto-Verarbeitung ist noch nicht eingerichtet.", 503, origin);
  const authorization = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  let stage = 'upload-target';
  try {
    const file = (await providerJson(`${providerBase}/file`, {
      method: "POST", headers: authorization,
      body: JSON.stringify({ files: [{ content_type: photo.type, file_name: photo.type === "image/png" ? "portrait.png" : "portrait.jpg", file_size: photo.size }] }),
    })).files?.[0];
    if (!file?.file_id || !file.requests?.[0]) throw new Error("Missing upload target");
    const upload = file.requests[0];
    stage = 'upload';
    if (upload.method !== "PUT") throw new Error("Unsupported upload method");
    const uploadResponse = await fetch(trustedFileUrl(upload.url), {
      method: "PUT", headers: upload.headers, body: imageBytes,
      signal: AbortSignal.timeout(20_000),
    });
    if (!uploadResponse.ok) throw new Error("Upload failed");

    stage = 'create-task';
    const task = await providerJson(`${providerBase}/task/makeup-vto`, {
      method: "POST", headers: authorization,
      body: JSON.stringify({ src_file_id: file.file_id, version: "1.0", effects: [makeupEffect(zone, effects[effect], shade)] }),
    });
    if (!task.task_id) throw new Error("Missing task ID");
    stage = 'poll-task';
    for (let attempt = 0; attempt < 30; attempt++) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 2_000));
      const status = await providerJson(`${providerBase}/task/makeup-vto/${encodeURIComponent(task.task_id)}`, {
        method: "GET", headers: { Authorization: authorization.Authorization },
      });
      if (status.task_status === "error") throw new Error("Processing failed");
      if (status.task_status !== "success") continue;
      stage = 'download-result';
      const resultUrl = trustedFileUrl(status.results?.url || status.results?.[0]?.download_url);
      const result = await fetch(resultUrl, { signal: AbortSignal.timeout(20_000) });
      if (!result.ok || Number(result.headers.get("content-length")) > maxResultBytes) throw new Error("Result download failed");
      const output = new Uint8Array(await result.arrayBuffer());
      const type = ['image/jpeg', 'image/png', 'image/webp'].find(type => isImage(output, type));
      if (!output.length || output.length > maxResultBytes || !type) throw new Error("Invalid result image");
      return new Response(output, { status: 200, headers: { ...headers(origin), "content-type": type } });
    }
    throw new Error("Processing timed out");
  } catch (error) {
    console.error('Try-on failed:', stage, error.providerCode || error.message);
    return errorResponse("Der Beispiel-Look konnte nicht erstellt werden. Bitte versuchen Sie es erneut.", 502, origin);
  }
}
