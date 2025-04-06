#! /usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import yahooFinance from "yahoo-finance2";

const server = new McpServer({
	name: "yfinance",
	version: "0.0.1",
});

// Add a stock price fetching tool
server.tool(
	"getStockHistory",
	{
		symbol: z.string(),
		period: z.string(),
		interval: z.enum(["1d", "1wk", "1mo"]).optional(),
	},
	async ({ symbol, period, interval = "1d" }) => {
		try {
			const queryOptions = {
				period1: getStartDate(period),
				period2: new Date(),
				interval: interval as "1d" | "1wk" | "1mo",
			};

			const result = await yahooFinance.historical(symbol, queryOptions);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			return {
				content: [
					{
						type: "text",
						text: `Error: ${errorMessage}`,
					},
				],
			};
		}
	},
);

// Helper function to calculate start date based on period
function getStartDate(period: string): Date {
	const now = new Date();
	switch (period.toLowerCase()) {
		case "1d":
			return new Date(now.setDate(now.getDate() - 1));
		case "1w":
			return new Date(now.setDate(now.getDate() - 7));
		case "1m":
			return new Date(now.setMonth(now.getMonth() - 1));
		case "3m":
			return new Date(now.setMonth(now.getMonth() - 3));
		case "6m":
			return new Date(now.setMonth(now.getMonth() - 6));
		case "1y":
			return new Date(now.setFullYear(now.getFullYear() - 1));
		default:
			return new Date(now.setMonth(now.getMonth() - 1)); // Default to 1 month
	}
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
