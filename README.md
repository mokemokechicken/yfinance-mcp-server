# yfinance-mcp-server

[日本語版](./README-ja.md)

**Important Note: This is an unofficial MCP server.**

A Model Context Protocol (MCP) server for accessing Yahoo Finance data with comprehensive technical analysis features. This server provides AI-friendly structured stock analysis through Yahoo Finance API.

**This project is based on [onori/yfinance-mcp-server](https://github.com/onori/yfinance-mcp-server) and has been enhanced with comprehensive technical analysis features.**

## Features

- **Comprehensive Stock Analysis**: Get detailed financial metrics, technical indicators, and AI-friendly Japanese reports
- **Technical Indicators**: RSI, MACD, Bollinger Bands, Stochastic, Moving Averages, VWAP, Volume Analysis
- **Financial Metrics**: Market cap, P/E ratio, P/B ratio, ROE, EPS growth, dividend yield
- **Multi-Market Support**: US stocks (AAPL), Japanese stocks (7203.T), crypto (BTC-USD), forex (EURUSD=X)
- **AI-Optimized Output**: Structured Japanese reports with emojis for better AI understanding
- **Performance Optimized**: Maximum 2 API calls with comprehensive local calculations

## Installation

### Claude Code MCP Configuration

Use the Claude Code CLI to add the MCP server:

```bash
claude mcp add yfinance npx @mokemokechicken/yfinance-mcp-server
```

Or manually add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["@mokemokechicken/yfinance-mcp-server"]
    }
  }
}
```

### Other MCP Clients (Cursor, etc.)

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["@mokemokechicken/yfinance-mcp-server"]
    }
  }
}
```

## Available Tool

### getStockAnalysis

Performs comprehensive stock analysis with technical indicators and financial metrics.

**Parameters:**
- `symbol` (required): Stock symbol 
  - US stocks: `AAPL`, `GOOGL`, `MSFT`
  - Japanese stocks: `7203.T`, `6301.T`, `9984.T`
  - Crypto: `BTC-USD`, `ETH-USD`
  - Forex: `EURUSD=X`, `USDJPY=X`
- `days` (optional): Number of days for recent price data display (default: 7, range: 1-365)

**Example Usage:**

```markdown
> Please analyze Apple stock (AAPL) for the last 5 days

> Analyze Toyota Motors (7203.T) with default 7-day period
```

**Response includes:**
- 📊 Recent stock price data
- 💰 Financial metrics (market cap, P/E, ROE, etc.)
- 📈 Technical indicators (RSI, MACD, Bollinger Bands, etc.)
- 🎯 Trading signals and trend analysis
- 📋 AI-friendly structured Japanese report

## Development

To set up the development environment:

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

## License

ISC License (ISC)