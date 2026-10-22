import { z } from 'zod';

z.config(z.locales.ptBR());

const uuid = (message) => z.uuid(message).transform((value) => value.toLowerCase());

const nonEmptyText = (max) => z.string().trim().min(1).max(max);

const plate = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
  .refine(
    (value) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(value),
    'Placa deve seguir o formato ABC1234 ou ABC1D23',
  );

export const idParams = z.strictObject({
  id: uuid('Identificador deve ser um UUID válido'),
});

export const carInput = z.strictObject({
  plate,
  color: nonEmptyText(40),
  brand: nonEmptyText(60),
});

export const carQuery = z.strictObject({
  color: nonEmptyText(40).optional(),
  brand: nonEmptyText(60).optional(),
});

export const driverInput = z.strictObject({
  name: z.string().trim().min(2).max(120),
});

export const driverQuery = z.strictObject({
  name: nonEmptyText(120).optional(),
});

export const usageInput = z.strictObject({
  driverId: uuid('driverId deve ser um UUID válido'),
  carId: uuid('carId deve ser um UUID válido'),
  reason: nonEmptyText(240),
});

export const usageQuery = z.strictObject({});

export const emptyBody = z.strictObject({}).optional();
