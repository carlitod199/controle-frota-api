import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { carInput, carQuery, driverInput, driverQuery, usageInput } from './schemas.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function toJsonSchema(schema) {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input' });
  delete jsonSchema.$schema;
  return jsonSchema;
}

function queryParameters(schema) {
  const { properties, required = [] } = toJsonSchema(schema);
  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: propertySchema,
  }));
}

const capitalize = (text) => text[0].toUpperCase() + text.slice(1);

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema) => ({ content: { 'application/json': { schema } } });

const resource = (description, name) => ({ description, ...jsonBody(ref(name)) });
const list = (description, name) => ({
  description,
  ...jsonBody({ type: 'array', items: ref(name) }),
});
const failure = (description) => ({ description, ...jsonBody(ref('Error')) });

const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador do recurso, em UUID',
  schema: { type: 'string', format: 'uuid' },
};

const invalidId = failure('Identificador não é um UUID válido');
const unsupportedMediaType = failure('Content-Type não é application/json');

function crudPaths({ path, tag, schema, input, query, labels }) {
  const createResponses = {
    201: resource(`${capitalize(labels.singular)} cadastrado`, schema),
    400: failure('Dados fora do contrato'),
    415: unsupportedMediaType,
  };
  if (labels.createConflict) {
    createResponses[409] = failure(labels.createConflict);
  }

  return {
    [path]: {
      get: {
        tags: [tag],
        summary: `Listar ${labels.plural}`,
        description:
          'Um filtro sem resultados responde 200 com lista vazia. Parâmetros não documentados são recusados com 400.',
        parameters: queryParameters(query),
        responses: {
          200: list(`Lista de ${labels.plural}`, schema),
          400: failure('Parâmetro de consulta desconhecido ou inválido'),
        },
      },
      post: {
        tags: [tag],
        summary: `Cadastrar ${labels.singular}`,
        requestBody: { required: true, ...jsonBody(toJsonSchema(input)) },
        responses: createResponses,
      },
    },
    [`${path}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Consultar ${labels.singular}`,
        parameters: [idParameter],
        responses: {
          200: resource(`${capitalize(labels.singular)} encontrado`, schema),
          400: invalidId,
          404: failure(`${capitalize(labels.singular)} não encontrado`),
        },
      },
      put: {
        tags: [tag],
        summary: `Atualizar ${labels.singular}`,
        description: 'Substituição completa: todos os campos são obrigatórios.',
        parameters: [idParameter],
        requestBody: { required: true, ...jsonBody(toJsonSchema(input)) },
        responses: {
          200: resource(`${capitalize(labels.singular)} atualizado`, schema),
          400: failure('Dados fora do contrato ou identificador inválido'),
          404: failure(`${capitalize(labels.singular)} não encontrado`),
          ...(labels.createConflict ? { 409: failure(labels.createConflict) } : {}),
          415: unsupportedMediaType,
        },
      },
      delete: {
        tags: [tag],
        summary: `Excluir ${labels.singular}`,
        parameters: [idParameter],
        responses: {
          204: { description: 'Excluído, sem corpo de resposta' },
          400: invalidId,
          404: failure(`${capitalize(labels.singular)} não encontrado`),
          409: failure(labels.deleteConflict),
        },
      },
    },
  };
}

const usagePaths = {
  '/usages': {
    get: {
      tags: ['Utilizações'],
      summary: 'Listar utilizações',
      description:
        'Inclui as em andamento e as encerradas, com o nome do motorista e a placa, a cor e a marca do automóvel. Os dados do motorista e do automóvel refletem o cadastro atual.',
      responses: {
        200: list('Lista de utilizações', 'Usage'),
        400: failure('Parâmetro de consulta desconhecido'),
      },
    },
    post: {
      tags: ['Utilizações'],
      summary: 'Iniciar utilização',
      description:
        'O servidor define startedAt. Enviar datas no corpo é recusado com 400. Um automóvel ou motorista com utilização em andamento é recusado com 409.',
      requestBody: { required: true, ...jsonBody(toJsonSchema(usageInput)) },
      responses: {
        201: resource('Utilização iniciada', 'Usage'),
        400: failure('Dados fora do contrato'),
        404: failure('Automóvel ou motorista não encontrado'),
        409: failure('Automóvel ou motorista já está em uma utilização em andamento'),
        415: unsupportedMediaType,
      },
    },
  },
  '/usages/{id}/finish': {
    patch: {
      tags: ['Utilizações'],
      summary: 'Finalizar utilização',
      description:
        'Sem corpo: o servidor registra finishedAt. Qualquer campo enviado é recusado com 400.',
      parameters: [idParameter],
      responses: {
        200: resource('Utilização finalizada', 'Usage'),
        400: failure('Identificador inválido ou corpo não vazio'),
        404: failure('Utilização não encontrada'),
        409: failure('Utilização já foi finalizada'),
      },
    },
  },
};

const schemas = {
  Car: {
    type: 'object',
    required: ['id', 'plate', 'color', 'brand'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      plate: { type: 'string', examples: ['ABC1D23'] },
      color: { type: 'string', examples: ['Preto'] },
      brand: { type: 'string', examples: ['Toyota'] },
    },
  },
  Driver: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', examples: ['Ana Souza'] },
    },
  },
  Usage: {
    type: 'object',
    required: ['id', 'startedAt', 'finishedAt', 'reason', 'driver', 'car'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      startedAt: { type: 'string', format: 'date-time' },
      finishedAt: {
        type: ['string', 'null'],
        format: 'date-time',
        description: 'Nulo enquanto a utilização está em andamento',
      },
      reason: { type: 'string', examples: ['Visita a cliente'] },
      driver: ref('Driver'),
      car: ref('Car'),
    },
  },
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', examples: ['CONFLICT'] },
          message: { type: 'string' },
          details: {
            type: 'array',
            description: 'Presente apenas quando o código é VALIDATION_ERROR',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: {
                  type: ['string', 'null'],
                  description: 'Nulo quando o problema não pertence a um campo específico',
                },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

export const openapiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Controle de Frota — API',
    version,
    description:
      'Controle de utilização de automóveis por motoristas. Um automóvel não pode ser usado por dois motoristas ao mesmo tempo, e um motorista não pode usar dois automóveis ao mesmo tempo.',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/', description: 'A própria origem desta documentação' }],
  tags: [{ name: 'Automóveis' }, { name: 'Motoristas' }, { name: 'Utilizações' }],
  paths: {
    ...crudPaths({
      path: '/cars',
      tag: 'Automóveis',
      schema: 'Car',
      input: carInput,
      query: carQuery,
      labels: {
        singular: 'automóvel',
        plural: 'automóveis',
        createConflict: 'Já existe um automóvel com a placa informada',
        deleteConflict: 'O automóvel possui registros de utilização',
      },
    }),
    ...crudPaths({
      path: '/drivers',
      tag: 'Motoristas',
      schema: 'Driver',
      input: driverInput,
      query: driverQuery,
      labels: {
        singular: 'motorista',
        plural: 'motoristas',
        deleteConflict: 'O motorista possui registros de utilização',
      },
    }),
    ...usagePaths,
  },
  components: { schemas },
};
