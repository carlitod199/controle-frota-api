import express from 'express';
import { AppError } from './errors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { carsRouter } from './routes/cars.js';
import { driversRouter } from './routes/drivers.js';
import { usagesRouter } from './routes/usages.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    if (req.get('content-type') && !req.is('application/json')) {
      return next(
        new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type deve ser application/json'),
      );
    }
    next();
  });
  app.use(express.json());

  app.use('/cars', carsRouter);
  app.use('/drivers', driversRouter);
  app.use('/usages', usagesRouter);

  app.use((req, res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada'));
  });
  app.use(errorHandler);

  return app;
}
