// API do formulário de contribuidores — Node puro + pg. Segredos via *_FILE (Docker secrets).
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import pg from 'pg';

const secret = (name) => {
  const file = process.env[name + '_FILE'];
  return file ? readFileSync(file, 'utf8').trim() : (process.env[name] || '');
};

const ADMIN_TOKEN = secret('ADMIN_TOKEN');
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'postgres',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'naosalvo',
  database: process.env.DB_NAME || 'naosalvo',
  password: secret('DB_PASSWORD'),
  max: 5
});

const YT_KEY = secret('YT_API_KEY'); // opcional: sem chave, /api/yt-stats devolve {}

await pool.query(`
  CREATE TABLE IF NOT EXISTS votos (
    id   TEXT PRIMARY KEY,
    up   INT NOT NULL DEFAULT 0,
    down INT NOT NULL DEFAULT 0,
    sum  INT NOT NULL DEFAULT 0,
    n    INT NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id        BIGSERIAL PRIMARY KEY,
    tipo      TEXT NOT NULL,
    msg       TEXT NOT NULL,
    contato   TEXT,
    pagina    TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

const VOTE_ID = /^[a-z0-9-]{1,80}$/;
const clampV = (v) => (v === 1 || v === -1 ? v : 0);
const clampS = (s) => Math.max(0, Math.min(5, Math.round(+s || 0)));
const emptyVote = () => ({ up: 0, down: 0, sum: 0, n: 0 });

const ytCache = new Map(); // id -> { at, data }
async function ytStats(ids) {
  const out = {};
  if (!YT_KEY) return out;
  const now = Date.now();
  const need = ids.filter((i) => !ytCache.has(i) || now - ytCache.get(i).at > 6 * 3600 * 1000);
  if (need.length) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${need.join(',')}&key=${YT_KEY}`);
    if (r.ok) {
      const d = await r.json();
      for (const it of d.items || []) ytCache.set(it.id, { at: now, data: { views: +it.statistics.viewCount || 0, likes: +it.statistics.likeCount || 0 } });
    }
  }
  for (const i of ids) if (ytCache.has(i)) out[i] = ytCache.get(i).data;
  return out;
}

const AREAS = ['Frontend', 'Backend', 'Design UI/UX', 'Ilustração / Arte', 'Motion / Animação',
  'Dados / Arquivamento', 'DevOps / Infra', 'Curadoria de conteúdo', 'Moderação / Comunidade', 'QA / Testes'];
const EXPERIENCE = ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'];

// migração: versão anterior guardava e-mail; agora guarda usuário do Discord
await pool.query(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contribuidores' AND column_name = 'email') THEN
      DROP INDEX IF EXISTS contribuidores_email_uq;
      ALTER TABLE contribuidores RENAME COLUMN email TO discord;
    END IF;
  END $$;
`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS contribuidores (
    id            BIGSERIAL PRIMARY KEY,
    nome          TEXT NOT NULL,
    nick          TEXT NOT NULL,
    discord       TEXT NOT NULL,
    areas         TEXT[] NOT NULL DEFAULT '{}',
    area_outros   TEXT,
    horas_semana  INT NOT NULL,
    experiencia   TEXT NOT NULL,
    ferramentas   TEXT NOT NULL,
    mensagem      TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS contribuidores_discord_uq ON contribuidores (lower(discord));
`);

const send = (res, code, body, headers = {}) => {
  const isStr = typeof body === 'string';
  res.writeHead(code, {
    'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(isStr ? body : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', (c) => { size += c.length; if (size > 20_000) { reject(new Error('too-large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

// rate limit simples em memória: 8 envios / 10 min por IP
const hits = new Map();
const limited = (ip, max = 8) => {
  const now = Date.now(), win = 10 * 60_000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > max;
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 600_000)) hits.delete(k); }, 600_000).unref();

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function validate(b) {
  const errors = {};
  const nome = clean(b.nome, 120), nick = clean(b.nick, 40).replace(/^@/, ''), discord = clean(b.discord, 40).replace(/^@/, '').toLowerCase();
  const areas = (Array.isArray(b.areas) ? b.areas : []).map((a) => clean(a, 40)).filter((a) => AREAS.includes(a));
  const area_outros = clean(b.area_outros, 120);
  const horas = Number.parseInt(b.horas_semana, 10);
  const experiencia = clean(b.experiencia, 40);
  const ferramentas = clean(b.ferramentas, 300);
  const mensagem = clean(b.mensagem, 600);
  if (nome.length < 2) errors.nome = 'Informe seu nome.';
  if (!/^[\w.\-]{2,40}$/.test(nick)) errors.nick = 'Use 2–40 letras, números, ponto, hífen ou _.';
  if (!/^[a-z0-9_.]{2,32}$/.test(discord) || discord.includes('..')) errors.discord = 'Usuário do Discord inválido (2 a 32: letras minúsculas, números, _ e .).';
  if (!areas.length && !area_outros) errors.areas = 'Escolha ao menos uma área ou descreva em “Outros”.';
  if (!(horas >= 1 && horas <= 80)) errors.horas_semana = 'Informe de 1 a 80 horas por semana.';
  if (!EXPERIENCE.includes(experiencia)) errors.experiencia = 'Selecione o tempo de experiência.';
  if (ferramentas.length < 2) errors.ferramentas = 'Conte quais linguagens ou ferramentas você domina.';
  if (b.consentimento !== true) errors.consentimento = 'É preciso aceitar o uso dos dados para contato.';
  return { errors, data: { nome, nick, discord, areas, area_outros: area_outros || null, horas_semana: horas, experiencia, ferramentas, mensagem: mensagem || null } };
}

function isAdmin(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!ADMIN_TOKEN || !token) return false;
  const a = Buffer.from(token), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

const csvCell = (v) => {
  let s = Array.isArray(v) ? v.join('; ') : v instanceof Date ? v.toISOString() : String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita injeção de fórmula em planilhas
  return '"' + s.replace(/"/g, '""') + '"';
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });

    if (req.method === 'GET' && url.pathname === '/api/contribuidores/meta') {
      const { rows } = await pool.query('SELECT count(*)::int AS total FROM contribuidores');
      return send(res, 200, { total: rows[0].total, areas: AREAS, experiencia: EXPERIENCE });
    }

    if (req.method === 'POST' && url.pathname === '/api/contribuidores') {
      if (limited(ip)) return send(res, 429, { error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'JSON inválido.' }); }
      if (body.website) return send(res, 201, { ok: true }); // honeypot: finge sucesso
      const { errors, data } = validate(body);
      if (Object.keys(errors).length) return send(res, 422, { error: 'Revise os campos.', errors });
      try {
        await pool.query(
          `INSERT INTO contribuidores (nome,nick,discord,areas,area_outros,horas_semana,experiencia,ferramentas,mensagem)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [data.nome, data.nick, data.discord, data.areas, data.area_outros, data.horas_semana, data.experiencia, data.ferramentas, data.mensagem]);
      } catch (e) {
        if (e.code === '23505') return send(res, 409, { error: 'Este usuário do Discord já está cadastrado. Obrigado!' });
        throw e;
      }
      return send(res, 201, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/votos') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter((i) => VOTE_ID.test(i)).slice(0, 60);
      const out = {};
      ids.forEach((i) => { out[i] = emptyVote(); });
      if (ids.length) {
        const { rows } = await pool.query('SELECT id, up, down, sum, n FROM votos WHERE id = ANY($1)', [ids]);
        rows.forEach((r) => { out[r.id] = { up: r.up, down: r.down, sum: r.sum, n: r.n }; });
      }
      return send(res, 200, out);
    }

    if (req.method === 'POST' && url.pathname === '/api/votos') {
      if (limited('v:' + ip, 120)) return send(res, 429, { erro: 'Muitas ações. Aguarde um pouco.' });
      let b;
      try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { erro: 'json inválido' }); }
      if (!b || !VOTE_ID.test(b.id || '')) return send(res, 400, { erro: 'id inválido' });
      let dUp = 0, dDown = 0, dSum = 0, dN = 0;
      if ('from' in b || 'to' in b) {
        const f = clampV(b.from), t = clampV(b.to);
        if (f === 1) dUp--; if (f === -1) dDown--;
        if (t === 1) dUp++; if (t === -1) dDown++;
      }
      if ('starFrom' in b || 'starTo' in b) {
        const f = clampS(b.starFrom), t = clampS(b.starTo);
        if (f) { dSum -= f; dN--; }
        if (t) { dSum += t; dN++; }
      }
      const { rows } = await pool.query(
        `INSERT INTO votos (id, up, down, sum, n) VALUES ($1, GREATEST($2,0), GREATEST($3,0), GREATEST($4,0), GREATEST($5,0))
         ON CONFLICT (id) DO UPDATE SET up = GREATEST(votos.up + $2, 0), down = GREATEST(votos.down + $3, 0),
           sum = GREATEST(votos.sum + $4, 0), n = GREATEST(votos.n + $5, 0)
         RETURNING up, down, sum, n`, [b.id, dUp, dDown, dSum, dN]);
      return send(res, 200, rows[0]);
    }

    if (req.method === 'GET' && url.pathname === '/api/yt-stats') {
      const ids = [...new Set((url.searchParams.get('ids') || '').split(',').filter((i) => /^[\w-]{11}$/.test(i)))].slice(0, 50);
      return send(res, 200, ids.length ? await ytStats(ids) : {}, { 'Cache-Control': 'public, max-age=600' });
    }

    if (req.method === 'POST' && url.pathname === '/api/feedback') {
      if (limited('f:' + ip, 10)) return send(res, 429, { erro: 'Muitas tentativas.' });
      let b;
      try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { erro: 'json inválido' }); }
      if (b['bot-field']) return send(res, 201, { ok: true });
      const msg = clean(b.msg, 2000);
      if (msg.length < 5) return send(res, 422, { erro: 'Mensagem curta demais.' });
      await pool.query('INSERT INTO feedback (tipo, msg, contato, pagina) VALUES ($1,$2,$3,$4)',
        [clean(b.tipo, 20) || 'ideia', msg, clean(b.contato, 120) || null, clean(b.pagina, 200) || null]);
      return send(res, 201, { ok: true });
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'Token inválido.' }, { 'WWW-Authenticate': 'Bearer' });

      if (req.method === 'GET' && url.pathname === '/api/admin/contribuidores') {
        const { rows } = await pool.query('SELECT * FROM contribuidores ORDER BY criado_em DESC LIMIT 5000');
        return send(res, 200, { items: rows });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/contribuidores.csv') {
        const { rows } = await pool.query('SELECT * FROM contribuidores ORDER BY criado_em DESC');
        const cols = ['id', 'nome', 'nick', 'discord', 'areas', 'area_outros', 'horas_semana', 'experiencia', 'ferramentas', 'mensagem', 'criado_em'];
        const csv = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="contribuidores.csv"',
          'Cache-Control': 'no-store'
        });
        return res.end(csv);
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/feedback') {
        const { rows } = await pool.query('SELECT * FROM feedback ORDER BY criado_em DESC LIMIT 1000');
        return send(res, 200, { items: rows });
      }
      const del = url.pathname.match(/^\/api\/admin\/contribuidores\/(\d+)$/);
      if (req.method === 'DELETE' && del) {
        const r = await pool.query('DELETE FROM contribuidores WHERE id = $1', [del[1]]);
        return send(res, r.rowCount ? 200 : 404, { ok: !!r.rowCount });
      }
    }
    return send(res, 404, { error: 'Não encontrado.' });
  } catch (e) {
    console.error(new Date().toISOString(), e.message);
    return send(res, 500, { error: 'Erro interno.' });
  }
});
server.listen(3000, () => console.log('naosalvo-api :3000'));
