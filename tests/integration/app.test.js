import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createClient } from '../helpers/client.js';

let client;

before(async () => {
  client = await createClient();
});
after(() => client.close());

describe('tratamento de requisições fora do contrato', () => {
  it('responde 404 para rota desconhecida', async () => {
    const { status, body } = await client.request('/veiculos');

    assert.equal(status, 404);
    assert.deepEqual(body, { error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
  });

  it('responde 404 para método não previsto em rota existente', async () => {
    assert.equal((await client.request('/cars', { method: 'PATCH', body: {} })).status, 404);
  });

  it('responde 400 para corpo que não é um objeto JSON', async () => {
    const { status, body } = await client.request('/cars', {
      method: 'POST',
      rawBody: '{"plate": ',
    });

    assert.equal(status, 400);
    assert.deepEqual(body, {
      error: {
        code: 'INVALID_JSON',
        message: 'Corpo da requisição deve ser um objeto JSON válido',
      },
    });
  });

  it('responde 400 quando o corpo esperado não é enviado', async () => {
    assert.equal((await client.request('/cars', { method: 'POST' })).status, 400);
  });
});
