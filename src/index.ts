#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startHttpServer } from './http.js';
import { registerTools } from './register-tools.js';
import pkg from '../package.json' assert { type: 'json' };

const log = (...a: any[]) => console.error('[puppeteer-server]', ...a);

(async () => {
	const mode = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();
	if (mode === 'http') {
		await startHttpServer(registerTools, {
			port: Number(process.env.PORT || 3333),
		});
		log('HTTP/SSE mode ready');
		process.stdin.pause();
		return;
	}

	const server = new Server(
		{ name: 'puppeteer-server', version: pkg.version },
		{ capabilities: { resources: {}, tools: {}, logging: {} } }
	);
	registerTools(server);
	await server.connect(new StdioServerTransport());
})();
