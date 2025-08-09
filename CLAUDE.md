# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an unofficial Yahoo Finance API MCP (Model Context Protocol) server that provides a simple interface to retrieve stock market data through Yahoo Finance. The server is built with TypeScript and uses the `@modelcontextprotocol/sdk` framework.

## Common Development Commands
- `npm run build` - Build the project using esbuild (creates bundled output in build/index.js)
- `npm run dev` - Start development server with file watching using tsx
- `npm install` - Install dependencies

## Project Architecture
- **Single entry point**: `src/index.ts` contains the entire MCP server implementation
- **MCP Server**: Uses `@modelcontextprotocol/sdk` to create a server that communicates via stdio
- **Yahoo Finance Integration**: Uses `yahoo-finance2` library to fetch stock data
- **Tool Definition**: Implements one tool called `getStockHistory` with schema validation using Zod
- **Date Handling**: Contains a helper function `getStartDate()` that converts period strings to Date objects

## Code Style & Tools
- **Linter/Formatter**: Uses Biome with tab indentation and double quotes
- **TypeScript**: Configured for ES2022 with Node16 module resolution
- **Build Tool**: esbuild for bundling and minification

## Key Implementation Details
- The server exposes a single tool `getStockHistory` that accepts:
  - `symbol` (required): Stock symbol string
  - `period` (required): Time period string
  - `interval` (optional): Data interval ("1d", "1wk", "1mo")
- Error handling wraps the Yahoo Finance API calls and returns formatted error messages
- The server runs as a command-line tool and communicates via stdio transport