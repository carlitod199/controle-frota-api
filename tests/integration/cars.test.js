import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { resetStore } from '../../src/store.js';
import { createClient } from '../helpers/client.js';

const corolla = { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' };
const uno = { plate: 'XYZ4567', color: 'Branco', brand: 'Fiat' };
const unknownId = '0f1b4b4a-2a9a-4f2f-9f2a-6c6f1b4b4a2a';

let client;

before(async () => {
  client = await createClient();
});
after(() => client.close());
beforeEach(resetStore);

const postCar = (body) => client.request('/cars', { method: 'POST', body });

describe('POST /cars', () => {
  it('cadastra e responde 201 com o recurso criado', async () => {
    const { status, body } = await postCar({ plate: 'abc 1d23', color: 'Preto', brand: 'Toyota' });

    assert.equal(status, 201);
    assert.deepEqual({ ...body, id: undefined }, { ...corolla, id: undefined });
    assert.equal(typeof body.id, 'string');
  });

  it('responde 400 com os campos inválidos quando faltam dados', async () => {
    const { status, body } = await postCar({ plate: 'AB' });

    assert.equal(status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(body.error.details.map((detail) => detail.field).sort(), [
      'brand',
      'color',
      'plate',
    ]);
  });

  it('responde 400 para campo desconhecido no corpo', async () => {
    const { status, body } = await postCar({ ...corolla, year: 2020 });

    assert.equal(status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('responde 409 para placa repetida', async () => {
    await postCar(corolla);
    const { status, body } = await postCar({ ...corolla, color: 'Azul' });

    assert.equal(status, 409);
    assert.equal(body.error.code, 'CONFLICT');
  });
});

describe('GET /cars', () => {
  beforeEach(async () => {
    await postCar(corolla);
    await postCar(uno);
    await postCar({ plate: 'QRS8901', color: 'Preto', brand: 'Fiat' });
  });

  it('lista todos os automóveis', async () => {
    const { status, body } = await client.request('/cars');

    assert.equal(status, 200);
    assert.equal(body.length, 3);
  });

  it('filtra por cor', async () => {
    const { body } = await client.request('/cars?color=preto');

    assert.deepEqual(
      body.map((car) => car.plate),
      ['ABC1D23', 'QRS8901'],
    );
  });

  it('filtra por marca e cor combinadas', async () => {
    const { body } = await client.request('/cars?color=Preto&brand=Fiat');

    assert.deepEqual(
      body.map((car) => car.plate),
      ['QRS8901'],
    );
  });

  it('responde 200 com lista vazia quando o filtro não encontra nada', async () => {
    const { status, body } = await client.request('/cars?color=Roxo');

    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  it('responde 400 para parâmetro de consulta desconhecido', async () => {
    const { status, body } = await client.request('/cars?cor=Preto');

    assert.equal(status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});

describe('GET /cars/:id', () => {
  it('consulta pelo identificador', async () => {
    const { body: created } = await postCar(corolla);
    const { status, body } = await client.request(`/cars/${created.id}`);

    assert.equal(status, 200);
    assert.deepEqual(body, created);
  });

  it('responde 404 para identificador inexistente', async () => {
    const { status, body } = await client.request(`/cars/${unknownId}`);

    assert.equal(status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  it('encontra o automóvel com o identificador em maiúsculas', async () => {
    const { body: created } = await postCar(corolla);
    const { status, body } = await client.request(`/cars/${created.id.toUpperCase()}`);

    assert.equal(status, 200);
    assert.deepEqual(body, created);
  });

  it('responde 400 para identificador malformado', async () => {
    const { status, body } = await client.request('/cars/123');

    assert.equal(status, 400);
    assert.deepEqual(body.error.details, [
      { field: 'id', message: 'Identificador deve ser um UUID válido' },
    ]);
  });
});

describe('PUT /cars/:id', () => {
  it('atualiza o automóvel', async () => {
    const { body: created } = await postCar(corolla);
    const { status, body } = await client.request(`/cars/${created.id}`, {
      method: 'PUT',
      body: uno,
    });

    assert.equal(status, 200);
    assert.deepEqual(body, { id: created.id, ...uno });
  });

  it('responde 404 quando o automóvel não existe', async () => {
    const { status } = await client.request(`/cars/${unknownId}`, { method: 'PUT', body: uno });

    assert.equal(status, 404);
  });

  it('responde 400 quando o corpo está incompleto', async () => {
    const { body: created } = await postCar(corolla);
    const { status } = await client.request(`/cars/${created.id}`, {
      method: 'PUT',
      body: { color: 'Azul' },
    });

    assert.equal(status, 400);
  });
});

describe('DELETE /cars/:id', () => {
  it('exclui e responde 204 sem corpo', async () => {
    const { body: created } = await postCar(corolla);
    const { status, body } = await client.request(`/cars/${created.id}`, { method: 'DELETE' });

    assert.equal(status, 204);
    assert.equal(body, null);
    assert.equal((await client.request(`/cars/${created.id}`)).status, 404);
  });

  it('responde 404 quando o automóvel não existe', async () => {
    const { status } = await client.request(`/cars/${unknownId}`, { method: 'DELETE' });

    assert.equal(status, 404);
  });
});
