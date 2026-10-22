import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { carInput, carQuery, driverInput, idParams, usageInput } from '../../src/schemas.js';

const uuid = '0f1b4b4a-2a9a-4f2f-9f2a-6c6f1b4b4a2a';

describe('carInput', () => {
  it('normaliza a placa removendo separadores e aplicando maiúsculas', () => {
    assert.equal(
      carInput.parse({ plate: 'abc-1d23', color: 'Preto', brand: 'Toyota' }).plate,
      'ABC1D23',
    );
  });

  it('apara espaços de cor e marca', () => {
    const car = carInput.parse({ plate: 'ABC1D23', color: '  Preto ', brand: ' Toyota  ' });

    assert.deepEqual(car, { plate: 'ABC1D23', color: 'Preto', brand: 'Toyota' });
  });

  it('aceita os formatos antigo e Mercosul', () => {
    const parse = (plate) => carInput.parse({ plate, color: 'Preto', brand: 'Toyota' }).plate;

    assert.equal(parse('ABC1234'), 'ABC1234');
    assert.equal(parse('ABC1D23'), 'ABC1D23');
    assert.equal(parse('abc 1d23'), 'ABC1D23');
  });

  it('recusa placas fora do formato de emplacamento', () => {
    const reject = (plate) =>
      assert.throws(
        () => carInput.parse({ plate, color: 'Preto', brand: 'Toyota' }),
        new RegExp('Placa deve seguir o formato'),
        `deveria recusar ${JSON.stringify(plate)}`,
      );

    reject('ABC123');
    reject('ABC12345');
    reject('1234567');
    reject('AAAAAAA');
    reject('A.B.C.1.2.3.4');
    reject('1ABC234');
  });

  it('exige cor e marca preenchidas', () => {
    assert.throws(() => carInput.parse({ plate: 'ABC1D23', color: '   ', brand: 'Toyota' }));
    assert.throws(() => carInput.parse({ plate: 'ABC1D23', color: 'Preto' }));
  });

  it('recusa campos desconhecidos', () => {
    assert.throws(() =>
      carInput.parse({ plate: 'ABC1D23', color: 'Preto', brand: 'Toyota', year: 2020 }),
    );
  });
});

describe('driverInput', () => {
  it('apara o nome', () => {
    assert.equal(driverInput.parse({ name: '  Ana Souza ' }).name, 'Ana Souza');
  });

  it('recusa nome com menos de dois caracteres', () => {
    assert.throws(() => driverInput.parse({ name: 'A' }));
    assert.throws(() => driverInput.parse({ name: '' }));
  });

  it('recusa nome que não é texto', () => {
    assert.throws(() => driverInput.parse({ name: 42 }));
  });
});

describe('usageInput', () => {
  it('aceita identificadores válidos e motivo preenchido', () => {
    assert.deepEqual(usageInput.parse({ driverId: uuid, carId: uuid, reason: ' Visita ' }), {
      driverId: uuid,
      carId: uuid,
      reason: 'Visita',
    });
  });

  it('recusa identificadores que não são UUID', () => {
    assert.throws(() => usageInput.parse({ driverId: '1', carId: uuid, reason: 'Visita' }));
  });

  it('recusa motivo vazio', () => {
    assert.throws(() => usageInput.parse({ driverId: uuid, carId: uuid, reason: '  ' }));
  });

  it('não aceita que o cliente informe as datas', () => {
    assert.throws(() =>
      usageInput.parse({
        driverId: uuid,
        carId: uuid,
        reason: 'Visita',
        startedAt: '2020-01-01T00:00:00.000Z',
      }),
    );
  });
});

describe('carQuery', () => {
  it('aceita ausência de filtros', () => {
    assert.deepEqual(carQuery.parse({}), {});
  });

  it('recusa parâmetros de consulta desconhecidos', () => {
    assert.throws(() => carQuery.parse({ cor: 'Preto' }));
  });
});

describe('idParams', () => {
  it('aceita UUID', () => {
    assert.deepEqual(idParams.parse({ id: uuid }), { id: uuid });
  });

  it('normaliza UUID em maiúsculas, que é equivalente ao minúsculo', () => {
    assert.deepEqual(idParams.parse({ id: uuid.toUpperCase() }), { id: uuid });
  });

  it('recusa identificador malformado', () => {
    assert.throws(() => idParams.parse({ id: 'abc' }));
  });
});
