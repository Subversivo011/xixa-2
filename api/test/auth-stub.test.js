// Guarda do auth-stub (ALLOWLIST) e configuração do pool: sem banco, rodam no CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAutenticadorStub, stubPermitido } from '../auth-stub.js';
import { tamanhoDoPool } from '../lib/config.js';

const ligar = (env) => criarAutenticadorStub({ AUTH_STUB: '1', ...env });
const RECUSADO = /AUTH_STUB=1 recusado/;

test('stub desligado sem AUTH_STUB=1 (qualquer ambiente)', () => {
  assert.equal(criarAutenticadorStub({}), null);
  assert.equal(criarAutenticadorStub({ AUTH_STUB: '0', DB_NAME: 'naosalvo' }), null);
  assert.equal(criarAutenticadorStub({ AUTH_STUB: 'true', DB_NAME: 'naosalvo_dev' }), null);
});

test('recusa subir: naosalvo (produção), naosalvo_staging, banco ausente', () => {
  assert.throws(() => ligar({ DB_NAME: 'naosalvo' }), RECUSADO);
  assert.throws(() => ligar({ DB_NAME: 'naosalvo_staging' }), RECUSADO);
  assert.throws(() => ligar({}), RECUSADO);
  assert.throws(() => ligar({ DB_NAME: '' }), RECUSADO);
  assert.throws(() => ligar({ DB_NAME: 'naosalvo', NODE_ENV: 'development' }), RECUSADO);
});

test('recusa subir com NODE_ENV=production em qualquer grafia, mesmo em banco dev/test', () => {
  for (const ne of ['production', 'Production', 'PRODUCTION', ' production ']) {
    assert.throws(() => ligar({ DB_NAME: 'naosalvo_dev', NODE_ENV: ne }), RECUSADO, ne);
    assert.throws(() => ligar({ DB_NAME: 'naosalvo_test', NODE_ENV: ne }), RECUSADO, ne);
  }
  assert.throws(() => ligar({ NODE_ENV: 'Production' }), RECUSADO);
});

test('liga em naosalvo_dev, bancos de teste e NODE_ENV=test (sem diferenciar maiúsculas)', () => {
  for (const env of [{ DB_NAME: 'naosalvo_dev' }, { DB_NAME: 'NAOSALVO_DEV' }, { DB_NAME: 'naosalvo_test' },
    { DB_NAME: 'Test_db' }, { DB_NAME: 'naosalvo', NODE_ENV: 'test' }, { NODE_ENV: 'TEST' }, { DB_NAME: 'naosalvo_dev', NODE_ENV: 'development' }]) {
    assert.equal(typeof ligar(env), 'function', JSON.stringify(env));
  }
});

test('a mensagem de erro diz o que fazer e mostra o ambiente detectado', () => {
  assert.throws(() => ligar({ DB_NAME: 'naosalvo', NODE_ENV: 'production' }),
    (e) => /"test" ou "dev"/.test(e.message) && /DB_NAME="naosalvo"/.test(e.message) && /Remova AUTH_STUB/.test(e.message));
});

test('stubPermitido: tabela de decisão', () => {
  assert.equal(stubPermitido({ DB_NAME: 'naosalvo_dev' }), true);
  assert.equal(stubPermitido({ DB_NAME: 'naosalvo' }), false);
  assert.equal(stubPermitido({ DB_NAME: 'naosalvo_dev', NODE_ENV: 'production' }), false);
});

test('DB_POOL_MAX: padrão 10, aceita inteiro >= 1, ignora lixo, teto 100', () => {
  assert.equal(tamanhoDoPool({}), 10);
  assert.equal(tamanhoDoPool({ DB_POOL_MAX: '25' }), 25);
  assert.equal(tamanhoDoPool({ DB_POOL_MAX: '1' }), 1);
  for (const ruim of ['', '0', '-3', 'abc', '1.5x']) assert.equal(tamanhoDoPool({ DB_POOL_MAX: ruim }), 10, ruim);
  assert.equal(tamanhoDoPool({ DB_POOL_MAX: '5000' }), 100);
});
