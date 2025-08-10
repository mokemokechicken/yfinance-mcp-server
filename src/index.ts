#! /usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TechnicalAnalyzer } from "./lib/technical-indicators/technicalAnalyzer.js";

const server = new McpServer({
	name: "alt-yfinance",
	version: "0.1.0", // package.jsonのバージョンと一致させる
});

// AI対応株式分析ツール
server.tool(
	"getStockAnalysis",
	"包括的な株式分析を実行し、財務指標、テクニカル指標、統合シグナル分析を含む投資分析レポートを提供します。(v0.1.0)", // Toolのバージョンを明示
	{
		symbol: z.string().describe("株式銘柄コード（例：米国株=AAPL、日本株=7203.T、仮想通貨=BTC-USD、為替=EURUSD=X）"),
		days: z.number().min(1).max(365).default(7).describe("直近何日分の価格推移データを返すか（デフォルト：7日）"),
	},
	async ({ symbol, days = 7 }) => {
		try {
			// 包括的分析実行（API呼び出し最小化済み）
			const analysisResult = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y");

			// 日本語レポート生成
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(analysisResult, days);

			return {
				content: [
					{
						type: "text",
						text: report,
					},
				],
			};
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			return {
				content: [
					{
						type: "text",
						text: `## エラー: ${symbol} の分析に失敗しました\n\n**エラー内容:** ${errorMessage}\n\n**確認事項:**\n- 銘柄コードが正しいかご確認ください\n- 米国株：AAPL、日本株：7203.T など\n- ネットワーク接続をご確認ください`,
					},
				],
			};
		}
	},
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
