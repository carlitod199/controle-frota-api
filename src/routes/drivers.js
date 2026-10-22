import { Router } from 'express';
import { driverInput, driverQuery, idParams } from '../schemas.js';
import {
  createDriver,
  deleteDriver,
  getDriver,
  listDrivers,
  updateDriver,
} from '../services/drivers.js';

export const driversRouter = Router();

driversRouter.get('/', (req, res) => {
  res.json(listDrivers(driverQuery.parse(req.query)));
});

driversRouter.post('/', (req, res) => {
  res.status(201).json(createDriver(driverInput.parse(req.body)));
});

driversRouter.get('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(getDriver(id));
});

driversRouter.put('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(updateDriver(id, driverInput.parse(req.body)));
});

driversRouter.delete('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  deleteDriver(id);
  res.status(204).end();
});
