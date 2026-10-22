import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCar, deleteCar, getCar, listCars, updateCar } from '../../src/services/cars.js';
import { createDriver } from '../../src/services/drivers.js';
import { finishUsage, startUsage } from '../../src/services/usages.js';
import { resetStore, store } from '../../src/store.js';

const corolla = { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' };
const uno = { plate: 'XYZ4567', color: 'Branco', brand: 'Fiat' };

beforeEach(resetStore);

describe('createCar', () => {
  it('gera identificador e preserva os campos recebidos', () => {
    const { id, ...fields } = createCar(corolla);

    assert.equal(typeof id, 'string');
    assert.deepEqual(fields, corolla);
    assert.equal(store.cars.size, 1);
  });

  it('recusa placa já cadastrada', () => {
    createCar(corolla);

    assert.throws(() => createCar({ ...corolla, color: 'Azul' }), {
      status: 409,
      code: 'CONFLICT',
    });
    assert.equal(store.cars.size, 1);
  });
});

describe('getCar', () => {
  it('encontra pelo identificador', () => {
    const car = createCar(corolla);

    assert.deepEqual(getCar(car.id), car);
  });

  it('falha quando o automóvel não existe', () => {
    assert.throws(() => getCar('inexistente'), { status: 404, code: 'NOT_FOUND' });
  });
});

describe('listCars', () => {
  beforeEach(() => {
    createCar(corolla);
    createCar(uno);
    createCar({ plate: 'QRS8901', color: 'Preto', brand: 'Fiat' });
  });

  it('retorna todos quando não há filtro', () => {
    assert.equal(listCars().length, 3);
  });

  it('filtra por cor ignorando a caixa', () => {
    assert.deepEqual(
      listCars({ color: 'pReTo' }).map((car) => car.plate),
      ['ABC1D23', 'QRS8901'],
    );
  });

  it('filtra por marca', () => {
    assert.deepEqual(
      listCars({ brand: 'fiat' }).map((car) => car.plate),
      ['XYZ4567', 'QRS8901'],
    );
  });

  it('combina cor e marca', () => {
    assert.deepEqual(
      listCars({ color: 'Preto', brand: 'Fiat' }).map((car) => car.plate),
      ['QRS8901'],
    );
  });

  it('retorna lista vazia quando nenhum automóvel atende ao filtro', () => {
    assert.deepEqual(listCars({ color: 'Roxo' }), []);
  });
});

describe('updateCar', () => {
  it('substitui os campos do automóvel', () => {
    const car = createCar(corolla);
    const updated = updateCar(car.id, uno);

    assert.deepEqual(updated, { id: car.id, ...uno });
    assert.deepEqual(getCar(car.id), updated);
  });

  it('permite manter a própria placa', () => {
    const car = createCar(corolla);

    assert.equal(updateCar(car.id, { ...corolla, color: 'Cinza' }).color, 'Cinza');
  });

  it('recusa placa pertencente a outro automóvel', () => {
    const car = createCar(corolla);
    createCar(uno);

    assert.throws(() => updateCar(car.id, uno), { status: 409, code: 'CONFLICT' });
    assert.equal(getCar(car.id).plate, 'ABC1D23');
  });

  it('falha quando o automóvel não existe', () => {
    assert.throws(() => updateCar('inexistente', corolla), { status: 404, code: 'NOT_FOUND' });
  });
});

describe('deleteCar', () => {
  it('remove o automóvel', () => {
    const car = createCar(corolla);
    deleteCar(car.id);

    assert.equal(store.cars.size, 0);
  });

  it('falha quando o automóvel não existe', () => {
    assert.throws(() => deleteCar('inexistente'), { status: 404, code: 'NOT_FOUND' });
  });

  it('recusa exclusão de automóvel com utilização em andamento', () => {
    const car = createCar(corolla);
    const driver = createDriver({ name: 'Ana' });
    startUsage({ driverId: driver.id, carId: car.id, reason: 'Visita' });

    assert.throws(() => deleteCar(car.id), { status: 409, code: 'CONFLICT' });
    assert.equal(store.cars.size, 1);
  });

  it('recusa exclusão de automóvel com utilização já finalizada', () => {
    const car = createCar(corolla);
    const driver = createDriver({ name: 'Ana' });
    const usage = startUsage({ driverId: driver.id, carId: car.id, reason: 'Visita' });
    finishUsage(usage.id);

    assert.throws(() => deleteCar(car.id), { status: 409, code: 'CONFLICT' });
  });
});
