import { ZodError } from 'zod';
import { AppError } from '../errors.js';

export function errorHandler(error, req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.') || null,
          message: issue.message,
        })),
      },
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Corpo da requisição deve ser um objeto JSON válido',
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  console.error(error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  });
}
