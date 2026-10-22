import { randomUUID } from 'node:crypto';
import { conflict, notFound } from '../errors.js';
import { hasUsage, store } from '../store.js';
import { normalizeText } from '../text.js';

function ensurePlateAvailable(plate, exceptId) {
  for (const car of store.cars.values()) {
    if (car.plate === plate && car.id !== exceptId) {
      throw conflict(`Já existe um automóvel com a placa ${plate}`);
    }
  }
}

export function getCar(id) {
  const car = store.cars.get(id);
  if (!car) throw notFound('Automóvel não encontrado');
  return car;
}

export function listCars({ color, brand } = {}) {
  let cars = [...store.cars.values()];
  if (color) {
    cars = cars.filter((car) => normalizeText(car.color) === normalizeText(color));
  }
  if (brand) {
    cars = cars.filter((car) => normalizeText(car.brand) === normalizeText(brand));
  }
  return cars;
}

export function createCar(input) {
  ensurePlateAvailable(input.plate);

  const car = { id: randomUUID(), ...input };
  store.cars.set(car.id, car);
  return car;
}

export function updateCar(id, input) {
  const car = getCar(id);
  ensurePlateAvailable(input.plate, car.id);

  const updated = { id: car.id, ...input };
  store.cars.set(car.id, updated);
  return updated;
}

export function deleteCar(id) {
  const car = getCar(id);
  if (hasUsage((usage) => usage.carId === car.id)) {
    throw conflict('Automóvel possui registros de utilização e não pode ser excluído');
  }
  store.cars.delete(car.id);
}
