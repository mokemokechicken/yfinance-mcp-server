# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-08-10

### Added
- Comprehensive technical analysis system with TechnicalAnalyzer class
- Extended technical indicators library including:
  - RSI (14-day and 21-day periods)
  - MACD with signal line and histogram
  - Moving averages (25, 50, 200-day)
  - Bollinger Bands
  - Stochastic Oscillator
  - VWAP (Volume Weighted Average Price)
  - Volume analysis
  - Golden/Dead cross detection
  - Moving average deviation analysis
- Japanese report generation with emoji-enhanced formatting
- AI-friendly structured output for comprehensive stock analysis
- Financial metrics integration (PER, PBR, ROE, dividend yield, etc.)
- Graceful degradation system for failed indicator calculations
- Comprehensive test suite for technical indicators
- Type-safe implementation with extensive TypeScript interfaces

### Changed
- Main tool changed from `getStockHistory` to `getStockAnalysis`
- Enhanced error handling with user-friendly messages
- Optimized API usage (maximum 2 calls per analysis)
- Improved build system with esbuild bundling and minification
- Updated development workflow with comprehensive linting and formatting

### Technical Details
- Built upon the original [onori/yfinance-mcp-server](https://github.com/onori/yfinance-mcp-server)
- Maintains backward compatibility with MCP protocol
- Performance optimized with parallel data fetching
- Extensive validation and error handling throughout

### Dependencies
- Updated to latest @modelcontextprotocol/sdk (^1.8.0)
- Added comprehensive development tooling (Biome, TypeScript, esbuild)
- Maintained compatibility with yahoo-finance2 (^2.13.3)

---

Based on the original work by [onori](https://github.com/onori/yfinance-mcp-server)