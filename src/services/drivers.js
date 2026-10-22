import { randomUUID } from 'node:crypto';
import { conflict, notFound } from '../errors.js';
import { hasUsage, store } from '../store.js';
import { normalizeText } from '../text.js';

export function getDriver(id) {
  const driver = store.drivers.get(id);
  if (!driver) throw notFound('Motorista não encontrado');
  return driver;
}

export function listDrivers({ name } = {}) {
  const drivers = [...store.drivers.values()];
  if (!name) return drivers;

  const search = normalizeText(name);
  return drivers.filter((driver) => normalizeText(driver.name).includes(search));
}

export function createDriver(input) {
  const driver = { id: randomUUID(), ...input };
  store.drivers.set(driver.id, driver);
  return driver;
}

export function updateDriver(id, input) {
  const driver = getDriver(id);

  const updated = { id: driver.id, ...input };
  store.drivers.set(driver.id, updated);
  return updated;
}

export function deleteDriver(id) {
  const driver = getDriver(id);
  if (hasUsage((usage) => usage.driverId === driver.id)) {
    throw conflict('Motorista possui registros de utilização e não pode ser excluído');
  }
  store.drivers.delete(driver.id);
}
