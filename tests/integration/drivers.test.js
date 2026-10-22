import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { resetStore } from '../../src/store.js';
import { createClient } from '../helpers/client.js';

const unknownId = '0f1b4b4a-2a9a-4f2f-9f2a-6c6f1b4b4a2a';

let client;

before(async () => {
  client = await createClient();
});
after(() => client.close());
beforeEach(resetStore);

const postDriver = (body) => client.request('/drivers', { method: 'POST', body });

describe('POST /drivers', () => {
  it('cadastra e responde 201 com o recurso criado', async () => {
    const { status, body } = await postDriver({ name: '  Ana Souza ' });

    assert.equal(status, 201);
    assert.equal(body.name, 'Ana Souza');
    assert.equal(typeof body.id, 'string');
  });

  it('responde 400 quando o nome é curto demais', async () => {
    const { status, body } = await postDriver({ name: 'A' });

    assert.equal(status, 400);
    assert.deepEqual(
      body.error.details.map((detail) => detail.field),
      ['name'],
    );
  });

  it('responde 400 quando o nome não é texto', async () => {
    assert.equal((await postDriver({ name: 10 })).status, 400);
  });
});

describe('GET /drivers', () => {
  beforeEach(async () => {
    await postDriver({ name: 'José Antônio' });
    await postDriver({ name: 'Ana Souza' });
  });

  it('lista todos os motoristas', async () => {
    const { status, body } = await client.request('/drivers');

    assert.equal(status, 200);
    assert.equal(body.length, 2);
  });

  it('faz busca parcial sem distinguir caixa ou acentuação', async () => {
    const { body } = await client.request('/drivers?name=jose');

    assert.deepEqual(
      body.map((driver) => driver.name),
      ['José Antônio'],
    );
  });

  it('responde 200 com lista vazia quando o nome não existe', async () => {
    const { status, body } = await client.request('/drivers?name=Mariana');

    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  it('responde 400 para parâmetro de consulta desconhecido', async () => {
    assert.equal((await client.request('/drivers?nome=Ana')).status, 400);
  });
});

describe('GET, PUT e DELETE /drivers/:id', () => {
  it('consulta pelo identificador', async () => {
    const { body: created } = await postDriver({ name: 'Ana Souza' });
    const { status, body } = await client.request(`/drivers/${created.id}`);

    assert.equal(status, 200);
    assert.deepEqual(body, created);
  });

  it('atualiza o nome', async () => {
    const { body: created } = await postDriver({ name: 'Ana Souza' });
    const { status, body } = await client.request(`/drivers/${created.id}`, {
      method: 'PUT',
      body: { name: 'Ana Lima' },
    });

    assert.equal(status, 200);
    assert.deepEqual(body, { id: created.id, name: 'Ana Lima' });
  });

  it('exclui e responde 204', async () => {
    const { body: created } = await postDriver({ name: 'Ana Souza' });

    assert.equal(
      (await client.request(`/drivers/${created.id}`, { method: 'DELETE' })).status,
      204,
    );
    assert.equal((await client.request(`/drivers/${created.id}`)).status, 404);
  });

  it('responde 404 para identificador inexistente', async () => {
    assert.equal((await client.request(`/drivers/${unknownId}`)).status, 404);
    assert.equal(
      (await client.request(`/drivers/${unknownId}`, { method: 'PUT', body: { name: 'Ana' } }))
        .status,
      404,
    );
    assert.equal((await client.request(`/drivers/${unknownId}`, { method: 'DELETE' })).status, 404);
  });

  it('responde 400 para identificador malformado', async () => {
    assert.equal((await client.request('/drivers/123')).status, 400);
  });
});
