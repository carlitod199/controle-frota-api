import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { AppError, conflict, notFound } from '../../src/errors.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';

function fakeResponse() {
  const sent = {};
  return {
    sent,
    status(code) {
      sent.status = code;
      return this;
    },
    json(payload) {
      sent.payload = payload;
      return this;
    },
  };
}

const handle = (error) => {
  const res = fakeResponse();
  errorHandler(error, {}, res, () => {});
  return res.sent;
};

describe('errorHandler', () => {
  it('traduz erro de validação indicando o campo', () => {
    const schema = z.strictObject({ color: z.string() });
    const error = schema.safeParse({ color: 1 }).error;

    assert.deepEqual(handle(error), {
      status: 400,
      payload: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: [{ field: 'color', message: error.issues[0].message }],
        },
      },
    });
  });

  it('informa campo nulo quando o erro não pertence a um campo específico', () => {
    const error = z.strictObject({}).safeParse({ extra: 1 }).error;

    assert.equal(handle(error).payload.error.details[0].field, null);
  });

  it('responde 400 para JSON malformado', () => {
    const error = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
    });

    assert.deepEqual(handle(error), {
      status: 400,
      payload: {
        error: {
          code: 'INVALID_JSON',
          message: 'Corpo da requisição deve ser um objeto JSON válido',
        },
      },
    });
  });

  it('usa o status e o código definidos no erro da aplicação', () => {
    assert.deepEqual(handle(notFound('Automóvel não encontrado')), {
      status: 404,
      payload: { error: { code: 'NOT_FOUND', message: 'Automóvel não encontrado' } },
    });

    assert.deepEqual(handle(conflict('Automóvel já está em utilização')), {
      status: 409,
      payload: { error: { code: 'CONFLICT', message: 'Automóvel já está em utilização' } },
    });

    assert.equal(handle(new AppError(422, 'CUSTOM', 'mensagem')).status, 422);
  });

  it('não expõe detalhes de erros inesperados', (t) => {
    const logged = t.mock.method(console, 'error', () => {});
    const error = new Error('conexão com o banco falhou em /etc/segredo');

    assert.deepEqual(handle(error), {
      status: 500,
      payload: { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
    });
    assert.equal(logged.mock.callCount(), 1);
    assert.equal(logged.mock.calls[0].arguments[0], error);
  });
});
