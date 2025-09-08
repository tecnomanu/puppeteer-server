import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Compatible JSON import for Node.js v22 and earlier
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
	readFileSync(join(__dirname, '../package.json'), 'utf8')
);

export async function startHttpServer(
	registerTools: (s: Server) => void,
	opts?: { port?: number }
) {
	const app = express();
	app.use(express.json({ limit: process.env.MCP_BODY_LIMIT ?? '1mb' }));

	const server = new Server(
		{ name: 'puppeteer-server', version: pkg.version },
		{ capabilities: { resources: {}, tools: {}, logging: {} } }
	);
	registerTools(server);

	const transports = new Map<string, SSEServerTransport>();
	const POST_ENDPOINT = '/messages';

	app.post(POST_ENDPOINT, async (req: Request, res: Response) => {
		if (!isAuthorized(req)) return res.status(401).end();
		if (!isAllowedOrigin(req)) return res.status(403).end();

		const sessionId = String(req.query.sessionId || '');
		if (!sessionId)
			return res.status(400).json({ error: 'Missing sessionId' });
		const transport = transports.get(sessionId);
		if (!transport)
			return res.status(400).json({ error: 'Unknown session' });
		try {
			await transport.handlePostMessage(req, res, req.body);
		} catch (e) {
			console.error('[mcp:http] handlePostMessage error:', e);
			if (!res.headersSent)
				res.status(500).json({ error: 'handlePostMessage failed' });
		}
	});

	app.get('/sse', async (req: Request, res: Response) => {
		if (!isAuthorized(req)) return res.status(401).end();
		if (!isAllowedOrigin(req)) return res.status(403).end();

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no');
		res.flushHeaders?.();

		(res as any).writeHead = () => res;

		const transport = new SSEServerTransport(POST_ENDPOINT, res);
		transports.set(transport.sessionId, transport);

		const keepAlive = setInterval(() => {
			try {
				res.write(':keep-alive\n\n');
			} catch {
				/* ignore */
			}
		}, 30000);

		const cleanup = () => {
			clearInterval(keepAlive);
			transports.delete(transport.sessionId);
		};
		res.on('close', cleanup);
		res.on('error', cleanup);

		try {
			await server.connect(transport);
		} catch (e) {
			console.error('[mcp:http] connect error:', e);
			try {
				res.end();
			} catch {
				/* ignore */
			}
			cleanup();
		}
	});

	app.get('/health', (_req: Request, res: Response) => {
		res.json({ ok: true, transport: 'http', version: pkg.version });
	});

	app.post('/mcp', (_req: Request, res: Response) => {
		res.status(501).json({ error: 'Not implemented' });
	});

	const port = Number(opts?.port ?? process.env.PORT ?? 3333);
	app.listen(port, () => {
		console.error(
			`[mcp:http] listening http://localhost:${port}/sse  (POST ${POST_ENDPOINT})`
		);
	});

	function isAuthorized(req: Request) {
		const expected = process.env.MCP_BEARER;
		if (!expected) return true;
		return req.headers.authorization === `Bearer ${expected}`;
	}
	function isAllowedOrigin(req: Request) {
		const list = (process.env.ALLOWED_ORIGINS || '*')
			.split(',')
			.map((s) => s.trim());
		if (list.includes('*')) return true;
		const origin = String(req.headers.origin || '');
		if (!origin) return true;
		return list.includes(origin);
	}
}
