import { carInput, driverInput, usageInput } from './schemas.js';
import { createCar } from './services/cars.js';
import { createDriver } from './services/drivers.js';
import { startUsage } from './services/usages.js';

export function seedDemoData() {
  const corolla = createCar(carInput.parse({ plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' }));
  createCar(carInput.parse({ plate: 'XYZ4567', color: 'Branco', brand: 'Fiat' }));

  const ana = createDriver(driverInput.parse({ name: 'Ana Souza' }));
  createDriver(driverInput.parse({ name: 'Bruno Lima' }));

  startUsage(usageInput.parse({ driverId: ana.id, carId: corolla.id, reason: 'Visita a cliente' }));
}
