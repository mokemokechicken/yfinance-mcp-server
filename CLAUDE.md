# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an unofficial Yahoo Finance API MCP (Model Context Protocol) server that provides a simple interface to retrieve stock market data through Yahoo Finance. The server is built with TypeScript and uses the `@modelcontextprotocol/sdk` framework.

## Common Development Commands
- `npm run build` - Build the project using esbuild (creates bundled output in build/index.js)
- `npm run dev` - Start development server with file watching using tsx
- `npm run lint` - Run Biome linter on src/ folder
- `npm run lint:fix` - Run Biome linter with automatic fixes
- `npm run format` - Format code using Biome
- `npm run check` - Run Biome lint and format checks
- `npm run check:fix` - Run Biome lint and format with automatic fixes
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run all tests in tests/ directory using tsx test runner
- `npm run test:individual` - Run individual test files with tsx --test
- `npm install` - Install dependencies

## Project Architecture
- **Entry Point**: `src/index.ts` contains the MCP server implementation with the main `getStockHistory` tool
- **Technical Indicators Library**: `src/lib/technical-indicators/` contains a comprehensive technical analysis system:
  - **Core Components**: `TechnicalAnalyzer` class for coordinated analysis
  - **Individual Indicators**: RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, VWAP, Volume Analysis, Cross Detection
  - **Utilities**: Calculator, DataProcessor, ValidationUtils for data processing and validation
  - **Type System**: Comprehensive TypeScript interfaces and error classes
- **MCP Server**: Uses `@modelcontextprotocol/sdk` to create a server that communicates via stdio
- **Yahoo Finance Integration**: Uses `yahoo-finance2` library to fetch stock data
- **Testing**: Comprehensive test suite covering individual indicators and utility functions

## Code Style & Tools
- **Linter/Formatter**: Uses Biome with tab indentation and double quotes
- **TypeScript**: Configured for ES2022 with bundler module resolution (Node20+ compatible)  
- **Build Tool**: esbuild for bundling and minification
- **Test Runner**: Native Node.js test runner via tsx --test

## Key Implementation Details
- The server exposes a single tool `getStockHistory` that accepts:
  - `symbol` (required): Stock symbol string
  - `period` (required): Time period string
  - `interval` (optional): Data interval ("1d", "1wk", "1mo")
- Error handling wraps the Yahoo Finance API calls and returns formatted error messages
- The server runs as a command-line tool and communicates via stdio transport
- Date handling includes a helper function `getStartDate()` that converts period strings to Date objects

## Technical Indicators System
The technical indicators library is modular and extensible:
- Each indicator is implemented as a separate calculator class with static methods
- The `TechnicalAnalyzer` class coordinates multiple indicators for comprehensive analysis
- All calculations handle edge cases and data validation
- RSI calculations include proper warmup period handling for accuracy
- MACD includes signal line and histogram calculations
- Comprehensive error handling with custom error classes