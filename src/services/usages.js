import { randomUUID } from 'node:crypto';
import { conflict, notFound } from '../errors.js';
import { hasUsage, store } from '../store.js';

const isOngoing = (usage) => usage.finishedAt === null;

function withRelations(usage) {
  const driver = store.drivers.get(usage.driverId);
  const car = store.cars.get(usage.carId);
  return {
    id: usage.id,
    startedAt: usage.startedAt,
    finishedAt: usage.finishedAt,
    reason: usage.reason,
    driver: { id: driver.id, name: driver.name },
    car: { id: car.id, plate: car.plate, color: car.color, brand: car.brand },
  };
}

export function listUsages() {
  return [...store.usages.values()].map(withRelations);
}

export function startUsage({ driverId, carId, reason }) {
  if (!store.cars.has(carId)) throw notFound('Automóvel não encontrado');
  if (!store.drivers.has(driverId)) throw notFound('Motorista não encontrado');

  if (hasUsage((usage) => isOngoing(usage) && usage.carId === carId)) {
    throw conflict('Automóvel já está em utilização');
  }
  if (hasUsage((usage) => isOngoing(usage) && usage.driverId === driverId)) {
    throw conflict('Motorista já está utilizando um automóvel');
  }

  const usage = {
    id: randomUUID(),
    driverId,
    carId,
    reason,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  store.usages.set(usage.id, usage);
  return withRelations(usage);
}

export function finishUsage(id) {
  const usage = store.usages.get(id);
  if (!usage) throw notFound('Utilização não encontrada');
  if (!isOngoing(usage)) throw conflict('Utilização já foi finalizada');

  const finished = { ...usage, finishedAt: new Date().toISOString() };
  store.usages.set(id, finished);
  return withRelations(finished);
}
