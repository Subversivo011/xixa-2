// Formulário de contribuidores (público) + metadados.
import { send, lerJson, clean, limited } from '../lib/http.js';

export const AREAS = ['Frontend', 'Backend', 'Design UI/UX', 'Ilustração / Arte', 'Motion / Animação',
  'Dados / Arquivamento', 'DevOps / Infra', 'Curadoria de conteúdo', 'Moderação / Comunidade', 'QA / Testes'];
export const EXPERIENCE = ['Menos de 1 ano', '1 a 3 anos', '3 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'];

export function validate(b) {
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

export default function registrar(r) {
  r.get('/api/contribuidores/meta', async ({ res, pool }) => {
    const { rows } = await pool.query('SELECT count(*)::int AS total FROM contribuidores');
    return send(res, 200, { total: rows[0].total, areas: AREAS, experiencia: EXPERIENCE });
  });

  r.post('/api/contribuidores', async ({ req, res, pool, ip }) => {
    if (limited(ip)) return send(res, 429, { error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
    const body = await lerJson(req);
    if (body === undefined) return send(res, 400, { error: 'JSON inválido.' });
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
  });
}
