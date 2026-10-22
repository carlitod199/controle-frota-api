import { Router } from 'express';
import { emptyBody, idParams, usageInput, usageQuery } from '../schemas.js';
import { finishUsage, listUsages, startUsage } from '../services/usages.js';

export const usagesRouter = Router();

usagesRouter.get('/', (req, res) => {
  usageQuery.parse(req.query);
  res.json(listUsages());
});

usagesRouter.post('/', (req, res) => {
  res.status(201).json(startUsage(usageInput.parse(req.body)));
});

usagesRouter.patch('/:id/finish', (req, res) => {
  const { id } = idParams.parse(req.params);
  emptyBody.parse(req.body);
  res.json(finishUsage(id));
});
