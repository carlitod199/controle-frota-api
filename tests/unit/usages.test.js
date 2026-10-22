import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCar } from '../../src/services/cars.js';
import { createDriver } from '../../src/services/drivers.js';
import { finishUsage, listUsages, startUsage } from '../../src/services/usages.js';
import { resetStore, store } from '../../src/store.js';

let car;
let otherCar;
let driver;
let otherDriver;

beforeEach(() => {
  resetStore();
  car = createCar({ plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' });
  otherCar = createCar({ plate: 'XYZ4567', color: 'Branco', brand: 'Fiat' });
  driver = createDriver({ name: 'Ana Souza' });
  otherDriver = createDriver({ name: 'Bruno Lima' });
});

const start = (overrides = {}) =>
  startUsage({ driverId: driver.id, carId: car.id, reason: 'Visita a cliente', ...overrides });

describe('startUsage', () => {
  it('registra o início com data do servidor e término nulo', () => {
    const usage = start();

    assert.equal(typeof usage.id, 'string');
    assert.equal(usage.finishedAt, null);
    assert.equal(usage.reason, 'Visita a cliente');
    assert.equal(new Date(usage.startedAt).toISOString(), usage.startedAt);
  });

  it('devolve os dados do motorista e do automóvel', () => {
    const usage = start();

    assert.deepEqual(usage.driver, { id: driver.id, name: 'Ana Souza' });
    assert.deepEqual(usage.car, {
      id: car.id,
      plate: 'ABC1D23',
      color: 'Preto',
      brand: 'Toyota',
    });
  });

  it('falha quando o automóvel não existe', () => {
    assert.throws(() => start({ carId: 'inexistente' }), { status: 404, code: 'NOT_FOUND' });
    assert.equal(store.usages.size, 0);
  });

  it('falha quando o motorista não existe', () => {
    assert.throws(() => start({ driverId: 'inexistente' }), { status: 404, code: 'NOT_FOUND' });
    assert.equal(store.usages.size, 0);
  });

  it('recusa automóvel que já está sendo utilizado por outro motorista', () => {
    start();

    assert.throws(() => start({ driverId: otherDriver.id }), { status: 409, code: 'CONFLICT' });
    assert.equal(store.usages.size, 1);
  });

  it('recusa motorista que já utiliza outro automóvel', () => {
    start();

    assert.throws(() => start({ carId: otherCar.id }), { status: 409, code: 'CONFLICT' });
    assert.equal(store.usages.size, 1);
  });

  it('recusa o mesmo motorista iniciando novamente o mesmo automóvel', () => {
    start();

    assert.throws(() => start(), { status: 409, code: 'CONFLICT' });
    assert.equal(store.usages.size, 1);
  });

  it('não permite que duas chamadas consecutivas burlem a exclusividade', () => {
    const results = [start, start].map((call) => {
      try {
        return { ok: true, usage: call() };
      } catch (error) {
        return { ok: false, status: error.status };
      }
    });

    assert.deepEqual(
      results.map((result) => result.ok),
      [true, false],
    );
    assert.equal(results[1].status, 409);
    assert.equal(store.usages.size, 1);
  });

  it('libera automóvel e motorista depois que a utilização é finalizada', () => {
    const usage = start();
    finishUsage(usage.id);

    assert.equal(start().finishedAt, null);
    assert.equal(store.usages.size, 2);
  });
});

describe('finishUsage', () => {
  it('registra o término com data não anterior ao início', () => {
    const usage = start();
    const finished = finishUsage(usage.id);

    assert.equal(finished.id, usage.id);
    assert.ok(new Date(finished.finishedAt) >= new Date(usage.startedAt));
    assert.equal(new Date(finished.finishedAt).toISOString(), finished.finishedAt);
  });

  it('falha quando a utilização não existe', () => {
    assert.throws(() => finishUsage('inexistente'), { status: 404, code: 'NOT_FOUND' });
  });

  it('recusa finalizar uma utilização já finalizada', () => {
    const usage = start();
    const finished = finishUsage(usage.id);

    assert.throws(() => finishUsage(usage.id), { status: 409, code: 'CONFLICT' });
    assert.equal(listUsages()[0].finishedAt, finished.finishedAt);
  });
});

describe('listUsages', () => {
  it('retorna lista vazia quando não há registros', () => {
    assert.deepEqual(listUsages(), []);
  });

  it('inclui em andamento e finalizadas com os dados relacionados', () => {
    const first = start();
    finishUsage(first.id);
    start({ driverId: otherDriver.id, carId: otherCar.id, reason: 'Entrega' });

    const usages = listUsages();

    assert.equal(usages.length, 2);
    assert.deepEqual(
      usages.map((usage) => [usage.driver.name, usage.car.plate, usage.finishedAt === null]),
      [
        ['Ana Souza', 'ABC1D23', false],
        ['Bruno Lima', 'XYZ4567', true],
      ],
    );
  });
});
