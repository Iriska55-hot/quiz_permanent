import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../api/try-on.js";

const origin = "https://iriska55-hot.github.io";
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const originalFetch = globalThis.fetch;
const originalKey = process.env.PERFECTCORP_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PERFECTCORP_API_KEY;
  else process.env.PERFECTCORP_API_KEY = originalKey;
});

function request({ consent = "yes", zone = "brows", effect = "natural", shade = "medium", bytes = jpeg, type = "image/jpeg", requestOrigin = origin } = {}) {
  const form = new FormData();
  form.set("consent", consent);
  form.set("zone", zone);
  form.set("effect", effect);
  form.set("shade", shade);
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

test("refuses an unknown shade before contacting the provider", async () => {
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  assert.equal((await POST(request({ shade: "unknown" }))).status, 400);
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
  delete process.env.PERFECTCORP_API_KEY;
  globalThis.fetch = () => { throw new Error("Unexpected provider call"); };
  const response = await POST(request());
  assert.equal(response.status, 503);
});

test("uploads an approved photo, requests brows only, and returns the result without caching", async () => {
  process.env.PERFECTCORP_API_KEY = "test-key";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options]);
    if (calls.length === 1) return Response.json({ status: 200, data: { files: [{ file_id: "photo-id", requests: [{ method: "PUT", url: "https://yce-us.s3-accelerate.amazonaws.com/test-upload", headers: { "Content-Type": "image/jpeg" } }] }] } });
    if (calls.length === 2) return new Response(null, { status: 200 });
    if (calls.length === 3) return Response.json({ status: 200, data: { task_id: "task-id" } });
    if (calls.length === 4) return Response.json({ status: 200, data: { task_status: "success", results: { url: "https://yce-us.s3-accelerate.amazonaws.com/test-result" } } });
    if (calls.length === 5) return new Response(jpeg, { status: 200, headers: { "content-type": "application/octet-stream" } });
    throw new Error("Unexpected request");
  };

  const response = await POST(request());
  assert.equal(calls.length, 5);
  assert.equal(calls[0][0], "https://yce-api-01.makeupar.com/s2s/v2.0/file");
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-key");
  assert.equal(calls[1][0], "https://yce-us.s3-accelerate.amazonaws.com/test-upload");
  assert.equal(calls[1][1].method, "PUT");
  assert.deepEqual(new Uint8Array(calls[1][1].body), jpeg);
  assert.equal(calls[2][0], "https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto");
  const task = JSON.parse(calls[2][1].body);
  assert.equal(task.src_file_id, "photo-id");
  assert.deepEqual(task.effects.map((effect) => effect.category), ["eyebrows"]);
  assert.equal(task.effects[0].palettes[0].color, "#604735");
  assert.equal(calls[3][0], "https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto/task-id");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
});
