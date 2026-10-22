import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { resetStore } from '../../src/store.js';
import { createClient } from '../helpers/client.js';

let client;

before(async () => {
  client = await createClient();
});
after(() => client.close());
beforeEach(resetStore);

const corolla = { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' };

describe('erros de protocolo não viram 500', () => {
  it('responde 413 quando o corpo excede o limite do parser', async () => {
    const { status, body } = await client.request('/cars', {
      method: 'POST',
      body: { ...corolla, color: 'x'.repeat(200000) },
    });

    assert.equal(status, 413);
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  it('responde 415 para charset não suportado', async () => {
    const { status, body } = await client.request('/cars', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=latin1' },
      rawBody: JSON.stringify(corolla),
    });

    assert.equal(status, 415);
    assert.equal(body.error.code, 'UNSUPPORTED_CHARSET');
  });

  it('responde 415 para Content-Type que não é JSON', async () => {
    const { status, body } = await client.request('/cars', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      rawBody: 'plate=ABC1D23',
    });

    assert.equal(status, 415);
    assert.deepEqual(body, {
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type deve ser application/json',
      },
    });
  });

  it('responde 4xx quando o corpo não está na codificação declarada', async () => {
    const { status, body } = await client.request('/cars', {
      method: 'POST',
      headers: { 'content-encoding': 'gzip' },
      rawBody: 'isto-nao-e-gzip',
    });

    assert.equal(status, 400);
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  it('não expõe o servidor no cabeçalho X-Powered-By', async () => {
    const { headers } = await client.request('/cars');

    assert.equal(headers.get('x-powered-by'), null);
  });
});
