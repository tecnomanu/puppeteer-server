# Puppeteer Server - MCP Setup Guide

This document explains how to set up and use the **Puppeteer Server** as a Model Context Protocol (MCP) server.

## Project Overview

Puppeteer Server is a secure MCP server that provides browser automation capabilities using Puppeteer. It enables LLMs to interact with web pages, take screenshots, and execute JavaScript in a real browser environment with enterprise-grade security features.

## Quick Setup

### 1. Installation

```bash
# Clone and build the project
git clone https://github.com/your-username/puppeteer-server.git
cd puppeteer-server
pnpm install
pnpm run build
```

### 2. Configuration

Create your MCP configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "puppeteer-server": {
      "command": "node",
      "args": ["/absolute/path/to/puppeteer-server/dist/index.js"],
      "env": {
        "ALLOWED_ORIGINS": "https://example.com,https://*.trusted.org",
        "MAX_SCREENSHOT_SIZE": "2097152",
        "MAX_CONTENT_LENGTH": "1048576",
        "TOOL_TIMEOUT": "30000",
        "ALLOW_DANGEROUS": "false"
      }
    }
  }
}
```

### 3. Security Configuration

**IMPORTANT**: Configure `ALLOWED_ORIGINS` before use:

```bash
export ALLOWED_ORIGINS="https://example.com,https://*.trusted-domain.org"
```

## Available Tools

The server provides 9 browser automation tools:

- `puppeteer_navigate` - Navigate to URLs (with domain whitelist)
- `puppeteer_screenshot` - Take screenshots with size limits
- `puppeteer_click` - Click elements on pages
- `puppeteer_fill` - Fill form fields
- `puppeteer_select` - Select dropdown options
- `puppeteer_hover` - Hover over elements
- `puppeteer_evaluate` - Execute JavaScript in browser
- `puppeteer_wait_for_selector` - Wait for elements to appear
- `puppeteer_get_page_content` - Extract page content

## Docker Deployment

For production use:

```bash
# Build and run with security
docker build -t puppeteer-server .
docker-compose -f docker-compose.security.yml up
```

## Security Features

- **Domain Whitelist**: Only allowed origins can be accessed
- **Rate Limiting**: 30 requests per minute per tool
- **Size Limits**: Screenshots (2MB) and content (1MB) limits
- **Audit Logging**: All operations are logged with hashes
- **Timeout Protection**: Configurable operation timeouts

