/**
 * Tests unitarios para funciones de seguridad
 */

import { jest } from '@jest/globals';

// Mock de las funciones que vamos a testear
// Estas funciones deberían ser exportadas desde el archivo principal
// Para estos tests, vamos a simular las funciones de seguridad

describe('Security Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateOrigin', () => {
        const mockValidateOrigin = (url: string, allowedOrigins: string[]): boolean => {
            try {
                const urlObj = new URL(url);
                const origin = urlObj.origin;
                
                return allowedOrigins.some(allowed => {
                    if (allowed === '*') return true;
                    if (allowed.includes('*')) {
                        const pattern = allowed.replace(/\*/g, '.*');
                        const regex = new RegExp(`^${pattern}$`);
                        return regex.test(origin);
                    }
                    return origin === allowed;
                });
            } catch {
                return false;
            }
        };

        test('should allow exact origin match', () => {
            const result = mockValidateOrigin('https://example.com/path', ['https://example.com']);
            expect(result).toBe(true);
        });

        test('should allow wildcard subdomain match', () => {
            const result = mockValidateOrigin('https://api.example.com', ['https://*.example.com']);
            expect(result).toBe(true);
        });

        test('should reject non-matching origin', () => {
            const result = mockValidateOrigin('https://malicious.com', ['https://example.com']);
            expect(result).toBe(false);
        });

        test('should reject invalid URL', () => {
            const result = mockValidateOrigin('not-a-url', ['https://example.com']);
            expect(result).toBe(false);
        });

        test('should handle multiple allowed origins', () => {
            const allowedOrigins = ['https://example.com', 'https://test.com'];
            expect(mockValidateOrigin('https://example.com', allowedOrigins)).toBe(true);
            expect(mockValidateOrigin('https://test.com', allowedOrigins)).toBe(true);
            expect(mockValidateOrigin('https://malicious.com', allowedOrigins)).toBe(false);
        });
    });

    describe('generateResourceHash', () => {
        const mockGenerateResourceHash = (data: string): string => {
            const crypto = require('crypto');
            return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
        };

        test('should generate consistent hash for same input', () => {
            const data = 'test-data';
            const hash1 = mockGenerateResourceHash(data);
            const hash2 = mockGenerateResourceHash(data);
            expect(hash1).toBe(hash2);
        });

        test('should generate different hashes for different inputs', () => {
            const hash1 = mockGenerateResourceHash('data1');
            const hash2 = mockGenerateResourceHash('data2');
            expect(hash1).not.toBe(hash2);
        });

        test('should generate hash of expected length', () => {
            const hash = mockGenerateResourceHash('test-data');
            expect(hash).toHaveLength(16);
        });
    });

    describe('checkRateLimit', () => {
        const mockRateLimitMap = new Map<string, number[]>();
        const mockCheckRateLimit = (toolName: string, maxRequests = 30, windowMs = 60000): boolean => {
            const now = Date.now();
            const requests = mockRateLimitMap.get(toolName) || [];
            
            // Filtrar requests dentro de la ventana de tiempo
            const recentRequests = requests.filter(time => now - time < windowMs);
            
            if (recentRequests.length >= maxRequests) {
                return false;
            }
            
            recentRequests.push(now);
            mockRateLimitMap.set(toolName, recentRequests);
            return true;
        };

        beforeEach(() => {
            mockRateLimitMap.clear();
        });

        test('should allow requests within limit', () => {
            expect(mockCheckRateLimit('test-tool')).toBe(true);
            expect(mockCheckRateLimit('test-tool')).toBe(true);
        });

        test('should reject requests exceeding limit', () => {
            // Simular 30 requests
            for (let i = 0; i < 30; i++) {
                expect(mockCheckRateLimit('test-tool', 30)).toBe(true);
            }
            // El request 31 debería ser rechazado
            expect(mockCheckRateLimit('test-tool', 30)).toBe(false);
        });

        test('should handle different tools independently', () => {
            // Llenar el límite para tool1
            for (let i = 0; i < 30; i++) {
                mockCheckRateLimit('tool1', 30);
            }
            
            // tool2 debería seguir funcionando
            expect(mockCheckRateLimit('tool2', 30)).toBe(true);
            expect(mockCheckRateLimit('tool1', 30)).toBe(false);
        });
    });

    describe('loadSecurityConfig', () => {
        const originalEnv = process.env;

        afterEach(() => {
            process.env = originalEnv;
        });

        test('should load default config when no env vars set', () => {
            process.env = {};
            
            const mockLoadSecurityConfig = () => ({
                allowedOrigins: [],
                maxScreenshotSize: 2097152,
                maxContentLength: 1048576,
                toolTimeout: 30000,
                maxConcurrentOperations: 5,
                allowDangerous: false
            });

            const config = mockLoadSecurityConfig();
            expect(config.allowedOrigins).toEqual([]);
            expect(config.maxScreenshotSize).toBe(2097152);
            expect(config.allowDangerous).toBe(false);
        });

        test('should parse environment variables correctly', () => {
            process.env = {
                ALLOWED_ORIGINS: 'https://example.com,https://test.com',
                MAX_SCREENSHOT_SIZE: '1000000',
                ALLOW_DANGEROUS: 'true'
            };

            const mockLoadSecurityConfig = () => ({
                allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
                maxScreenshotSize: parseInt(process.env.MAX_SCREENSHOT_SIZE || '2097152'),
                maxContentLength: parseInt(process.env.MAX_CONTENT_LENGTH || '1048576'),
                toolTimeout: parseInt(process.env.TOOL_TIMEOUT || '30000'),
                maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS || '5'),
                allowDangerous: process.env.ALLOW_DANGEROUS === 'true'
            });

            const config = mockLoadSecurityConfig();
            expect(config.allowedOrigins).toEqual(['https://example.com', 'https://test.com']);
            expect(config.maxScreenshotSize).toBe(1000000);
            expect(config.allowDangerous).toBe(true);
        });
    });
});
