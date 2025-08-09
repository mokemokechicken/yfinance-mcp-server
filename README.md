# yfinance-mcp-server

[日本語版](./README-ja.md)

**Important Note: This is an unofficial MCP server.**

A Message Control Protocol (MCP) server for accessing Yahoo Finance data. This server provides a simple interface to retrieve stock market data through yfinance.

## Features

- Get historical stock data with customizable periods and intervals
- Easy to use with any MCP client
- Built with TypeScript for type safety and better developer experience

## Usage

Example Cursor MCP Client.

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": [
        "@mokemokechicken/yfinance-mcp-server"
      ]
    }
  }
}
```

### getStockHistory

Retrieves historical stock data for a given symbol.

Parameters:
- `symbol` (required): The stock symbol (e.g., "AAPL" for Apple Inc.)
- `period` (required): Time period to fetch data for (e.g., "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max")
- `interval` (optional): Data interval ("1d", "1wk", "1mo")

Example MCP request:

```markdown
> (Request) 
Please use the `getStockHistory` tool to fetch the daily stock data for AAPL for the past week (`period`='1w', `interval`='1d'). Then, render the results as a markdown table.

> (Response Example)
I'll help you fetch Apple's stock data and format it nicely as a markdown table.
First, I'll call the getStockHistory tool to fetch the data:

Let me format this data into a more readable markdown table:

| Date | Open | High | Low | Close | Volume |
|------|------|------|-----|-------|---------|
| Mar 31, 2025 | $217.01 | $225.62 | $216.23 | $222.13 | 65.30M |
| Apr 1, 2025 | $219.81 | $223.68 | $218.90 | $223.19 | 36.41M |
| Apr 2, 2025 | $221.32 | $225.19 | $221.02 | $223.89 | 35.91M |
| Apr 3, 2025 | $205.54 | $207.49 | $201.25 | $203.19 | 103.42M |
| Apr 4, 2025 | $193.89 | $199.88 | $187.34 | $188.38 | 125.57M |

Some notable observations from this data:
- The stock showed significant volatility over this period
- There was a sharp decline in the last two trading days
- Trading volume increased substantially during the declining days, with the highest volume (125.57M shares) on April 4th
- The stock price range was from a high of $225.62 to a low of $187.34 during this period
Would you like any specific analysis of this data or would you like to see different metrics?
```

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC License (ISC)