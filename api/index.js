import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const COOKIE = 'segev_cloud_session';
const DAY = 86400;
const fields = ['segevProProjects','segevProSuppliers','segevProClients','segevProTasks','segevProTeam','segevProAlerts','segevProQuestions','segevProActions','segevProLastSaved','segevMonthlyDraft','segevMonthlyHistory','segevSubBills'];
const hash = value => createHash('sha256').update(value).digest('hex');
const equal = (a, b) => {
  const left = Buffer.from(hash(a));
  const right = Buffer.from(hash(b));
  return timingSafeEqual(left, right);
};
const cookie = (token, age) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const fail = (res, status, error) => res.status(status).json({error});
const db = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  return neon(process.env.DATABASE_URL);
};
const currentToken = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
async function currentUser(req, sql) {
  const token = currentToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await sql`SELECT user_id FROM segev_sessions WHERE token_hash = ${hash(token)} AND expires_at > now()`;
  return rows[0]?.user_id || null;
}
async function body(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}
export { fields, equal };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const path = new URL(req.url, 'https://segev.local').pathname.replace(/\/$/, '');
  if (!['/api/session','/api/workspace'].includes(path)) return fail(res, 404, 'Not found');
  try {
    const sql = db();
    if (path === '/api/session' && req.method === 'POST') {
      const {email, password} = await body(req);
      const adminEmail = process.env.SEGEV_ADMIN_EMAIL?.trim().toLowerCase();
      const adminPassword = process.env.SEGEV_ADMIN_PASSWORD;
      if (!adminEmail || !adminPassword) return fail(res, 503, 'Account is not configured');
      const submittedEmail = String(email || '').trim().toLowerCase();
      if (submittedEmail.length > 254 || String(password || '').length > 1024) return fail(res, 400, 'Invalid credentials');
      const attempts = await sql`SELECT failures FROM segev_login_attempts WHERE email = ${submittedEmail} AND first_failure > now() - interval '1 hour'`;
      if ((attempts[0]?.failures || 0) >= 8) return fail(res, 429, 'Try again later');
      if (!equal(submittedEmail, adminEmail) || !equal(String(password || ''), adminPassword)) {
        await sql`INSERT INTO segev_login_attempts(email, failures, first_failure) VALUES (${submittedEmail}, 1, now())
          ON CONFLICT(email) DO UPDATE SET failures = CASE WHEN segev_login_attempts.first_failure < now() - interval '1 hour' THEN 1 ELSE segev_login_attempts.failures + 1 END,
          first_failure = CASE WHEN segev_login_attempts.first_failure < now() - interval '1 hour' THEN now() ELSE segev_login_attempts.first_failure END`;
        return fail(res, 401, 'Wrong email or password');
      }
      await sql`DELETE FROM segev_login_attempts WHERE email = ${submittedEmail}`;
      const token = randomBytes(32).toString('hex');
      await sql`INSERT INTO segev_sessions (token_hash,user_id,expires_at) VALUES (${hash(token)}, ${adminEmail}, now() + interval '7 days')`;
      res.setHeader('Set-Cookie', cookie(token, 7 * DAY));
      return res.status(200).json({email: adminEmail, admin: true});
    }
    if (path === '/api/session' && req.method === 'DELETE') {
      const token = currentToken(req);
      if (token) await sql`DELETE FROM segev_sessions WHERE token_hash = ${hash(token)}`;
      res.setHeader('Set-Cookie', cookie('', 0));
      return res.status(200).json({ok: true});
    }
    const user = await currentUser(req, sql);
    if (!user) return fail(res, 401, 'Please sign in');
    if (path === '/api/session' && req.method === 'GET') return res.status(200).json({email: user, admin: true});
    if (path === '/api/workspace' && req.method === 'GET') {
      const rows = await sql`SELECT data, revision, updated_at FROM segev_workspaces WHERE user_id = ${user}`;
      return res.status(200).json(rows[0] || {data: null, revision: 0});
    }
    if (path === '/api/workspace' && req.method === 'PUT') {
      const payload = await body(req);
      if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 || typeof payload.data !== 'object' || payload.data === null || Array.isArray(payload.data)) return fail(res, 400, 'Invalid workspace');
      if (Object.keys(payload.data).some(key => !fields.includes(key)) || JSON.stringify(payload.data).length > 750000) return fail(res, 400, 'Invalid workspace data');
      const data = JSON.stringify(payload.data);
      const rows = await sql`
        INSERT INTO segev_workspaces (user_id,data,revision) SELECT ${user}, ${data}::jsonb, 1 WHERE ${payload.revision} = 0
        ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data, revision=segev_workspaces.revision+1, updated_at=now()
        WHERE segev_workspaces.revision = ${payload.revision}
        RETURNING revision, updated_at`;
      if (!rows.length) return fail(res, 409, 'Workspace changed on another device; refresh before saving');
      return res.status(200).json(rows[0]);
    }
    return fail(res, 405, 'Method not allowed');
  } catch (error) {
    console.error('SEGEV API error', error);
    return fail(res, 503, 'Service unavailable');
  }
}
