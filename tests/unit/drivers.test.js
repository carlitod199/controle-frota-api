import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCar } from '../../src/services/cars.js';
import {
  createDriver,
  deleteDriver,
  getDriver,
  listDrivers,
  updateDriver,
} from '../../src/services/drivers.js';
import { finishUsage, startUsage } from '../../src/services/usages.js';
import { resetStore, store } from '../../src/store.js';

beforeEach(resetStore);

describe('createDriver', () => {
  it('gera identificador e preserva o nome', () => {
    const { id, ...fields } = createDriver({ name: 'Ana Souza' });

    assert.equal(typeof id, 'string');
    assert.deepEqual(fields, { name: 'Ana Souza' });
  });
});

describe('getDriver', () => {
  it('encontra pelo identificador', () => {
    const driver = createDriver({ name: 'Ana Souza' });

    assert.deepEqual(getDriver(driver.id), driver);
  });

  it('falha quando o motorista não existe', () => {
    assert.throws(() => getDriver('inexistente'), { status: 404, code: 'NOT_FOUND' });
  });
});

describe('listDrivers', () => {
  beforeEach(() => {
    createDriver({ name: 'José Antônio' });
    createDriver({ name: 'Ana Souza' });
    createDriver({ name: 'Bruno Josefino' });
  });

  it('retorna todos quando não há filtro', () => {
    assert.equal(listDrivers().length, 3);
  });

  it('faz busca parcial ignorando caixa e acentuação', () => {
    assert.deepEqual(
      listDrivers({ name: 'jose' }).map((driver) => driver.name),
      ['José Antônio', 'Bruno Josefino'],
    );
  });

  it('aceita o nome acentuado na busca', () => {
    assert.deepEqual(
      listDrivers({ name: 'ANTÔNIO' }).map((driver) => driver.name),
      ['José Antônio'],
    );
  });

  it('retorna lista vazia quando o nome não existe', () => {
    assert.deepEqual(listDrivers({ name: 'Mariana' }), []);
  });
});

describe('updateDriver', () => {
  it('substitui o nome', () => {
    const driver = createDriver({ name: 'Ana Souza' });

    assert.deepEqual(updateDriver(driver.id, { name: 'Ana Lima' }), {
      id: driver.id,
      name: 'Ana Lima',
    });
  });

  it('falha quando o motorista não existe', () => {
    assert.throws(() => updateDriver('inexistente', { name: 'Ana' }), {
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('deleteDriver', () => {
  it('remove o motorista', () => {
    const driver = createDriver({ name: 'Ana Souza' });
    deleteDriver(driver.id);

    assert.equal(store.drivers.size, 0);
  });

  it('falha quando o motorista não existe', () => {
    assert.throws(() => deleteDriver('inexistente'), { status: 404, code: 'NOT_FOUND' });
  });

  it('recusa exclusão de motorista com utilização já finalizada', () => {
    const car = createCar({ plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' });
    const driver = createDriver({ name: 'Ana Souza' });
    const usage = startUsage({ driverId: driver.id, carId: car.id, reason: 'Visita' });
    finishUsage(usage.id);

    assert.throws(() => deleteDriver(driver.id), { status: 409, code: 'CONFLICT' });
    assert.equal(store.drivers.size, 1);
  });
});
