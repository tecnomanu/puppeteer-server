# Agent Contribution Guide

This repository provides a Puppeteer MCP server. Follow these rules when contributing:

## Commit conventions
- Use Conventional Commits with emojis.
- See `.cursor/rules/commit-conventions.mdc` for detailed rules.

## Project structure
- `src/index.ts` selects the transport (STDIO by default, HTTP when `MCP_TRANSPORT=http`).
- `src/http.ts` hosts the Express-based SSE server for HTTP transport.
- `src/register-tools.ts` contains tool registration logic reused by both transports.
- `tests/` holds unit and integration tests.

## Documentation
- When you change `README.md`, make the equivalent update in `README_es.md`.
- Installation and usage instructions for agents are in `README_FOR_AGENTS.md`.

## Testing
- Run `pnpm test` and ensure it passes before committing.
