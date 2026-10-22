export const store = {
  cars: new Map(),
  drivers: new Map(),
  usages: new Map(),
};

export function hasUsage(predicate) {
  for (const usage of store.usages.values()) {
    if (predicate(usage)) return true;
  }
  return false;
}

export function resetStore() {
  store.cars.clear();
  store.drivers.clear();
  store.usages.clear();
}
