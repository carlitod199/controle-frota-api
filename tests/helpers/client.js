import { once } from 'node:events';
import { createApp } from '../../src/app.js';

export async function createClient() {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    async request(path, { method = 'GET', body, rawBody } = {}) {
      const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));
      const response = await fetch(base + path, {
        method,
        headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
        body: payload,
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
