import { ZodError } from 'zod';
import { AppError } from '../errors.js';

const bodyParserErrors = {
  'entity.parse.failed': {
    status: 400,
    code: 'INVALID_JSON',
    message: 'Corpo da requisição deve ser um objeto JSON válido',
  },
  'entity.too.large': {
    status: 413,
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Corpo da requisição excede o tamanho máximo aceito',
  },
  'charset.unsupported': {
    status: 415,
    code: 'UNSUPPORTED_CHARSET',
    message: 'Charset não suportado; envie o corpo em UTF-8',
  },
  'encoding.unsupported': {
    status: 415,
    code: 'UNSUPPORTED_ENCODING',
    message: 'Content-Encoding não suportado',
  },
};

const respond = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

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

  if (error instanceof AppError) {
    return respond(res, error.status, error.code, error.message);
  }

  const bodyError = bodyParserErrors[error.type];
  if (bodyError) {
    return respond(res, bodyError.status, bodyError.code, bodyError.message);
  }

  if (error.expose && error.status >= 400 && error.status < 500) {
    return respond(res, error.status, 'BAD_REQUEST', 'Não foi possível processar a requisição');
  }

  console.error(error);
  return respond(res, 500, 'INTERNAL_ERROR', 'Erro interno do servidor');
}
