import { once } from 'node:events';
import { createApp } from '../../src/app.js';

export async function createClient() {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    base,
    async request(path, { method = 'GET', body, rawBody, headers } = {}) {
      const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
        body: payload,
      });
      const text = await response.text();
      return {
        status: response.status,
        headers: response.headers,
        body: text ? JSON.parse(text) : null,
      };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
