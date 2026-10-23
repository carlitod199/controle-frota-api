# Controle de Frota — API

WebAPI REST para controlar a utilização de automóveis por motoristas: cadastro de automóveis e
motoristas, registro de início e término de utilizações e consulta do histórico com os dados do
motorista e do automóvel.


## Requisitos

- Node.js 22 ou superior (desenvolvido e validado em v24.18.0)
- npm 10 ou superior (validado em 11.16.0)


## Instalação

```bash
npm install
```

## Execução

```bash
npm start          # http://localhost:3000
npm run dev        # mesmo processo, com reinício automático (node --watch)
npm run start:demo # inicia já com alguns dados de exemplo carregados
```

A porta pode ser alterada com a variável `PORT`:

```bash
PORT=4000 npm start
```

## Documentação interativa

Com a aplicação no ar:

- **<http://localhost:3000/docs>** — interface do Swagger, com "Try it out" para disparar as
  requisições de dentro da página
- **<http://localhost:3000/openapi.json>** — o documento OpenAPI 3.1, para importar no Postman,
  Insomnia, Bruno ou gerar um cliente

A combinação `npm run start:demo` + `/docs` é o caminho mais rápido para inspecionar a API: já há
dados cadastrados para listar e uma utilização em andamento para finalizar.

## Testes

```bash
npm test                 # todos os testes (135)
npm run test:unit        # apenas unidade (66)
npm run test:integration # apenas integração (69)
npm run test:coverage    # relatório de cobertura
```

Os testes usam o runner nativo do Node (`node:test`), sem framework adicional.

- **Unidade** (`tests/unit/`): regras de negócio, validação e tradução de erros, chamando os módulos
  diretamente, sem HTTP.
- **Integração** (`tests/integration/`): sobe a aplicação em uma porta efêmera e exercita
  HTTP → validação → regras → armazenamento com requisições reais.

Cada teste começa de um armazenamento limpo (`resetStore()` em `beforeEach`), então a ordem de
execução não influencia o resultado.

O relatório de cobertura exclui os próprios arquivos de teste (`--test-coverage-exclude`) e lista
apenas os módulos que os testes carregam. `src/server.js` e `src/demoData.js` não aparecem porque
nenhum teste os importa — ver "Limitações conhecidas".

## Lint e formatação

```bash
npm run lint         # ESLint
npm run lint:fix
npm run format:check # Prettier (verificação)
npm run format       # Prettier (aplica)
```

## Estrutura do projeto

```
src/
  server.js                   ponto de entrada: lê a porta e começa a ouvir
  app.js                      monta o Express, as rotas e o tratamento de erros
  store.js                    armazenamento em memória (3 Maps) e consulta de utilizações
  schemas.js                  validação e normalização da entrada (Zod)
  openapi.js                  gera o documento OpenAPI a partir dos schemas
  errors.js                   erro da aplicação com status HTTP e código
  text.js                     normalização de texto usada pelos filtros
  demoData.js                 carga opcional de dados de demonstração
  routes/                     protocolo HTTP: lê a requisição, delega, responde
  services/                   regras de negócio de automóveis, motoristas e utilizações
  middlewares/errorHandler.js converte erros em respostas padronizadas

tests/
  unit/                       regras e validação, sem HTTP
  integration/                requisições HTTP reais contra a aplicação
  helpers/client.js           sobe a aplicação em porta efêmera e faz requisições
```

## Rotas

| Método | Rota                 | Finalidade                            | Sucesso |
| ------ | -------------------- | ------------------------------------- | ------- |
| POST   | `/cars`              | Cadastrar automóvel                   | 201     |
| GET    | `/cars`              | Listar automóveis (filtros opcionais) | 200     |
| GET    | `/cars/:id`          | Consultar automóvel                   | 200     |
| PUT    | `/cars/:id`          | Atualizar automóvel                   | 200     |
| DELETE | `/cars/:id`          | Excluir automóvel                     | 204     |
| POST   | `/drivers`           | Cadastrar motorista                   | 201     |
| GET    | `/drivers`           | Listar motoristas (filtro opcional)   | 200     |
| GET    | `/drivers/:id`       | Consultar motorista                   | 200     |
| PUT    | `/drivers/:id`       | Atualizar motorista                   | 200     |
| DELETE | `/drivers/:id`       | Excluir motorista                     | 204     |
| POST   | `/usages`            | Iniciar utilização                    | 201     |
| PATCH  | `/usages/:id/finish` | Finalizar utilização                  | 200     |
| GET    | `/usages`            | Listar utilizações                    | 200     |
| GET    | `/openapi.json`      | Documento OpenAPI 3.1                 | 200     |
| GET    | `/docs`              | Interface do Swagger                  | 200     |



### Parâmetros de consulta

| Rota       | Parâmetro | Comportamento                                   |
| ---------- | --------- | ----------------------------------------------- |
| `/cars`    | `color`   | Igualdade, ignorando caixa e acentuação         |
| `/cars`    | `brand`   | Igualdade, ignorando caixa e acentuação         |
| `/drivers` | `name`    | Busca **parcial**, ignorando caixa e acentuação |

`color` e `brand` podem ser combinados e se aplicam em conjunto (E lógico). Um filtro que não
encontra nada responde `200` com lista vazia, não `404`. Parâmetros de consulta não documentados
são rejeitados com `400`.

## Exemplos

### Cadastrar automóvel

```bash
curl -X POST http://localhost:3000/cars \
  -H 'content-type: application/json' \
  -d '{"plate":"abc-1d23","color":"Preto","brand":"Toyota"}'
```

```json
{
  "id": "262af635-40ac-41f0-8593-d932b578a3b5",
  "plate": "ABC1D23",
  "color": "Preto",
  "brand": "Toyota"
}
```

A placa é normalizada: separadores são removidos e as letras viram maiúsculas.

### Cadastrar motorista

```bash
curl -X POST http://localhost:3000/drivers \
  -H 'content-type: application/json' \
  -d '{"name":"Ana Souza"}'
```

```json
{ "id": "4b2ffec5-f1f9-4b40-b26a-8c87f7c0b9a4", "name": "Ana Souza" }
```

### Iniciar utilização

```bash
curl -X POST http://localhost:3000/usages \
  -H 'content-type: application/json' \
  -d '{"driverId":"4b2ffec5-...","carId":"262af635-...","reason":"Visita a cliente"}'
```

```json
{
  "id": "c38322c9-37e4-44bc-bdd3-4d569db9aed3",
  "startedAt": "2026-10-22T21:41:04.684Z",
  "finishedAt": null,
  "reason": "Visita a cliente",
  "driver": { "id": "4b2ffec5-f1f9-4b40-b26a-8c87f7c0b9a4", "name": "Ana Souza" },
  "car": {
    "id": "262af635-40ac-41f0-8593-d932b578a3b5",
    "plate": "ABC1D23",
    "color": "Preto",
    "brand": "Toyota"
  }
}
```

### Finalizar utilização

```bash
curl -X PATCH http://localhost:3000/usages/c38322c9-.../finish
```



### Listar utilizações

`GET /usages` devolve um array no mesmo formato acima, com `finishedAt` preenchido nas utilizações
já encerradas, incluindo o nome do motorista e a placa, a cor e a marca do automóvel.

### Filtrar

```bash
curl 'http://localhost:3000/cars?color=preto&brand=Toyota'
curl 'http://localhost:3000/drivers?name=ana'
```

## Formato das respostas

Respostas de sucesso devolvem o recurso (ou o array de recursos) diretamente, sem envelope.
`DELETE` responde `204` sem corpo.

Requisições com corpo precisam declarar `Content-Type: application/json`; outro tipo responde `415`.
`PATCH /usages/:id/finish` não aceita corpo algum enviar qualquer campo responde `400`.

Erros sempre usam a mesma estrutura:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Automóvel já está em utilização"
  }
}
```

Erros de validação acrescentam `details`, com um item por problema encontrado:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      {
        "field": "plate",
        "message": "Placa deve seguir o formato ABC1234 ou ABC1D23"
      },
      {
        "field": "color",
        "message": "Pequeno demais: esperava que o texto tivesse >= 1 caracteres"
      },
      { "field": null, "message": "Chave inválida: \"extra\"" }
    ]
  }
}
```

`field` é `null` quando o problema não pertence a um campo específico, como um campo desconhecido
no corpo da requisição.

| Código                   | HTTP | Quando ocorre                                                       |
| ------------------------ | ---- | ------------------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400  | Corpo, parâmetro de rota ou de consulta fora do contrato            |
| `INVALID_JSON`           | 400  | O corpo enviado não é um objeto JSON válido                         |
| `BAD_REQUEST`            | 400  | Requisição malformada em um nível anterior à validação              |
| `NOT_FOUND`              | 404  | Recurso ou rota inexistente                                         |
| `CONFLICT`               | 409  | A operação é válida, mas conflita com o estado atual                |
| `PAYLOAD_TOO_LARGE`      | 413  | Corpo acima do limite do parser (100 kB)                            |
| `UNSUPPORTED_MEDIA_TYPE` | 415  | `Content-Type` não é `application/json`                             |
| `UNSUPPORTED_CHARSET`    | 415  | Charset declarado não é suportado; envie UTF-8                      |
| `UNSUPPORTED_ENCODING`   | 415  | `Content-Encoding` declarado não é suportado                        |
| `INTERNAL_ERROR`         | 500  | Falha inesperada; a mensagem interna fica apenas no log do servidor |

Todo erro de cliente responde `4xx`: nenhuma requisição malformada cai no `500`. Os erros levantados
pelo parser do corpo (tamanho, charset, codificação) são traduzidos pelo mesmo middleware, e
qualquer outro erro marcado como `expose` com status `4xx` responde `BAD_REQUEST` em vez de vazar
como falha interna.

## Regras de negócio

1. Um automóvel só pode ter **uma utilização em andamento** por vez (`409`).
2. Um motorista só pode ter **uma utilização em andamento** por vez (`409`).
3. Iniciar uma utilização exige que o automóvel e o motorista existam (`404`).
4. `startedAt` e `finishedAt` são definidos pelo servidor, em ISO 8601 UTC. O cliente não envia
   datas e tentar enviá-las resulta em `400`, tanto no início quanto na finalização. Como as duas
   datas vêm do mesmo relógio e nessa ordem, `finishedAt >= startedAt` é garantido por construção,
   não por uma validação que poderia ser contornada; os testes afirmam o invariante.
5. Uma utilização já finalizada não pode ser finalizada de novo (`409`), e o `finishedAt` original
   é preservado.
6. Finalizar uma utilização inexistente responde `404`.
7. Atualizar ou excluir um recurso inexistente responde `404`.
8. A placa é única na frota (`409` em cadastro ou atualização que a repita).
9. **Automóveis e motoristas com registros de utilização não podem ser excluídos** (`409`), mesmo
   que a utilização já esteja encerrada. Ver "Decisões técnicas".

## Decisões técnicas

### Dependências

Três em produção e quatro em desenvolvimento, todas MIT.

| Pacote               | Versão  | Papel                       | Por quê                                                                                                        |
| -------------------- | ------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `express`            | 5.3.0   | Framework HTTP              | Opção preferencial do enunciado; a v5 encaminha exceções dos handlers ao middleware de erro sem wrapper.       |
| `zod`                | 4.6.7   | Validação e normalização    | Concentra validação, normalização e mensagens em um só lugar; `z.locales.ptBR()` deixa as mensagens coerentes. |
| `swagger-ui-express` | 5.0.1   | Interface do OpenAPI        | Serve a UI do Swagger sem CDN, para `/docs` funcionar offline. Ver o custo medido abaixo.                      |
| `eslint`             | 10.13.0 | Lint                        | Apenas as regras `recommended` (lógicas, não estilísticas).                                                    |
| `prettier`           | 3.9.10  | Formatação                  | Cuida do estilo. Como as regras do ESLint usadas não são estilísticas, `eslint-config-prettier` é dispensável. |
| `@eslint/js`         | 10.0.1  | Preset do ESLint            | Dependência da configuração flat.                                                                              |
| `globals`            | 17.13.0 | Globais do Node para o lint | Dependência da configuração flat.                                                                              |

Descartados de propósito:

- **Jest / Vitest**: o runner nativo do Node 22+ cobre `describe`/`it`, hooks, mocks e cobertura.
  Trazer Vite + esbuild (ou a configuração de ESM do Jest) para um CRUD síncrono não se paga.
- **Supertest**: substituído por `tests/helpers/client.js`, que sobe a aplicação em porta efêmera
  (`listen(0)`) e usa o `fetch` nativo. São ~20 linhas e os testes falam HTTP de verdade.
- **`swagger-jsdoc`**: escreveria o spec em comentários JSDoc, duplicando o que os schemas Zod já
  declaram e criando duas fontes para a mesma regra.
- **`zod-to-openapi` e similares**: o próprio Zod 4 tem `z.toJSONSchema()`, que é o que o gerador
  usa.

### O custo do Swagger, medido

`swagger-ui-express` é um invólucro fino sobre `swagger-ui-dist`, que carrega a interface completa:

- `node_modules/swagger-ui-dist` ocupa **12 MB**
- os pacotes de produção vão de 31 para **70**
- entra um `@scarf/scarf` transitivo com `postinstall` de telemetria, **bloqueado** pelo
  `allow-scripts` do npm e deliberadamente não aprovado. `npm ci` funciona com ele bloqueado.

Para quem considerar esse custo alto, a alternativa sem dependência nenhuma é remover
`swagger-ui-express`, manter o `GET /openapi.json` (que é gerado sem dependências) e abrir o
documento em qualquer cliente de OpenAPI. A contrapartida é perder a interface embutida que funciona
sem internet.

### Organização

`routes/` cuida só de HTTP (ler a requisição, delegar, escolher o status). `services/` concentra as
regras de negócio. `store.js` guarda os dados.

Duas camadas foram deliberadamente omitidas:

- **`controllers/`**: com as regras nos serviços, os controllers seriam funções de uma linha
  repassando parâmetros. Os handlers ficaram nos próprios arquivos de rota.
- **`repositories/`**: com `Map` em memória, um repositório seria um invólucro de `get`/`set`.
  Os serviços acessam o `store` diretamente; `store.hasUsage(predicate)` é a única consulta
  compartilhada, usada pelas quatro verificações que precisam varrer as utilizações.

A validação acontece nas rotas (`schema.parse(req.body)`) e nunca é repetida nos serviços. Os
serviços assumem dados já validados e cuidam apenas das regras que dependem do estado. Um único
`errorHandler` traduz `ZodError`, erros da aplicação e falhas inesperadas, então nenhuma rota tem
`try/catch`.

Identificadores no código em inglês (convenção do ecossistema Node); mensagens de erro e
documentação em português.

### O spec é gerado, não escrito à mão

A objeção usual ao Swagger em um projeto pequeno é criar um segundo artefato que descreve a API e
silenciosamente se afasta dela. Aqui isso foi atacado em dois pontos, em vez de aceito:

**O corpo das requisições e os parâmetros de consulta vêm dos próprios schemas.** `src/openapi.js`
chama `z.toJSONSchema()` nos mesmos objetos Zod que as rotas usam para validar. Não há uma segunda
descrição do `POST /cars` — há a validação, e o spec é uma projeção dela. Adicionar um filtro em
`carQuery` o faz aparecer na documentação sem tocar no `openapi.js`.

A exceção é a placa: `transform` não é representável em JSON Schema, então o formato é exposto via
`.meta()` no próprio schema, usando a mesma constante `PLATE_FORMAT` do `refine`.

**O que não pode ser derivado é verificado por teste.** `tests/integration/openapi.test.js`:

- compara as operações documentadas com as rotas realmente registradas nos routers, nas duas
  direções — uma rota nova sem documentação falha, e uma documentação sobrando também;
- dispara requisições reais e confere, campo por campo, que `Car`, `Driver`, `Usage` e `Error`
  descrevem as respostas que a API devolve de fato.

Esses testes foram validados por sabotagem: adicionar um `HEAD /cars/:id` não documentado e renomear
um campo de resposta fazem a suíte falhar apontando exatamente o desvio.

Resta uma lacuna honesta: os **códigos de status** e as descrições de erro de cada operação são
escritos à mão e não são conferidos contra a implementação. Um teste que varresse todos os `4xx`
documentados exigiria montar um cenário por combinação; o custo não se pagou.

### Nomenclatura das rotas

`/usages` foi mantido por corresponder diretamente a "utilização" do enunciado, o que facilita
rastrear requisito e implementação. `/trips` seria mais natural em inglês, mas afastaria o
vocabulário da especificação.

### Exclusividade de utilização

A verificação e a inserção acontecem na mesma função **síncrona** (`startUsage`, em
`src/services/usages.js`): nenhum `await` ou chamada externa entre checar as utilizações em
andamento e gravar o novo registro. Como o Node executa JavaScript em uma única thread, nenhuma
outra requisição consegue se intercalar nesse intervalo. Não há locks nem filas porque, nessa
arquitetura, não há o que travar.

`tests/integration/usages.test.js` cobre isso com duas requisições em paralelo (`Promise.all`):
uma responde `201`, a outra `409`, e só um registro é criado.

### Exclusão de recursos com histórico

Excluir um automóvel ou motorista referenciado por qualquer utilização — em andamento ou
encerrada — responde `409`. Isso preserva a **integridade referencial**: a listagem de utilizações
sempre encontra os dados relacionados, sem campos nulos nem registros órfãos.

A alternativa considerada foi exclusão lógica (`deletedAt`), descartada porque obrigaria toda
leitura a filtrar registros inativos e ainda levantaria a questão de permitir ou não reusar a placa
de um automóvel "excluído".

Consequência assumida: um automóvel que já rodou uma vez não pode mais ser excluído. Em um sistema
real o caminho seria arquivar (retirar da frota ativa) em vez de excluir — operação que não foi
pedida aqui.

### A listagem de utilizações mostra o cadastro atual, não um retrato do passado

`GET /usages` resolve o motorista e o automóvel no momento da consulta. Se a placa de um automóvel
for alterada por `PUT` depois de uma utilização encerrada, a listagem passa a exibir a placa nova
para aquele registro antigo.

Isso é consequência direta de guardar apenas `driverId` e `carId` no registro de utilização. A
política de exclusão acima protege a integridade referencial, **não** um retrato do estado no
instante da utilização.

Para uma trilha de auditoria exata seria preciso gravar um retrato (nome, placa, cor e marca) dentro
do registro de utilização no momento do início. Isso foi deixado de fora porque o enunciado pede a
listagem com "as informações do motorista e do automóvel utilizados", o que um `join` com o cadastro
atende, e porque o retrato tornaria a exclusão de automóveis e motoristas liberável — mudando a
política documentada acima. É o próximo passo natural se o requisito for auditoria.

### Placa

A placa é normalizada (espaços e hifens removidos, maiúsculas) e precisa casar com
`^[A-Z]{3}\d[A-Z0-9]\d{2}$`, que cobre o formato antigo (`ABC1234`) e o Mercosul (`ABC1D23`).
Validar a posição de letras e dígitos — e não apenas "7 alfanuméricos" — recusa entradas como
`1234567` e `AAAAAAA`, que não são placas.

A unicidade na frota foi adotada porque a placa é a identidade do veículo no mundo real.

### Identificadores

Os identificadores são UUID v4 gerados pelo servidor (`crypto.randomUUID`). Um identificador
malformado responde `400` e um identificador bem formado mas inexistente responde `404` — a
distinção separa "requisição fora do contrato" de "recurso não encontrado".

Como UUID é insensível a caixa, os identificadores recebidos são convertidos para minúsculas antes
da busca: `/cars/ABC...` e `/cars/abc...` encontram o mesmo automóvel.

### Campos e parâmetros desconhecidos

Corpos e parâmetros de consulta são validados em modo estrito: um campo não previsto responde `400`.
Isso torna visível um `?cor=preto` ou `{"marca":"Fiat"}` que, ignorado em silêncio, devolveria a
lista inteira como se o filtro tivesse funcionado.

## Limitações conhecidas

- **Persistência em memória.** Os dados somem quando o processo termina e não são compartilhados
  entre instâncias. Rodar duas instâncias atrás de um balanceador quebraria a exclusividade, porque
  cada processo teria o seu próprio estado.
- **A garantia de exclusividade depende da execução síncrona.** Se o armazenamento virar um banco de
  dados (ou qualquer operação assíncrona), a verificação e a inserção passam a ter um ponto de
  interrupção entre si e será necessário usar transação com índice único, por exemplo um índice
  parcial sobre `car_id` e `driver_id` restrito às utilizações não finalizadas.
- **Sem autenticação, autorização, paginação ou ordenação configurável** nas listagens; nada disso
  foi pedido. As listas saem na ordem de cadastro.
- **Não é possível registrar uma utilização retroativa.** `startedAt` é sempre o instante da
  requisição. Aceitar datas do cliente exigiria trocar a regra de exclusividade de "uma utilização
  em andamento" por detecção de sobreposição de intervalos, que é um problema bem maior.
- **`GET /usages` reflete o cadastro atual**, não o estado no momento da utilização. Ver a decisão
  técnica sobre isso.
- **As verificações de exclusividade e de histórico varrem todas as utilizações** (`store.hasUsage`
  é O(n)), o que é adequado para uma frota em memória, mas seria substituído por índices ao migrar
  para banco de dados.
- `src/server.js` e `src/demoData.js` não têm testes automatizados (são o ponto de entrada e uma
  carga de dados opcional); foram verificados manualmente subindo a aplicação com e sem `--demo`.
- Validado em Node 24.18.0 no Windows. `engines` declara Node ≥22 por compatibilidade das APIs
  usadas, mas não executei a suíte em outras versões ou sistemas operacionais.
