import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { resetStore } from '../../src/store.js';
import { createClient } from '../helpers/client.js';

const unknownId = '0f1b4b4a-2a9a-4f2f-9f2a-6c6f1b4b4a2a';

let client;
let car;
let otherCar;
let driver;
let otherDriver;

before(async () => {
  client = await createClient();
});
after(() => client.close());

beforeEach(async () => {
  resetStore();
  const post = async (path, body) => (await client.request(path, { method: 'POST', body })).body;
  car = await post('/cars', { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' });
  otherCar = await post('/cars', { plate: 'XYZ4567', color: 'Branco', brand: 'Fiat' });
  driver = await post('/drivers', { name: 'Ana Souza' });
  otherDriver = await post('/drivers', { name: 'Bruno Lima' });
});

const start = (body) => client.request('/usages', { method: 'POST', body });
const startDefault = () =>
  start({ driverId: driver.id, carId: car.id, reason: 'Visita a cliente' });
const finish = (id) => client.request(`/usages/${id}/finish`, { method: 'PATCH' });

describe('POST /usages', () => {
  it('responde 201 com a utilização em andamento e os dados relacionados', async () => {
    const { status, body } = await startDefault();

    assert.equal(status, 201);
    assert.equal(body.finishedAt, null);
    assert.equal(body.reason, 'Visita a cliente');
    assert.equal(new Date(body.startedAt).toISOString(), body.startedAt);
    assert.deepEqual(body.driver, { id: driver.id, name: 'Ana Souza' });
    assert.deepEqual(body.car, { id: car.id, plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' });
  });

  it('recusa com 400 a data de término enviada pelo cliente', async () => {
    const { status } = await start({
      driverId: driver.id,
      carId: car.id,
      reason: 'Visita',
      finishedAt: '2020-01-01T00:00:00.000Z',
    });

    assert.equal(status, 400);
  });

  it('responde 404 quando o automóvel não existe', async () => {
    const { status, body } = await start({
      driverId: driver.id,
      carId: unknownId,
      reason: 'Visita',
    });

    assert.equal(status, 404);
    assert.equal(body.error.message, 'Automóvel não encontrado');
  });

  it('responde 404 quando o motorista não existe', async () => {
    const { status, body } = await start({
      driverId: unknownId,
      carId: car.id,
      reason: 'Visita',
    });

    assert.equal(status, 404);
    assert.equal(body.error.message, 'Motorista não encontrado');
  });

  it('responde 409 quando o automóvel já está em utilização', async () => {
    await startDefault();
    const { status, body } = await start({
      driverId: otherDriver.id,
      carId: car.id,
      reason: 'Outra',
    });

    assert.equal(status, 409);
    assert.equal(body.error.message, 'Automóvel já está em utilização');
    assert.equal((await client.request('/usages')).body.length, 1);
  });

  it('responde 409 quando o motorista já utiliza outro automóvel', async () => {
    await startDefault();
    const { status, body } = await start({
      driverId: driver.id,
      carId: otherCar.id,
      reason: 'Outra',
    });

    assert.equal(status, 409);
    assert.equal(body.error.message, 'Motorista já está utilizando um automóvel');
  });

  it('mantém a exclusividade quando duas requisições chegam em paralelo', async () => {
    const responses = await Promise.all([startDefault(), startDefault()]);

    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal((await client.request('/usages')).body.length, 1);
  });

  it('responde 400 para identificadores que não são UUID', async () => {
    const { status, body } = await start({ driverId: '1', carId: '2', reason: 'Visita' });

    assert.equal(status, 400);
    assert.deepEqual(body.error.details.map((detail) => detail.field).sort(), [
      'carId',
      'driverId',
    ]);
  });
});

describe('PATCH /usages/:id/finish', () => {
  it('finaliza e registra o término com data do servidor', async () => {
    const { body: usage } = await startDefault();
    const { status, body } = await finish(usage.id);

    assert.equal(status, 200);
    assert.equal(body.id, usage.id);
    assert.ok(new Date(body.finishedAt) >= new Date(usage.startedAt));
  });

  it('responde 404 para utilização inexistente', async () => {
    const { status, body } = await finish(unknownId);

    assert.equal(status, 404);
    assert.equal(body.error.message, 'Utilização não encontrada');
  });

  it('responde 400 para identificador malformado', async () => {
    assert.equal((await finish('123')).status, 400);
  });

  it('responde 409 ao finalizar duas vezes, preservando o primeiro término', async () => {
    const { body: usage } = await startDefault();
    const { body: finished } = await finish(usage.id);
    const { status, body } = await finish(usage.id);

    assert.equal(status, 409);
    assert.equal(body.error.message, 'Utilização já foi finalizada');
    assert.equal((await client.request('/usages')).body[0].finishedAt, finished.finishedAt);
  });

  it('libera automóvel e motorista para uma nova utilização', async () => {
    const { body: usage } = await startDefault();
    await finish(usage.id);

    assert.equal((await startDefault()).status, 201);
  });
});

describe('GET /usages', () => {
  it('responde 200 com lista vazia quando não há registros', async () => {
    const { status, body } = await client.request('/usages');

    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  it('lista utilizações com nome do motorista e placa, cor e marca do automóvel', async () => {
    const { body: first } = await startDefault();
    await finish(first.id);
    await start({ driverId: otherDriver.id, carId: otherCar.id, reason: 'Entrega' });

    const { body } = await client.request('/usages');

    assert.deepEqual(
      body.map((usage) => ({
        driver: usage.driver.name,
        car: [usage.car.plate, usage.car.color, usage.car.brand],
        ongoing: usage.finishedAt === null,
      })),
      [
        { driver: 'Ana Souza', car: ['ABC1D23', 'Preto', 'Toyota'], ongoing: false },
        { driver: 'Bruno Lima', car: ['XYZ4567', 'Branco', 'Fiat'], ongoing: true },
      ],
    );
  });

  it('responde 400 para parâmetro de consulta desconhecido', async () => {
    assert.equal((await client.request('/usages?status=ongoing')).status, 400);
  });
});

describe('exclusão de recursos com histórico de utilização', () => {
  it('recusa excluir o automóvel e o mantém consultável', async () => {
    await startDefault();
    const { status, body } = await client.request(`/cars/${car.id}`, { method: 'DELETE' });

    assert.equal(status, 409);
    assert.equal(
      body.error.message,
      'Automóvel possui registros de utilização e não pode ser excluído',
    );
    assert.equal((await client.request(`/cars/${car.id}`)).status, 200);
  });

  it('recusa excluir o motorista e o mantém consultável', async () => {
    const { body: usage } = await startDefault();
    await finish(usage.id);
    const { status, body } = await client.request(`/drivers/${driver.id}`, { method: 'DELETE' });

    assert.equal(status, 409);
    assert.equal(
      body.error.message,
      'Motorista possui registros de utilização e não pode ser excluído',
    );
    assert.equal((await client.request(`/drivers/${driver.id}`)).status, 200);
  });

  it('mantém a listagem de utilizações íntegra depois das exclusões recusadas', async () => {
    await startDefault();
    await client.request(`/cars/${car.id}`, { method: 'DELETE' });
    await client.request(`/drivers/${driver.id}`, { method: 'DELETE' });

    const { body } = await client.request('/usages');

    assert.equal(body.length, 1);
    assert.equal(body[0].car.plate, 'ABC1D23');
    assert.equal(body[0].driver.name, 'Ana Souza');
  });
});
