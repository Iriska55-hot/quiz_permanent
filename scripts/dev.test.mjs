import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from './dev.mjs';

test('serves the app, protects private files and forwards a photo request to its handler', async () => {
  const server = createAppServer(async request => {
    const form = await request.formData();
    assert.equal(form.get('consent'), 'yes');
    assert.equal(form.get('photo').size, 4);
    return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base)).status, 200);
    for (const path of ['/.env', '/.git/config', '/api/try-on.js', '/scripts/dev.mjs', '/src/.env']) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    const form = new FormData();
    form.set('consent', 'yes');
    form.set('photo', new File(['test'], 'face.png', { type: 'image/png' }));
    const response = await fetch(base + '/api/try-on', { method: 'POST', body: form });
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([137, 80, 78, 71]));
    assert.equal((await fetch(base + '/api/try-on')).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
