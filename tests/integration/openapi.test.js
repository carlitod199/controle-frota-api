import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { openapiDocument } from '../../src/openapi.js';
import { carsRouter } from '../../src/routes/cars.js';
import { driversRouter } from '../../src/routes/drivers.js';
import { usagesRouter } from '../../src/routes/usages.js';
import { resetStore } from '../../src/store.js';
import { createClient } from '../helpers/client.js';

const mountedRouters = [
  ['/cars', carsRouter],
  ['/drivers', driversRouter],
  ['/usages', usagesRouter],
];

function registeredOperations() {
  return mountedRouters
    .flatMap(([prefix, router]) =>
      router.stack
        .filter((layer) => layer.route)
        .flatMap((layer) => {
          const suffix =
            layer.route.path === '/' ? '' : layer.route.path.replace(/:(\w+)/g, '{$1}');
          return Object.keys(layer.route.methods).map(
            (method) => `${method.toUpperCase()} ${prefix}${suffix}`,
          );
        }),
    )
    .sort();
}

function documentedOperations() {
  return Object.entries(openapiDocument.paths)
    .flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    )
    .sort();
}

function assertMatchesSchema(value, schema, label) {
  const documented = Object.keys(schema.properties);

  for (const key of Object.keys(value)) {
    assert.ok(documented.includes(key), `${label}: o campo "${key}" não está no spec`);
  }
  for (const key of schema.required) {
    assert.ok(key in value, `${label}: o spec exige "${key}", que não veio na resposta`);
  }
}

let client;

before(async () => {
  client = await createClient();
});
after(() => client.close());
beforeEach(resetStore);

const corolla = { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' };
const { Car, Driver, Usage, Error: ErrorSchema } = openapiDocument.components.schemas;

describe('o spec descreve exatamente as rotas registradas', () => {
  it('documenta toda operação registrada e nenhuma a mais', () => {
    assert.deepEqual(documentedOperations(), registeredOperations());
  });

  it('declara um identificador de caminho para cada rota com {id}', () => {
    for (const [path, operations] of Object.entries(openapiDocument.paths)) {
      if (!path.includes('{id}')) continue;

      for (const [method, operation] of Object.entries(operations)) {
        const names = (operation.parameters ?? []).map((parameter) => parameter.name);
        assert.ok(
          names.includes('id'),
          `${method.toUpperCase()} ${path} não declara o parâmetro id`,
        );
      }
    }
  });
});

describe('o spec é servido pela própria aplicação', () => {
  it('expõe o documento em /openapi.json', async () => {
    const { status, body } = await client.request('/openapi.json');

    assert.equal(status, 200);
    assert.equal(body.openapi, '3.1.0');
    assert.equal(body.info.version, openapiDocument.info.version);
  });

  it('serve a interface do Swagger em /docs', async () => {
    const response = await fetch(`${client.base}/docs/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /swagger-ui/);
  });
});

describe('os schemas documentados descrevem as respostas reais', () => {
  it('Car corresponde ao automóvel devolvido', async () => {
    const { body } = await client.request('/cars', { method: 'POST', body: corolla });

    assertMatchesSchema(body, Car, 'Car');
  });

  it('Driver corresponde ao motorista devolvido', async () => {
    const { body } = await client.request('/drivers', {
      method: 'POST',
      body: { name: 'Ana Souza' },
    });

    assertMatchesSchema(body, Driver, 'Driver');
  });

  it('Usage corresponde à utilização devolvida, com motorista e automóvel aninhados', async () => {
    const { body: car } = await client.request('/cars', { method: 'POST', body: corolla });
    const { body: driver } = await client.request('/drivers', {
      method: 'POST',
      body: { name: 'Ana Souza' },
    });
    const { body: usage } = await client.request('/usages', {
      method: 'POST',
      body: { driverId: driver.id, carId: car.id, reason: 'Visita a cliente' },
    });

    assertMatchesSchema(usage, Usage, 'Usage');
    assertMatchesSchema(usage.driver, Driver, 'Usage.driver');
    assertMatchesSchema(usage.car, Car, 'Usage.car');
  });

  it('Error corresponde ao erro de conflito', async () => {
    await client.request('/cars', { method: 'POST', body: corolla });
    const { body } = await client.request('/cars', { method: 'POST', body: corolla });

    assertMatchesSchema(body, ErrorSchema, 'Error');
    assertMatchesSchema(body.error, ErrorSchema.properties.error, 'Error.error');
  });

  it('Error corresponde ao erro de validação, com details por campo', async () => {
    const { body } = await client.request('/cars', { method: 'POST', body: { plate: 'AB' } });

    assertMatchesSchema(body.error, ErrorSchema.properties.error, 'Error.error');
    for (const detail of body.error.details) {
      assertMatchesSchema(detail, ErrorSchema.properties.error.properties.details.items, 'detail');
    }
  });
});
