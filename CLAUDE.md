# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an unofficial Yahoo Finance API MCP (Model Context Protocol) server that provides AI-friendly comprehensive stock market analysis through Yahoo Finance. The server is built with TypeScript and uses the `@modelcontextprotocol/sdk` framework with a comprehensive technical indicators library.

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

### Make Commands
- `make build` - Build the project
- `make test` - Run tests
- `make lint` - Run linter
- `make check` - Run format/lint checks
- `make typecheck` - Run TypeScript type checking
- `make check-all` - Run all checks (build, test, lint, check, typecheck)
- `make prepare` - Run all checks and prepare for publishing (npm pack --dry-run)
- `make publish` - Build, test, lint, and publish to npm

## Project Architecture
- **Entry Point**: `src/index.ts` contains the MCP server implementation with the main `getStockAnalysis` tool
- **Technical Indicators Library**: `src/lib/technical-indicators/` contains a comprehensive technical analysis system:
  - **Core Components**: `TechnicalAnalyzer` class for coordinated analysis with AI-friendly reporting
  - **Individual Indicators**: RSI (extended), MACD, Moving Averages, Bollinger Bands, Stochastic, VWAP, Volume Analysis, Cross Detection
  - **Financial Indicators**: Enterprise financial metrics, moving average deviation analysis
  - **Utilities**: Calculator, DataProcessor, ValidationUtils, Japanese report generator
  - **Type System**: Comprehensive TypeScript interfaces and error classes with Graceful Degradation
- **MCP Server**: Uses `@modelcontextprotocol/sdk` to create a server that communicates via stdio
- **Yahoo Finance Integration**: Uses `yahoo-finance2` library to fetch stock data and financial metrics
- **Testing**: Comprehensive test suite covering individual indicators and utility functions

## Code Style & Tools
- **Linter/Formatter**: Uses Biome with tab indentation and double quotes
- **TypeScript**: Configured for ES2022 with bundler module resolution (Node20+ compatible)  
- **Build Tool**: esbuild for bundling and minification
- **Test Runner**: Native Node.js test runner via tsx --test

## Key Implementation Details
- The server exposes a single tool `getStockAnalysis` that accepts:
  - `symbol` (required): Stock symbol string (examples: US stocks="AAPL", Japanese stocks="7203.T", crypto="BTC-USD", forex="EURUSD=X")
  - `days` (optional): Number of days for recent price data display (default: 7, range: 1-365)
- **AI-Friendly Output**: Structured Japanese report with emojis and clear categorization for AI understanding
- **Performance Optimized**: Maximum 2 API calls (price data + financial metrics) with comprehensive local calculations
- **Comprehensive Analysis**: Covers financial metrics, technical indicators, and integrated signal analysis
- **Graceful Degradation**: Continues analysis even if some indicators fail to calculate
- Error handling provides user-friendly messages with specific guidance for different error types
- The server runs as a command-line tool and communicates via stdio transport

## Technical Indicators System
The technical indicators library is modular and extensible:

### Core Analysis Engine
- `TechnicalAnalyzer.analyzeStockComprehensive()`: Main entry point for complete analysis
- `calculateExtendedIndicators()`: Calculates all technical indicators with Graceful Degradation
- `generateJapaneseReportFromAnalysis()`: Creates AI-friendly Japanese reports

### Supported Indicators
**Financial Metrics**: Market cap, PER, PBR, ROE, EPS growth, dividend yield, equity ratio
**Basic Indicators**: Moving averages (25/50/200), RSI (14/21), MACD, moving average deviation
**Advanced Indicators**: Bollinger Bands, Stochastic, Golden/Dead cross detection, volume analysis, VWAP
**Signal Analysis**: Integrated trend, momentum, and strength assessment

### Key Features
- **API Optimization**: Parallel data fetching with minimum API calls
- **Graceful Degradation**: Individual indicator failures don't stop overall analysis
- **Japanese Localization**: Emoji-enhanced reports for AI readability
- **Type Safety**: Comprehensive TypeScript interfaces throughout
- **Error Resilience**: Proper fallback values and user-friendly error messages

## Usage Examples
```bash
# Analyze Apple stock for 7 days (default)
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "getStockAnalysis", "arguments": {"symbol": "AAPL"}}}' | node build/index.js

# Analyze Japanese stock (Komatsu) for 5 days
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "getStockAnalysis", "arguments": {"symbol": "6301.T", "days": 5}}}' | node build/index.js
```