// Serves the built web app. API routes (progress, review queue) will live here from slice 4.
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.WEB_DIST ?? path.resolve(here, '../web/dist');
const port = Number(process.env.PORT ?? 8080);

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

app.get('/api/health', async () => ({ ok: true }));

await app.register(fastifyStatic, { root, maxAge: '1h', immutable: false });

// Fingerprinted assets can be cached for a long time; index.html must stay fresh.
app.addHook('onSend', async (req, reply) => {
  if (req.url.startsWith('/assets/')) reply.header('cache-control', 'public, max-age=31536000, immutable');
  else if (!req.url.startsWith('/api/')) reply.header('cache-control', 'no-cache');
});

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
  return reply.sendFile('index.html');
});

await app.listen({ host: '0.0.0.0', port });
