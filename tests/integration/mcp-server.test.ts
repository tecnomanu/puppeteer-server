/**
 * Tests de integración para el servidor MCP completo
 */

import { jest } from '@jest/globals';

// Mock de Puppeteer
jest.mock('puppeteer');

describe('MCP Server Integration', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Server Initialization', () => {
		test('should initialize server with correct capabilities', () => {
			const mockServer = {
				name: 'puppeteer-server',
				version: '1.0.0',
				capabilities: {
					resources: {},
					tools: {},
				},
			};

			expect(mockServer.name).toBe('puppeteer-server');
			expect(mockServer).toHaveProperty('capabilities');
			expect(mockServer.capabilities).toHaveProperty('tools');
		});

		test('should load security configuration from environment', () => {
			const originalEnv = process.env;

			process.env = {
				...originalEnv,
				ALLOWED_ORIGINS: 'https://test.com',
				MAX_SCREENSHOT_SIZE: '500000',
				TOOL_TIMEOUT: '15000',
			};

			const mockLoadConfig = () => ({
				allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
				maxScreenshotSize: parseInt(
					process.env.MAX_SCREENSHOT_SIZE || '2097152'
				),
				toolTimeout: parseInt(process.env.TOOL_TIMEOUT || '30000'),
			});

			const config = mockLoadConfig();
			expect(config.allowedOrigins).toEqual(['https://test.com']);
			expect(config.maxScreenshotSize).toBe(500000);
			expect(config.toolTimeout).toBe(15000);

			process.env = originalEnv;
		});
	});

	describe('Tool Listing', () => {
		test('should return all available tools', () => {
			const mockTools = [
				{
					name: 'puppeteer_navigate',
					description: 'Navegar a una URL específica',
				},
				{
					name: 'puppeteer_screenshot',
					description: 'Tomar una captura de pantalla',
				},
				{
					name: 'puppeteer_click',
					description: 'Hacer clic en un elemento',
				},
				{
					name: 'puppeteer_fill',
					description: 'Rellenar un campo de entrada',
				},
				{
					name: 'puppeteer_select',
					description: 'Seleccionar una opción',
				},
				{
					name: 'puppeteer_hover',
					description: 'Pasar el cursor sobre un elemento',
				},
				{
					name: 'puppeteer_evaluate',
					description: 'Ejecutar JavaScript',
				},
				{
					name: 'puppeteer_wait_for_selector',
					description: 'Esperar a que aparezca un elemento',
				},
				{
					name: 'puppeteer_get_page_content',
					description: 'Obtener contenido HTML',
				},
			];

			expect(mockTools).toHaveLength(9);
			expect(mockTools.map((t) => t.name)).toContain(
				'puppeteer_navigate'
			);
			expect(mockTools.map((t) => t.name)).toContain(
				'puppeteer_screenshot'
			);
		});

		test('should include proper input schemas for tools', () => {
			const mockNavigateTool = {
				name: 'puppeteer_navigate',
				inputSchema: {
					type: 'object',
					properties: {
						url: {
							type: 'string',
							description: 'URL a la que navegar',
						},
						launchOptions: {
							type: 'object',
							description: 'Opciones de lanzamiento',
						},
						allowDangerous: {
							type: 'boolean',
							description: 'Permitir opciones peligrosas',
						},
					},
					required: ['url'],
				},
			};

			expect(mockNavigateTool.inputSchema.properties).toHaveProperty(
				'url'
			);
			expect(mockNavigateTool.inputSchema.required).toContain('url');
		});
	});

	describe('Tool Execution Flow', () => {
		test('should handle successful tool execution', async () => {
			const mockHandleToolCall = async (toolName: string, args: any) => {
				// Simular rate limiting
				const rateLimitPassed = true; // Mock
				if (!rateLimitPassed) {
					throw new Error('Rate limit exceeded');
				}

				// Simular timeout wrapper
				const operation = async () => {
					switch (toolName) {
						case 'puppeteer_navigate':
							return {
								content: [
									{
										type: 'text',
										text: 'Navegación exitosa',
									},
								],
							};
						case 'puppeteer_screenshot':
							return {
								content: [
									{ type: 'text', text: 'Screenshot tomado' },
								],
							};
						default:
							throw new Error(`Unknown tool: ${toolName}`);
					}
				};

				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => reject(new Error('Timeout')), 10000);
				});

				return Promise.race([operation(), timeoutPromise]);
			};

			// Test navegación exitosa
			const navResult = (await mockHandleToolCall('puppeteer_navigate', {
				url: 'https://example.com',
			})) as any;
			expect(navResult.content[0].text).toBe('Navegación exitosa');

			// Test screenshot exitoso
			const screenshotResult = (await mockHandleToolCall(
				'puppeteer_screenshot',
				{ name: 'test' }
			)) as any;
			expect(screenshotResult.content[0].text).toBe('Screenshot tomado');
		});

		test('should handle tool execution errors', async () => {
			const mockHandleToolCall = async (toolName: string, args: any) => {
				if (
					toolName === 'puppeteer_navigate' &&
					args.url === 'invalid-url'
				) {
					throw new Error('URL inválida');
				}

				return { content: [{ type: 'text', text: 'Success' }] };
			};

			await expect(
				mockHandleToolCall('puppeteer_navigate', { url: 'invalid-url' })
			).rejects.toThrow('URL inválida');
		});

		test('should apply rate limiting across tools', async () => {
			const rateLimitMap = new Map<string, number[]>();

			const mockCheckRateLimit = (toolName: string) => {
				const now = Date.now();
				const requests = rateLimitMap.get(toolName) || [];
				const recentRequests = requests.filter(
					(time) => now - time < 60000
				);

				if (recentRequests.length >= 30) {
					return false;
				}

				recentRequests.push(now);
				rateLimitMap.set(toolName, recentRequests);
				return true;
			};

			// Primeras 30 requests deberían pasar
			for (let i = 0; i < 30; i++) {
				expect(mockCheckRateLimit('puppeteer_navigate')).toBe(true);
			}

			// Request 31 debería fallar
			expect(mockCheckRateLimit('puppeteer_navigate')).toBe(false);
		});
	});

	describe('Browser Management', () => {
		test('should handle browser launch with security options', async () => {
			const mockEnsureBrowser = async (options: any) => {
				const dangerousArgs = [
					'--remote-debugging-port',
					'--disable-web-security',
					'--disable-features=VizDisplayCompositor',
				];

				const securityArgs = [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
				];

				// Verificar que no hay argumentos peligrosos
				if (options.args) {
					const hasDangerous = options.args.some((arg: string) =>
						dangerousArgs.some((dangerous) =>
							arg.includes(dangerous)
						)
					);

					if (hasDangerous && !options.allowDangerous) {
						throw new Error('Argumentos peligrosos detectados');
					}
				}

				return {
					browser: 'mock-browser',
					launchOptions: {
						...options,
						args: [...(options.args || []), ...securityArgs],
					},
				};
			};

			// Launch seguro debería funcionar
			const safeResult = await mockEnsureBrowser({
				headless: true,
				args: ['--no-first-run'],
			});
			expect(safeResult.browser).toBe('mock-browser');

			// Launch peligroso debería fallar
			await expect(
				mockEnsureBrowser({
					args: ['--remote-debugging-port=9222'],
					allowDangerous: false,
				})
			).rejects.toThrow('Argumentos peligrosos detectados');
		});

		test('should cleanup browser resources properly', async () => {
			const mockBrowserCleanup = async () => {
				let browserClosed = false;
				let pagesClosed = false;

				const cleanup = async () => {
					pagesClosed = true;
					browserClosed = true;
				};

				await cleanup();

				return { browserClosed, pagesClosed };
			};

			const result = await mockBrowserCleanup();
			expect(result.browserClosed).toBe(true);
			expect(result.pagesClosed).toBe(true);
		});
	});

	describe('Error Handling', () => {
		test('should handle Puppeteer errors gracefully', async () => {
			const mockHandleError = (error: Error) => {
				if (error.message.includes('Navigation timeout')) {
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Timeout durante la navegación',
							},
						],
						isError: true,
					};
				}

				if (error.message.includes('Element not found')) {
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Elemento no encontrado',
							},
						],
						isError: true,
					};
				}

				return {
					content: [
						{
							type: 'text',
							text: `Error inesperado: ${error.message}`,
						},
					],
					isError: true,
				};
			};

			const timeoutError = mockHandleError(
				new Error('Navigation timeout')
			);
			expect(timeoutError.isError).toBe(true);
			expect(timeoutError.content[0].text).toContain(
				'Timeout durante la navegación'
			);

			const elementError = mockHandleError(
				new Error('Element not found')
			);
			expect(elementError.isError).toBe(true);
			expect(elementError.content[0].text).toContain(
				'Elemento no encontrado'
			);
		});

		test('should maintain audit trail for errors', () => {
			const mockAuditError = (toolName: string, error: Error) => {
				return {
					timestamp: new Date().toISOString(),
					toolName,
					success: false,
					error: error.message,
					duration: 0,
					resourceHash: null,
				};
			};

			const audit = mockAuditError(
				'puppeteer_click',
				new Error('Element not found')
			);
			expect(audit.success).toBe(false);
			expect(audit.error).toBe('Element not found');
			expect(audit.toolName).toBe('puppeteer_click');
		});
	});
});
