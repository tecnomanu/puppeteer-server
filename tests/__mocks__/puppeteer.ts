/**
 * Mock de Puppeteer para testing
 */

export const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockResolvedValue(['selected-value']),
    hover: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue('evaluation-result'),
    waitForSelector: jest.fn().mockResolvedValue({}),
    content: jest.fn().mockResolvedValue('<html><body>Test Content</body></html>'),
    $: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    setViewport: jest.fn().mockResolvedValue(undefined),
};

export const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
    pages: jest.fn().mockResolvedValue([mockPage]),
    on: jest.fn(),
};

const puppeteer = {
    launch: jest.fn().mockResolvedValue(mockBrowser),
    connect: jest.fn().mockResolvedValue(mockBrowser),
};

export default puppeteer;
