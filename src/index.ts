#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	CallToolResult,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
	Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'crypto';
import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';

// Configuración de seguridad
interface SecurityConfig {
	allowedOrigins: string[];
	maxScreenshotSize: number;
	maxContentLength: number;
	toolTimeout: number;
	maxConcurrentOperations: number;
	allowDangerous: boolean;
}

// Rate limiting
interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_REQUESTS_PER_MINUTE = 30;

// Configuración de seguridad por defecto
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
	allowedOrigins: [], // Lista blanca vacía por defecto - debe configurarse explícitamente
	maxScreenshotSize: 2 * 1024 * 1024, // 2MB max para screenshots
	maxContentLength: 1 * 1024 * 1024, // 1MB max para contenido HTML
	toolTimeout: 30000, // 30 segundos timeout por herramienta
	maxConcurrentOperations: 3, // Máximo 3 operaciones concurrentes
	allowDangerous: false,
};

// Cargar configuración de seguridad desde variables de entorno
function loadSecurityConfig(): SecurityConfig {
	const config = { ...DEFAULT_SECURITY_CONFIG };

	// Cargar lista blanca de dominios
	if (process.env.ALLOWED_ORIGINS) {
		try {
			config.allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')
				.map((origin) => origin.trim())
				.filter((origin) => origin.length > 0);
		} catch (error) {
			console.error('Error parseando ALLOWED_ORIGINS:', error);
		}
	}

	// Otras configuraciones
	if (process.env.MAX_SCREENSHOT_SIZE) {
		config.maxScreenshotSize =
			parseInt(process.env.MAX_SCREENSHOT_SIZE) ||
			config.maxScreenshotSize;
	}

	if (process.env.MAX_CONTENT_LENGTH) {
		config.maxContentLength =
			parseInt(process.env.MAX_CONTENT_LENGTH) || config.maxContentLength;
	}

	if (process.env.TOOL_TIMEOUT) {
		config.toolTimeout =
			parseInt(process.env.TOOL_TIMEOUT) || config.toolTimeout;
	}

	config.allowDangerous = process.env.ALLOW_DANGEROUS === 'true';

	return config;
}

const securityConfig = loadSecurityConfig();

// Logging estructurado
interface AuditLog {
	timestamp: string;
	toolName: string;
	args: any;
	success: boolean;
	duration: number;
	resourceHash?: string;
	error?: string;
	clientId?: string;
}

function logAudit(entry: AuditLog): void {
	const logEntry = {
		...entry,
		timestamp: new Date().toISOString(),
		level: 'AUDIT',
		service: 'puppeteer-server',
	};

	// Log estructurado en formato JSON para facilitar análisis
	console.error(JSON.stringify(logEntry));
}

// Validación de dominios permitidos
function validateOrigin(url: string): boolean {
	if (securityConfig.allowedOrigins.length === 0) {
		console.warn(
			'⚠️  ADVERTENCIA: No hay dominios configurados en ALLOWED_ORIGINS. Todas las URLs serán rechazadas por seguridad.'
		);
		return false;
	}

	try {
		const urlObj = new URL(url);
		const origin = `${urlObj.protocol}//${urlObj.hostname}`;

		return securityConfig.allowedOrigins.some((allowedOrigin) => {
			// Permitir coincidencias exactas y wildcards básicos
			if (allowedOrigin === '*') return true;
			if (allowedOrigin === origin) return true;
			if (
				allowedOrigin.startsWith('*.') &&
				urlObj.hostname.endsWith(allowedOrigin.slice(2))
			)
				return true;
			return false;
		});
	} catch (error) {
		console.error('Error validando origen:', error);
		return false;
	}
}

// Rate limiting
function checkRateLimit(toolName: string): boolean {
	const now = Date.now();
	const key = `${toolName}`;
	const entry = rateLimitMap.get(key);

	if (!entry || now > entry.resetTime) {
		rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		return true;
	}

	if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
		return false;
	}

	entry.count++;
	return true;
}

// Hash para recursos
function generateResourceHash(data: string): string {
	return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Definición de las herramientas disponibles
const TOOLS: Tool[] = [
	{
		name: 'puppeteer_navigate',
		description: 'Navegar a una URL específica',
		inputSchema: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
					description: 'URL a la que navegar',
				},
				launchOptions: {
					type: 'object',
					description:
						"Opciones de lanzamiento de Puppeteer. Si se cambian, el navegador se reinicia. Ejemplo: { headless: true, args: ['--no-sandbox'] }",
				},
				allowDangerous: {
					type: 'boolean',
					description:
						'Permitir opciones peligrosas que reducen la seguridad. Por defecto false.',
				},
			},
			required: ['url'],
		},
	},
	{
		name: 'puppeteer_screenshot',
		description:
			'Tomar una captura de pantalla de la página actual o un elemento específico',
		inputSchema: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description: 'Nombre para la captura de pantalla',
				},
				selector: {
					type: 'string',
					description:
						'Selector CSS del elemento a capturar (opcional)',
				},
				width: {
					type: 'number',
					description: 'Ancho en píxeles (por defecto: 800)',
				},
				height: {
					type: 'number',
					description: 'Alto en píxeles (por defecto: 600)',
				},
				encoded: {
					type: 'boolean',
					description:
						'Si es true, captura la imagen como data URI base64. Por defecto false.',
				},
			},
			required: ['name'],
		},
	},
	{
		name: 'puppeteer_click',
		description: 'Hacer clic en un elemento de la página',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description: 'Selector CSS del elemento a hacer clic',
				},
			},
			required: ['selector'],
		},
	},
	{
		name: 'puppeteer_fill',
		description: 'Rellenar un campo de entrada',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description: 'Selector CSS del campo de entrada',
				},
				value: {
					type: 'string',
					description: 'Valor a introducir',
				},
			},
			required: ['selector', 'value'],
		},
	},
	{
		name: 'puppeteer_select',
		description: 'Seleccionar una opción en un elemento SELECT',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description: 'Selector CSS del elemento SELECT',
				},
				value: {
					type: 'string',
					description: 'Valor a seleccionar',
				},
			},
			required: ['selector', 'value'],
		},
	},
	{
		name: 'puppeteer_hover',
		description: 'Pasar el cursor sobre un elemento',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description:
						'Selector CSS del elemento sobre el que pasar el cursor',
				},
			},
			required: ['selector'],
		},
	},
	{
		name: 'puppeteer_evaluate',
		description: 'Ejecutar JavaScript en la consola del navegador',
		inputSchema: {
			type: 'object',
			properties: {
				script: {
					type: 'string',
					description: 'Código JavaScript a ejecutar',
				},
			},
			required: ['script'],
		},
	},
	{
		name: 'puppeteer_wait_for_selector',
		description: 'Esperar a que aparezca un elemento en la página',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description: 'Selector CSS del elemento a esperar',
				},
				timeout: {
					type: 'number',
					description:
						'Tiempo de espera en milisegundos (por defecto: 30000)',
				},
			},
			required: ['selector'],
		},
	},
	{
		name: 'puppeteer_get_page_content',
		description: 'Obtener el contenido HTML de la página actual',
		inputSchema: {
			type: 'object',
			properties: {
				selector: {
					type: 'string',
					description:
						'Selector CSS para obtener contenido específico (opcional)',
				},
			},
			required: [],
		},
	},
];

// Estado global
let browser: Browser | null = null;
let page: Page | null = null;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();
let previousLaunchOptions: LaunchOptions | null = null;

/**
 * Asegurar que el navegador esté ejecutándose con las opciones correctas
 */
async function ensureBrowser({
	launchOptions,
	allowDangerous,
}: {
	launchOptions?: LaunchOptions;
	allowDangerous?: boolean;
}): Promise<Page> {
	const DANGEROUS_ARGS = [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--single-process',
		'--disable-web-security',
		'--ignore-certificate-errors',
		'--disable-features=IsolateOrigins',
		'--disable-site-isolation-trials',
		'--allow-running-insecure-content',
		'--disable-dev-shm-usage',
		'--remote-debugging-port',
		'--remote-debugging-address',
		'--allow-pre-commit-input',
		'--disable-background-timer-throttling',
		'--disable-backgrounding-occluded-windows',
		'--disable-renderer-backgrounding',
	];

	// Argumentos de seguridad recomendados
	const SECURITY_ARGS = [
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-default-apps',
		'--disable-extensions',
		'--disable-plugins',
		'--disable-sync',
		'--disable-translate',
		'--disable-background-networking',
		'--disable-component-extensions-with-background-pages',
		'--disable-ipc-flooding-protection', // Solo para testing controlado
	];

	// Parsear configuración del entorno de forma segura
	let envConfig: LaunchOptions = {};
	try {
		envConfig = JSON.parse(process.env.PUPPETEER_LAUNCH_OPTIONS || '{}');
	} catch (error: any) {
		console.warn(
			'No se pudo parsear PUPPETEER_LAUNCH_OPTIONS:',
			error?.message || error
		);
	}

	// Combinar configuración del entorno con opciones del usuario
	const mergedConfig = deepMerge(envConfig, launchOptions || {});

	// Validación de seguridad para configuración combinada
	if (mergedConfig?.args) {
		const dangerousArgs = mergedConfig.args?.filter?.((arg: string) =>
			DANGEROUS_ARGS.some((dangerousArg) => arg.startsWith(dangerousArg))
		);
		if (
			dangerousArgs?.length > 0 &&
			!(allowDangerous || process.env.ALLOW_DANGEROUS === 'true')
		) {
			throw new Error(
				`Argumentos peligrosos del navegador detectados: ${dangerousArgs.join(
					', '
				)}. ` +
					'Establece allowDangerous: true en los argumentos de la herramienta para anular.'
			);
		}
	}

	try {
		if (
			(browser && !browser.connected) ||
			(launchOptions &&
				JSON.stringify(launchOptions) !=
					JSON.stringify(previousLaunchOptions))
		) {
			await browser?.close();
			browser = null;
		}
	} catch (error) {
		browser = null;
	}

	previousLaunchOptions = launchOptions || null;

	if (!browser) {
		// Configuración base segura
		const baseSecureArgs = [
			...SECURITY_ARGS,
			'--disable-gpu',
			'--no-zygote',
		];

		// Configuración para desarrollo (npx)
		const npx_args = {
			headless: false,
			args: baseSecureArgs,
			defaultViewport: { width: 1280, height: 720 },
		};

		// Configuración para Docker (más restrictiva)
		const docker_args = {
			headless: true,
			args: [
				...baseSecureArgs,
				'--no-sandbox', // Necesario en Docker
				'--single-process', // Necesario en algunos contenedores
				'--disable-dev-shm-usage', // Prevenir problemas de memoria en Docker
			],
			defaultViewport: { width: 1280, height: 720 },
		};

		// Usar configuración base según el entorno
		const baseConfig = process.env.DOCKER_CONTAINER
			? docker_args
			: npx_args;

		// Aplicar configuraciones adicionales del usuario
		const finalConfig = deepMerge(baseConfig, mergedConfig);

		// Log de configuración para auditoría
		console.error(
			`Iniciando navegador con configuración: ${JSON.stringify({
				headless: finalConfig.headless,
				argsCount: finalConfig.args?.length || 0,
				isDocker: !!process.env.DOCKER_CONTAINER,
			})}`
		);

		browser = await puppeteer.launch(finalConfig);

		const pages = await browser.pages();
		page = pages[0];

		// Configurar listener para logs de consola
		page.on('console', (msg) => {
			const logEntry = `[${msg.type()}] ${msg.text()}`;
			consoleLogs.push(logEntry);
			server.notification({
				method: 'notifications/resources/updated',
				params: { uri: 'console://logs' },
			});
		});
	}

	return page!;
}

/**
 * Función de utilidad para combinar objetos profundamente
 */
function deepMerge(target: any, source: any): any {
	const output = Object.assign({}, target);
	if (typeof target !== 'object' || typeof source !== 'object') return source;

	for (const key of Object.keys(source)) {
		const targetVal = target[key];
		const sourceVal = source[key];

		if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
			// Desduplicar args/ignoreDefaultArgs, preferir valores fuente
			output[key] = [
				...new Set([
					...(key === 'args' || key === 'ignoreDefaultArgs'
						? targetVal.filter(
								(arg: string) =>
									!sourceVal.some(
										(launchArg: string) =>
											arg.startsWith('--') &&
											launchArg.startsWith(
												arg.split('=')[0]
											)
									)
							)
						: targetVal),
					...sourceVal,
				]),
			];
		} else if (sourceVal instanceof Object && key in target) {
			output[key] = deepMerge(targetVal, sourceVal);
		} else {
			output[key] = sourceVal;
		}
	}

	return output;
}

/**
 * Manejar llamadas a herramientas con medidas de seguridad
 */
async function handleToolCall(
	name: string,
	args: any
): Promise<CallToolResult> {
	const startTime = Date.now();
	let auditLog: Partial<AuditLog> = {
		toolName: name,
		args: {
			...args,
			script: args.script ? '[SCRIPT_REDACTED]' : undefined,
		}, // No logear scripts completos
		success: false,
		duration: 0,
	};

	try {
		// Rate limiting
		if (!checkRateLimit(name)) {
			auditLog.error = 'Rate limit exceeded';
			logAudit(auditLog as AuditLog);
			return {
				content: [
					{
						type: 'text' as const,
						text: 'Error: Límite de velocidad excedido. Intenta nuevamente en un minuto.',
					},
				],
				isError: true,
			};
		}

		// Timeout wrapper para todas las operaciones
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error('Timeout de operación')),
				securityConfig.toolTimeout
			);
		});

		const operationPromise = (async () => {
			const page = await ensureBrowser(args);

			switch (name) {
				case 'puppeteer_navigate':
					// Validar dominio permitido
					if (!validateOrigin(args.url)) {
						throw new Error(
							`Dominio no permitido: ${args.url}. Configure ALLOWED_ORIGINS.`
						);
					}

					await page.goto(args.url, {
						waitUntil: 'networkidle2',
						timeout: securityConfig.toolTimeout,
					});

					auditLog.resourceHash = generateResourceHash(args.url);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Navegado exitosamente a ${args.url}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_screenshot': {
					const width = Math.min(args.width ?? 800, 1920); // Limitar ancho máximo
					const height = Math.min(args.height ?? 600, 1080); // Limitar alto máximo
					const encoded = args.encoded ?? false;

					await page.setViewport({ width, height });
					const screenshot = await (args.selector
						? (await page.$(args.selector))?.screenshot({
								encoding: 'base64',
							})
						: page.screenshot({
								encoding: 'base64',
								fullPage: false,
							}));

					if (!screenshot) {
						throw new Error(
							args.selector
								? `Elemento no encontrado: ${args.selector}`
								: 'Captura de pantalla falló'
						);
					}

					// Validar tamaño de la captura
					const screenshotSize = Buffer.from(
						screenshot as string,
						'base64'
					).length;
					if (screenshotSize > securityConfig.maxScreenshotSize) {
						throw new Error(
							`Captura de pantalla demasiado grande: ${Math.round(
								screenshotSize / 1024
							)}KB. Máximo permitido: ${Math.round(
								securityConfig.maxScreenshotSize / 1024
							)}KB`
						);
					}

					screenshots.set(args.name, screenshot as string);
					auditLog.resourceHash = generateResourceHash(
						screenshot as string
					);

					server.notification({
						method: 'notifications/resources/list_changed',
					});

					return {
						content: [
							{
								type: 'text' as const,
								text: `Captura de pantalla '${
									args.name
								}' tomada en ${width}x${height} (${Math.round(
									screenshotSize / 1024
								)}KB)`,
							},
							...(encoded
								? [
										{
											type: 'text' as const,
											text: `data:image/png;base64,${screenshot}`,
										},
									]
								: [
										{
											type: 'image' as const,
											data: screenshot as string,
											mimeType: 'image/png',
										},
									]),
						],
						isError: false,
					};
				}

				case 'puppeteer_click':
					await page.click(args.selector);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Clic realizado en: ${args.selector}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_fill':
					await page.waitForSelector(args.selector);
					await page.focus(args.selector);
					await page.keyboard.down('Control');
					await page.keyboard.press('KeyA');
					await page.keyboard.up('Control');
					await page.type(args.selector, args.value);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Campo ${args.selector} rellenado con: ${args.value}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_select':
					await page.waitForSelector(args.selector);
					await page.select(args.selector, args.value);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Seleccionado ${args.value} en ${args.selector}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_hover':
					await page.waitForSelector(args.selector);
					await page.hover(args.selector);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Cursor pasado sobre ${args.selector}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_evaluate':
					// Configurar helper para capturar logs
					await page.evaluate(() => {
						(window as any).mcpHelper = {
							logs: [],
							originalConsole: { ...console },
						};
						['log', 'info', 'warn', 'error'].forEach((method) => {
							(console as any)[method] = (...args: any[]) => {
								(window as any).mcpHelper.logs.push(
									`[${method}] ${args.join(' ')}`
								);
								(window as any).mcpHelper.originalConsole[
									method
								](...args);
							};
						});
					});

					const result = await page.evaluate(args.script);
					const logs = await page.evaluate(() => {
						Object.assign(
							console,
							(window as any).mcpHelper.originalConsole
						);
						const logs = (window as any).mcpHelper.logs;
						delete (window as any).mcpHelper;
						return logs;
					});

					return {
						content: [
							{
								type: 'text' as const,
								text: `Resultado de ejecución:\n${JSON.stringify(
									result,
									null,
									2
								)}\n\nSalida de consola:\n${logs.join('\n')}`,
							},
						],
						isError: false,
					};

				case 'puppeteer_wait_for_selector':
					const timeout = args.timeout ?? 30000;
					await page.waitForSelector(args.selector, { timeout });
					return {
						content: [
							{
								type: 'text' as const,
								text: `Elemento ${args.selector} encontrado y visible`,
							},
						],
						isError: false,
					};

				case 'puppeteer_get_page_content':
					const content = args.selector
						? await page.$eval(args.selector, (el) => el.innerHTML)
						: await page.content();

					// Validar tamaño del contenido
					if (content.length > securityConfig.maxContentLength) {
						const truncatedContent =
							content.substring(
								0,
								securityConfig.maxContentLength
							) + '\n[CONTENIDO TRUNCADO POR SEGURIDAD]';
						auditLog.resourceHash = generateResourceHash(content);
						return {
							content: [
								{
									type: 'text' as const,
									text: `Contenido de la página${
										args.selector
											? ` (${args.selector})`
											: ''
									} (${Math.round(
										content.length / 1024
									)}KB, truncado):\n${truncatedContent}`,
								},
							],
							isError: false,
						};
					}

					auditLog.resourceHash = generateResourceHash(content);
					return {
						content: [
							{
								type: 'text' as const,
								text: `Contenido de la página${
									args.selector ? ` (${args.selector})` : ''
								} (${Math.round(
									content.length / 1024
								)}KB):\n${content}`,
							},
						],
						isError: false,
					};

				default:
					throw new Error(`Herramienta desconocida: ${name}`);
			}
		})();

		// Ejecutar con timeout
		const result = await Promise.race([operationPromise, timeoutPromise]);

		auditLog.success = true;
		auditLog.duration = Date.now() - startTime;
		logAudit(auditLog as AuditLog);

		return result;
	} catch (error: any) {
		auditLog.success = false;
		auditLog.duration = Date.now() - startTime;
		auditLog.error = error.message;
		logAudit(auditLog as AuditLog);

		return {
			content: [
				{
					type: 'text' as const,
					text: `Error ejecutando ${name}: ${error.message}`,
				},
			],
			isError: true,
		};
	}
}

// Crear servidor MCP
const server = new Server(
	{
		name: 'puppeteer-server',
		version: '1.0.0',
	},
	{
		capabilities: {
			resources: {},
			tools: {},
		},
	}
);

// Configurar manejadores de solicitudes
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
	resources: [
		{
			uri: 'console://logs',
			mimeType: 'text/plain',
			name: 'Logs de la consola del navegador',
		},
		...Array.from(screenshots.keys()).map((name) => ({
			uri: `screenshot://${name}`,
			mimeType: 'image/png',
			name: `Captura de pantalla: ${name}`,
		})),
	],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
	const uri = request.params.uri.toString();

	if (uri === 'console://logs') {
		return {
			contents: [
				{
					uri,
					mimeType: 'text/plain',
					text: consoleLogs.join('\n'),
				},
			],
		};
	}

	if (uri.startsWith('screenshot://')) {
		const name = uri.split('://')[1];
		const screenshot = screenshots.get(name);
		if (screenshot) {
			return {
				contents: [
					{
						uri,
						mimeType: 'image/png',
						blob: screenshot,
					},
				],
			};
		}
	}

	throw new Error(`Recurso no encontrado: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
	handleToolCall(request.params.name, request.params.arguments ?? {})
);

/**
 * Ejecutar el servidor
 */
async function runServer() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('Servidor MCP Puppeteer iniciado correctamente');
}

// Manejar cierre del proceso
process.stdin.on('close', async () => {
	console.error('Servidor MCP Puppeteer cerrándose...');
	if (browser) {
		await browser.close();
	}
	server.close();
});

process.on('SIGINT', async () => {
	console.error('Recibida señal SIGINT, cerrando servidor...');
	if (browser) {
		await browser.close();
	}
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.error('Recibida señal SIGTERM, cerrando servidor...');
	if (browser) {
		await browser.close();
	}
	process.exit(0);
});

// Iniciar servidor
runServer().catch((error) => {
	console.error('Error iniciando el servidor:', error);
	process.exit(1);
});
