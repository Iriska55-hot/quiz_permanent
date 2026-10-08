import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../api/try-on.js";

const origin = "https://iriska55-hot.github.io";
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

function request({ consent = "yes", zone = "brows", effect = "natural", bytes = jpeg, type = "image/jpeg", requestOrigin = origin } = {}) {
  const form = new FormData();
  form.set("consent", consent);
  form.set("zone", zone);
  form.set("effect", effect);
  form.set("photo", new File([bytes], "portrait.jpg", { type }));
  return new Request("https://api.example.test/api/try-on", {
    method: "POST",
    headers: { Origin: requestOrigin },
    body: form,
  });
}

test("refuses image processing without explicit consent", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request({ consent: "no" }));
  assert.equal(response.status, 400);
});

test("refuses a file whose bytes do not match its image type", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request({ bytes: new Uint8Array([1, 2, 3]) }));
  assert.equal(response.status, 400);
});

test("refuses a truncated PNG header", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request({ bytes: new Uint8Array([137, 80]), type: "image/png" }));
  assert.equal(response.status, 400);
});

test("refuses requests from a different browser origin", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request({ requestOrigin: "https://other.example" }));
  assert.equal(response.status, 403);
});

test("reports missing server configuration without calling the provider", async () => {
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request());
  assert.equal(response.status, 503);
});

test("edits an approved photo and returns an uncached JPEG", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/images/edits");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.match(String(options.body.get("prompt")), /eyebrows/i);
    assert.equal(options.body.get("input_fidelity"), "high");
    assert.equal(options.body.get("output_format"), "jpeg");
    assert.ok(options.body.get("image") instanceof File);
    return Response.json({ data: [{ b64_json: Buffer.from(jpeg).toString("base64") }] });
  };

  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
});
