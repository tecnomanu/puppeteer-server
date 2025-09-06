/**
 * Jest Setup File
 * Configuración global para todos los tests
 */

// Aumentar timeout para tests de Puppeteer
jest.setTimeout(30000);

// Mock console.log para tests más limpios
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'https://example.com,https://test.com';
process.env.MAX_SCREENSHOT_SIZE = '1048576';
process.env.MAX_CONTENT_LENGTH = '524288';
process.env.TOOL_TIMEOUT = '10000';
process.env.ALLOW_DANGEROUS = 'false';

// Cleanup después de cada test
afterEach(() => {
    jest.clearAllMocks();
});

// Cleanup después de todos los tests
afterAll(async () => {
    // Dar tiempo para que Puppeteer cierre correctamente
    await new Promise(resolve => setTimeout(resolve, 1000));
});
