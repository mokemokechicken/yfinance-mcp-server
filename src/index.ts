#! /usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TechnicalAnalyzer } from "./lib/technical-indicators/technicalAnalyzer.js";
import type { TechnicalParametersConfig } from "./lib/technical-indicators/types.js";

const server = new McpServer({
	name: "alt-yfinance",
	version: "0.1.0", // package.jsonのバージョンと一致させる
});

// AI対応株式分析ツール
server.tool(
	"getStockAnalysis",
	"包括的な株式分析を実行し、財務指標、テクニカル指標、統合シグナル分析を含む投資分析レポートを提供します。技術指標パラメータのカスタマイズが可能です。(v0.1.0)", // Toolのバージョンを明示
	{
		symbol: z.string().describe("株式銘柄コード（例：米国株=AAPL、日本株=7203.T、仮想通貨=BTC-USD、為替=EURUSD=X）"),
		days: z.number().min(1).max(365).default(7).describe("直近何日分の価格推移データを返すか（デフォルト：7日）"),
		technicalParams: z.object({
			movingAverages: z.object({
				periods: z.array(z.number().positive()).optional().describe("移動平均線の期間配列（例: [25, 50, 200]）")
			}).optional(),
			rsi: z.object({
				periods: z.array(z.number().positive()).optional().describe("RSI期間配列（例: [14, 21]）"),
				overbought: z.number().min(50).max(100).optional().describe("買われすぎ閾値（デフォルト: 70）"),
				oversold: z.number().min(0).max(50).optional().describe("売られすぎ閾値（デフォルト: 30）")
			}).optional(),
			macd: z.object({
				fastPeriod: z.number().positive().optional().describe("MACD高速期間（デフォルト: 12）"),
				slowPeriod: z.number().positive().optional().describe("MACD低速期間（デフォルト: 26）"),
				signalPeriod: z.number().positive().optional().describe("MACDシグナル期間（デフォルト: 9）")
			}).optional(),
			bollingerBands: z.object({
				period: z.number().positive().optional().describe("ボリンジャーバンド期間（デフォルト: 20）"),
				standardDeviations: z.number().positive().optional().describe("標準偏差倍数（デフォルト: 2）")
			}).optional(),
			stochastic: z.object({
				kPeriod: z.number().positive().optional().describe("ストキャスティクス%K期間（デフォルト: 14）"),
				dPeriod: z.number().positive().optional().describe("ストキャスティクス%D期間（デフォルト: 3）"),
				overbought: z.number().min(50).max(100).optional().describe("買われすぎ閾値（デフォルト: 80）"),
				oversold: z.number().min(0).max(50).optional().describe("売られすぎ閾値（デフォルト: 20）")
			}).optional(),
			volumeAnalysis: z.object({
				period: z.number().positive().optional().describe("出来高分析期間（デフォルト: 20）"),
				spikeThreshold: z.number().positive().optional().describe("出来高急増閾値倍数（デフォルト: 2.0）")
			}).optional(),
			vwap: z.object({
				enableTrueVWAP: z.boolean().optional().describe("真の1日VWAP有効化（デフォルト: true）"),
				standardDeviations: z.number().positive().optional().describe("VWAP標準偏差倍数（デフォルト: 1）")
			}).optional(),
			mvwap: z.object({
				period: z.number().positive().optional().describe("移動VWAP期間（デフォルト: 20）"),
				standardDeviations: z.number().positive().optional().describe("移動VWAP標準偏差倍数（デフォルト: 1）")
			}).optional()
		}).optional().describe("技術指標パラメータ設定（オプション）。指定しない場合はデフォルト値を使用")
	},
	async ({ symbol, days = 7, technicalParams }) => {
		try {
			// 包括的分析実行（API呼び出し最小化済み）
			const analysisResult = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, technicalParams);

			// パラメータ検証とデフォルト値設定（レポート生成用）
			const { ParameterValidator } = await import("./lib/technical-indicators/utils/parameterValidator.js");
			const validationResult = ParameterValidator.validateAndSetDefaults(technicalParams);

			// 日本語レポート生成（パラメータ情報付き）
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
				analysisResult, 
				days,
				validationResult.validatedParams,
				technicalParams
			);

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
