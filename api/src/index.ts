import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { MiddlewareHandler } from 'hono';
import type { AppVariables, Bindings } from './bindings';
import { createAdminToken, credentialsMatch, ingestKeyMatches, verifyAdminToken } from './auth';
import { RealtimeHub } from './realtime-hub';
import { ingestTelemetry, parseTelemetryPayload } from './telemetry.service';

type AppEnv = { Bindings: Bindings; Variables: AppVariables };
type JsonRecord = Record<string, unknown>;

const app = new Hono<AppEnv>();

function jsonError(message: string, status = 400) {
	return { success: false, error: message, status };
}

function readBearer(request: Request): string | null {
	const value = request.headers.get('Authorization');
	return value?.startsWith('Bearer ') ? value.slice(7) : null;
}

async function parseJson(request: Request): Promise<JsonRecord | null> {
	try {
		const body: unknown = await request.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? body as JsonRecord : null;
	} catch {
		return null;
	}
}

const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
	const token = readBearer(c.req.raw);
	const admin = token ? await verifyAdminToken(token, c.env) : null;
	if (!admin) return c.json(jsonError('Admin authentication is required', 401), 401);
	c.set('admin', admin);
	await next();
};

function limitFrom(value: string | undefined, fallback = 100): number {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 500)) : fallback;
}

app.use('*', logger());
app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type', 'X-API-Key'], allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }));

app.get('/', (c) => c.json({
	success: true,
	service: 'EmberRoot API',
	version: '1.0.0',
	services: { database: 'D1', realtime: 'Durable Object', ingestion: ['HTTP', 'WebSocket', 'MQTT webhook'] }
}));

app.post('/api/auth/login', async (c) => {
	const body = await parseJson(c.req.raw);
	const username = typeof body?.username === 'string' ? body.username : '';
	const password = typeof body?.password === 'string' ? body.password : '';
	if (!credentialsMatch(username, password, c.env)) return c.json(jsonError('Invalid username or password', 401), 401);
	const session = await createAdminToken(c.env);
	return c.json({ success: true, data: { ...session, user: { username: 'admin', role: 'admin' } } });
});

app.get('/api/regions', async (c) => {
	const result = await c.env.DB.prepare('SELECT * FROM regions ORDER BY name').all();
	return c.json({ success: true, data: result.results });
});

app.get('/api/regions/:id', async (c) => {
	const region = await c.env.DB.prepare('SELECT * FROM regions WHERE id = ?').bind(c.req.param('id')).first();
	if (!region) return c.json(jsonError('Region not found', 404), 404);
	const nodes = await c.env.DB.prepare('SELECT * FROM nodes WHERE region_id = ? ORDER BY name').bind(c.req.param('id')).all();
	return c.json({ success: true, data: { ...region, nodes: nodes.results } });
});

app.get('/api/nodes', async (c) => {
	const regionId = c.req.query('regionId');
	const query = regionId
		? c.env.DB.prepare('SELECT * FROM nodes WHERE region_id = ? ORDER BY last_seen_at DESC').bind(regionId)
		: c.env.DB.prepare('SELECT * FROM nodes ORDER BY last_seen_at DESC');
	const result = await query.all();
	return c.json({ success: true, data: result.results });
});

app.get('/api/nodes/:id', async (c) => {
	const node = await c.env.DB.prepare('SELECT * FROM nodes WHERE id = ?').bind(c.req.param('id')).first();
	if (!node) return c.json(jsonError('Node not found', 404), 404);
	return c.json({ success: true, data: node });
});

app.get('/api/nodes/:id/telemetry', async (c) => {
	const from = c.req.query('from');
	const to = c.req.query('to');
	const limit = limitFrom(c.req.query('limit'));
	const result = await c.env.DB.prepare(
		`SELECT * FROM telemetry WHERE node_id = ?
		 AND (? IS NULL OR received_at >= ?) AND (? IS NULL OR received_at <= ?)
		 ORDER BY received_at DESC LIMIT ?`
	).bind(c.req.param('id'), from ?? null, from ?? null, to ?? null, to ?? null, limit).all();
	return c.json({ success: true, data: result.results });
});

app.get('/api/alerts', async (c) => {
	const state = c.req.query('state');
	const nodeId = c.req.query('nodeId');
	const limit = limitFrom(c.req.query('limit'));
	const result = await c.env.DB.prepare(
		`SELECT alerts.*, nodes.name AS node_name, nodes.region_id FROM alerts
		 JOIN nodes ON nodes.id = alerts.node_id
		 WHERE (? IS NULL OR alerts.state = ?) AND (? IS NULL OR alerts.node_id = ?)
		 ORDER BY alerts.created_at DESC LIMIT ?`
	).bind(state ?? null, state ?? null, nodeId ?? null, nodeId ?? null, limit).all();
	return c.json({ success: true, data: result.results });
});

app.post('/api/alerts/:id/acknowledge', requireAdmin, async (c) => {
	const id = c.req.param('id');
	const result = await c.env.DB.prepare(
		"UPDATE alerts SET state = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ? AND state IN ('open', 'investigating')"
	).bind(new Date().toISOString(), c.get('admin').sub, id).run();
	if (!result.meta.changes) return c.json(jsonError('Open alert not found', 404), 404);
	await c.env.DB.prepare('INSERT INTO audit_log (id, actor, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
		.bind(crypto.randomUUID(), c.get('admin').sub, 'acknowledge', 'alert', id).run();
	await c.env.REALTIME_HUB.getByName('emberroot').publish({ type: 'alert.updated', payload: { id, state: 'acknowledged' }, sentAt: new Date().toISOString() });
	return c.json({ success: true, data: { id, state: 'acknowledged' } });
});

app.post('/api/ingest/telemetry', async (c) => {
	const apiKey = c.req.header('X-API-Key');
	const token = readBearer(c.req.raw);
	const isAdmin = token ? await verifyAdminToken(token, c.env) : null;
	if (!isAdmin && !ingestKeyMatches(apiKey, c.env)) return c.json(jsonError('Valid ingest credentials are required', 401), 401);
	const body = await parseJson(c.req.raw);
	const telemetry = parseTelemetryPayload(body);
	if (!telemetry) return c.json(jsonError('Invalid telemetry payload. Include node_id and at least one numeric measurement.'));
	const result = await ingestTelemetry(c.env, telemetry, 'http');
	return c.json({ success: true, data: result }, 201);
});

app.post('/api/ingest/mqtt', async (c) => {
	if (!ingestKeyMatches(c.req.header('X-API-Key'), c.env)) return c.json(jsonError('Valid ingest key is required', 401), 401);
	const body = await parseJson(c.req.raw);
	const telemetry = parseTelemetryPayload(body);
	if (!telemetry) return c.json(jsonError('Invalid MQTT telemetry payload.'));
	const result = await ingestTelemetry(c.env, telemetry, 'mqtt');
	return c.json({ success: true, data: result }, 201);
});

app.get('/api/ws', async (c) => {
	const token = c.req.query('token');
	const admin = token ? await verifyAdminToken(token, c.env) : null;
	if (!admin) return c.json(jsonError('Valid admin token is required for WebSocket access', 401), 401);
	return c.env.REALTIME_HUB.getByName('emberroot').fetch(c.req.raw);
});

app.get('/api/admin/nodes', requireAdmin, async (c) => {
	const result = await c.env.DB.prepare('SELECT * FROM nodes ORDER BY created_at DESC').all();
	return c.json({ success: true, data: result.results });
});

app.post('/api/admin/nodes', requireAdmin, async (c) => {
	const body = await parseJson(c.req.raw);
	if (!body || typeof body.id !== 'string' || typeof body.name !== 'string' || typeof body.regionId !== 'string') {
		return c.json(jsonError('id, name, and regionId are required.'));
	}
	const nodeType = body.nodeType === 'light' || body.nodeType === 'fence' ? body.nodeType : 'full';
	await c.env.DB.prepare(
		`INSERT INTO nodes (id, region_id, name, node_type, latitude, longitude, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, 'offline', ?, ?)`
	).bind(body.id, body.regionId, body.name, nodeType, typeof body.latitude === 'number' ? body.latitude : null, typeof body.longitude === 'number' ? body.longitude : null, new Date().toISOString(), new Date().toISOString()).run();
	await c.env.DB.prepare('INSERT INTO audit_log (id, actor, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
		.bind(crypto.randomUUID(), c.get('admin').sub, 'create', 'node', body.id).run();
	return c.json({ success: true, data: { id: body.id } }, 201);
});

app.notFound((c) => c.json(jsonError('Route not found', 404), 404));

app.onError((err, c) => {
	console.error('Hono Error:', err);
	return c.json(jsonError(err.message || 'Internal Server Error', 500), 500);
});

export { RealtimeHub };
export default app;
