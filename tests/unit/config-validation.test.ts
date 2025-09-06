/**
 * Tests para validar los ejemplos de configuración MCP
 */

import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('MCP Configuration Examples', () => {
    const examplesDir = path.join(process.cwd(), 'examples');

    beforeAll(() => {
        // Verificar que la carpeta examples existe
        expect(fs.existsSync(examplesDir)).toBe(true);
    });

    describe('Configuration Files Validation', () => {
        test('should have all required example files', () => {
            const requiredFiles = [
                'mcp-config-example.json',
                'mcp-config-secure-example.json',
                'docker-mcp-config.json',
                'claude-desktop-config.json',
                'README.md'
            ];

            requiredFiles.forEach(file => {
                const filePath = path.join(examplesDir, file);
                expect(fs.existsSync(filePath)).toBe(true);
            });
        });

        test('should have valid JSON structure in config files', () => {
            const jsonFiles = [
                'mcp-config-example.json',
                'mcp-config-secure-example.json',
                'docker-mcp-config.json',
                'claude-desktop-config.json'
            ];

            jsonFiles.forEach(file => {
                const filePath = path.join(examplesDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Debería ser JSON válido
                expect(() => JSON.parse(content)).not.toThrow();
                
                const config = JSON.parse(content);
                
                // Debería tener la estructura básica MCP
                expect(config).toHaveProperty('mcpServers');
                expect(typeof config.mcpServers).toBe('object');
                
                // Debería tener al menos un servidor configurado
                const servers = Object.keys(config.mcpServers);
                expect(servers.length).toBeGreaterThan(0);
                
                // Cada servidor debería tener command y args
                servers.forEach(serverName => {
                    const server = config.mcpServers[serverName];
                    expect(server).toHaveProperty('command');
                    expect(server).toHaveProperty('args');
                    expect(Array.isArray(server.args)).toBe(true);
                });
            });
        });
    });

    describe('Basic Configuration', () => {
        test('should have proper basic configuration', () => {
            const configPath = path.join(examplesDir, 'mcp-config-example.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            
            expect(server.command).toBe('node');
            expect(server.args).toContain('RUTA_ABSOLUTA_A_TU_PROYECTO/puppeteer-server/dist/index.js');
            expect(server.env).toHaveProperty('ALLOW_DANGEROUS');
            expect(server.env.ALLOW_DANGEROUS).toBe('false');
        });
    });

    describe('Secure Configuration', () => {
        test('should have proper security settings', () => {
            const configPath = path.join(examplesDir, 'mcp-config-secure-example.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            
            // Verificar configuraciones de seguridad
            expect(server.env).toHaveProperty('ALLOWED_ORIGINS');
            expect(server.env).toHaveProperty('MAX_SCREENSHOT_SIZE');
            expect(server.env).toHaveProperty('MAX_CONTENT_LENGTH');
            expect(server.env).toHaveProperty('TOOL_TIMEOUT');
            expect(server.env).toHaveProperty('ALLOW_DANGEROUS');
            expect(server.env).toHaveProperty('NODE_ENV');

            // Verificar valores de seguridad
            expect(server.env.ALLOW_DANGEROUS).toBe('false');
            expect(server.env.NODE_ENV).toBe('production');
            
            // Verificar que ALLOWED_ORIGINS no es wildcard
            expect(server.env.ALLOWED_ORIGINS).not.toBe('*');
            expect(server.env.ALLOWED_ORIGINS).toContain('https://');
        });

        test('should have reasonable size limits', () => {
            const configPath = path.join(examplesDir, 'mcp-config-secure-example.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            
            const maxScreenshotSize = parseInt(server.env.MAX_SCREENSHOT_SIZE);
            const maxContentLength = parseInt(server.env.MAX_CONTENT_LENGTH);
            const toolTimeout = parseInt(server.env.TOOL_TIMEOUT);

            // Verificar que los límites son razonables
            expect(maxScreenshotSize).toBeGreaterThan(0);
            expect(maxScreenshotSize).toBeLessThanOrEqual(10 * 1024 * 1024); // Max 10MB
            
            expect(maxContentLength).toBeGreaterThan(0);
            expect(maxContentLength).toBeLessThanOrEqual(5 * 1024 * 1024); // Max 5MB
            
            expect(toolTimeout).toBeGreaterThan(1000); // Min 1 segundo
            expect(toolTimeout).toBeLessThanOrEqual(300000); // Max 5 minutos
        });
    });

    describe('Docker Configuration', () => {
        test('should have proper Docker security settings', () => {
            const configPath = path.join(examplesDir, 'docker-mcp-config.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            
            expect(server.command).toBe('docker');
            
            // Verificar argumentos de seguridad de Docker
            const args = server.args;
            expect(args).toContain('--security-opt');
            expect(args).toContain('no-new-privileges:true');
            expect(args).toContain('--cap-drop');
            expect(args).toContain('ALL');
            expect(args).toContain('--user');
            expect(args).toContain('1001:1001');
            expect(args).toContain('--read-only');
            
            // Verificar tmpfs
            const tmpfsArgs = args.filter((arg: string) => arg.startsWith('--tmpfs'));
            expect(tmpfsArgs.length).toBeGreaterThan(0);
        });

        test('should pass security environment variables to container', () => {
            const configPath = path.join(examplesDir, 'docker-mcp-config.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            const args = server.args;

            // Verificar que las variables de entorno de seguridad se pasan
            const envArgs = args.filter((arg: string) => arg === '-e');
            expect(envArgs.length).toBeGreaterThan(0);
            
            // Verificar variables específicas
            const envVars = args.filter((arg: string) => arg.startsWith('ALLOWED_ORIGINS='));
            expect(envVars.length).toBeGreaterThan(0);
        });
    });

    describe('Claude Desktop Configuration', () => {
        test('should have Claude-specific optimizations', () => {
            const configPath = path.join(examplesDir, 'claude-desktop-config.json');
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);

            const server = config.mcpServers['puppeteer-server'];
            
            // Verificar dominios relevantes para Claude
            const allowedOrigins = server.env.ALLOWED_ORIGINS;
            expect(allowedOrigins).toContain('github.com');
            expect(allowedOrigins).toContain('anthropic.com');
            
            // Verificar configuración de desarrollo
            expect(server.env.NODE_ENV).toBe('development');
        });
    });

    describe('Environment Variables Validation', () => {
        test('should validate ALLOWED_ORIGINS format', () => {
            const validateOrigins = (origins: string) => {
                const originList = origins.split(',');
                
                return originList.every(origin => {
                    origin = origin.trim();
                    
                    // Permitir wildcard controlado
                    if (origin.includes('*')) {
                        return origin.match(/^https:\/\/\*\.[a-zA-Z0-9.-]+$/);
                    }
                    
                    // Verificar URL válida
                    try {
                        new URL(origin);
                        return origin.startsWith('https://');
                    } catch {
                        return false;
                    }
                });
            };

            // Orígenes válidos
            expect(validateOrigins('https://example.com')).toBe(true);
            expect(validateOrigins('https://example.com,https://test.com')).toBe(true);
            expect(validateOrigins('https://*.example.com')).toBe(true);

            // Orígenes inválidos
            expect(validateOrigins('http://example.com')).toBe(false); // No HTTPS
            expect(validateOrigins('*')).toBe(false); // Wildcard global
            expect(validateOrigins('invalid-url')).toBe(false); // URL inválida
        });

        test('should validate numeric environment variables', () => {
            const validateNumeric = (value: string, min: number, max: number) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= min && num <= max;
            };

            // Valores válidos
            expect(validateNumeric('1048576', 1024, 10485760)).toBe(true);
            expect(validateNumeric('30000', 1000, 300000)).toBe(true);

            // Valores inválidos
            expect(validateNumeric('not-a-number', 0, 100)).toBe(false);
            expect(validateNumeric('-1', 0, 100)).toBe(false);
            expect(validateNumeric('999999999', 0, 1000)).toBe(false);
        });

        test('should validate boolean environment variables', () => {
            const validateBoolean = (value: string) => {
                return value === 'true' || value === 'false';
            };

            expect(validateBoolean('true')).toBe(true);
            expect(validateBoolean('false')).toBe(true);
            expect(validateBoolean('1')).toBe(false);
            expect(validateBoolean('yes')).toBe(false);
            expect(validateBoolean('')).toBe(false);
        });
    });
});
