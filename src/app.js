import express from 'express';
import { AppError } from './errors.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada'));
  });
  app.use(errorHandler);

  return app;
}
