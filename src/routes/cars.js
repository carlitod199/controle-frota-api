import { Router } from 'express';
import { carInput, carQuery, idParams } from '../schemas.js';
import { createCar, deleteCar, getCar, listCars, updateCar } from '../services/cars.js';

export const carsRouter = Router();

carsRouter.get('/', (req, res) => {
  res.json(listCars(carQuery.parse(req.query)));
});

carsRouter.post('/', (req, res) => {
  res.status(201).json(createCar(carInput.parse(req.body)));
});

carsRouter.get('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(getCar(id));
});

carsRouter.put('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(updateCar(id, carInput.parse(req.body)));
});

carsRouter.delete('/:id', (req, res) => {
  const { id } = idParams.parse(req.params);
  deleteCar(id);
  res.status(204).end();
});
