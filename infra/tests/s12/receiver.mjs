import http from 'node:http';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const session = JSON.parse(await readFile(process.env.ECOM_SESSION_FILE, 'utf8'));
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: session.postgresPort,
  user: session.databaseUser,
  password: session.databasePassword,
  database: session.database,
});
await pool.query(`CREATE TABLE IF NOT EXISTS s12_fixture_mail (
  account text NOT NULL, key text NOT NULL, digest text NOT NULL, receipt jsonb NOT NULL,
  payload jsonb NOT NULL, PRIMARY KEY(account,key)
)`);
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/messages') {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 65_536) throw new Error('large');
      }
      const { accountId, key, requestDigest, payload } = JSON.parse(raw);
      const receipt = {
        providerRequestId: randomUUID(),
        requestDigest,
        cost: { minor: payload.testCost ?? 0, currency: payload.currency ?? 'USD', scale: 2 },
        evidenceRef: `local-mail:${randomUUID()}`,
      };
      await pool.query(
        'INSERT INTO s12_fixture_mail(account,key,digest,receipt,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [accountId, key, requestDigest, receipt, payload],
      );
      const {
        rows: [stored],
      } = await pool.query('SELECT * FROM s12_fixture_mail WHERE account=$1 AND key=$2', [accountId, key]);
      if (stored.digest !== requestDigest) {
        res.writeHead(409).end();
        return;
      }
      process.send?.({ accepted: key });
      if (payload.loseResponse) {
        res.destroy();
        return;
      }
      if (payload.holdResponse) return;
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(stored.receipt));
      return;
    }
    const match = req.url?.match(/^\/messages\/([^/]+)\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      const { rows } = await pool.query('SELECT receipt FROM s12_fixture_mail WHERE account=$1 AND key=$2', [
        decodeURIComponent(match[1]),
        decodeURIComponent(match[2]),
      ]);
      if (!rows[0]) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(rows[0].receipt));
      return;
    }
    res.writeHead(404).end();
  } catch {
    res.writeHead(400).end();
  }
});
server.listen(Number(process.env.S12_RECEIVER_PORT), '127.0.0.1', () => process.send?.({ ready: true }));
process.on('SIGTERM', async () => {
  server.closeAllConnections();
  server.close();
  await pool.end();
  process.exit(0);
});
