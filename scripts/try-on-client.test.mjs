import test from 'node:test';
import assert from 'node:assert/strict';
import { createTryOn } from '../src/try-on-client.js';

test('requires consent, maps answers and prevents concurrent duplicate requests', async () => {
  let complete;
  let count = 0;
  const client = createTryOn(async (_url, { body }) => {
    count++;
    assert.equal(body.get('zone'), 'lips');
    assert.equal(body.get('effect'), 'expressive');
    assert.equal(body.get('shade'), 'dark');
    return new Promise(resolve => { complete = resolve; });
  });
  const input = { photo: new File(['photo'], 'face.png', { type: 'image/png' }), resultKey: 'sales', answers: { input: 2, shade: 2 }, consent: false };
  await assert.rejects(client.submit(input), /bestätigen/);
  assert.equal(count, 0);
  input.consent = true;
  const first = client.submit(input);
  const second = client.submit(input);
  assert.equal(count, 1);
  complete(new Response(new Blob(['result'], { type: 'image/png' })));
  const [a, b] = await Promise.all([first, second]);
  assert.equal(await a.text(), 'result');
  assert.equal(a, b);
});

test('surfaces errors and allows retry without replacing the photo or answers', async () => {
  let fail = true;
  const client = createTryOn(async () => fail
    ? Response.json({ error: 'Bitte ein frontales Foto wählen.' }, { status: 502 })
    : new Response(new Blob(['result'], { type: 'image/jpeg' })));
  const input = { photo: new File(['photo'], 'face.jpg'), resultKey: 'content', answers: { input: 0, shade: 0 }, consent: true };
  await assert.rejects(client.submit(input), /frontales Foto/);
  fail = false;
  assert.equal((await client.submit(input)).type, 'image/jpeg');
});
