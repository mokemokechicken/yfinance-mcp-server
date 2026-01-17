#!/usr/bin/env tsx

import { TechnicalAnalyzer } from "../src/lib/technical-indicators";
// Yahoo Finance インスタンスを初期化（通知抑制済み）
import "../src/lib/yahooFinanceClient";

/**
 * MCP toolのレスポンスをそのまま返すテストスクリプト
 * JSON形式で生のレスポンスを確認できます
 */

async function testRawResponse() {
	console.log("=".repeat(60));
	console.log("🔍 MCP Tool Raw Response Test");
	console.log("=".repeat(60));

	const symbol = process.argv[2] || "6301.T"; // デフォルトはコマツ
	const period = process.argv[3] || "1y";     // デフォルトは1年

	console.log(`Symbol: ${symbol}`);
	console.log(`Period: ${period}`);
	console.log("-".repeat(30));

	try {
		console.log("🔄 データ取得・分析中...");
		const startTime = Date.now();

		// 包括的分析実行（MCPツールと同じ処理）
		const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive(
			symbol,
			period,
			true,
			undefined,
		);
		
		// VWAP分析のデバッグ
		console.log("🔍 VWAP分析デバッグ:");
		console.log("- trueDailyVWAP:", result.extendedIndicators.vwap.trueDailyVWAP ? "あり" : "なし");
		if (result.extendedIndicators.vwap.trueDailyVWAP) {
			console.log("  - VWAP:", result.extendedIndicators.vwap.trueDailyVWAP.vwap);
			console.log("  - データソース:", result.extendedIndicators.vwap.trueDailyVWAP.dataSource);
			console.log("  - データ品質:", result.extendedIndicators.vwap.trueDailyVWAP.dataQuality);
			console.log("  - データポイント:", result.extendedIndicators.vwap.trueDailyVWAP.dataPoints);
		}
		console.log("- dataSource:", result.extendedIndicators.vwap.dataSource);
		console.log("- recommendedVWAP:", result.extendedIndicators.vwap.recommendedVWAP);
		console.log();

		const endTime = Date.now();
		console.log(`✅ 完了 (${endTime - startTime}ms)\n`);

		// finalReportを生成（MCPツールと同じ処理）
		const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
		const { ErrorHandler } = await import("../src/lib/technical-indicators/utils/errorHandler");
		
		// パラメータ検証とデフォルト値設定
		const validationResult = ParameterValidator.validateAndSetDefaults(undefined);
		
		// 日本語レポート生成
		const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
			result,
			7, // デフォルトdays
			validationResult.validatedParams,
			undefined,
		);
		
		// エラーレポート処理（実際のMCPツールと同じ）
		const consolidatedErrorMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
		
		// 最終レポート
		const finalReport = consolidatedErrorMessage ? `${report}\n\n---\n\n${consolidatedErrorMessage}` : report;

		console.log("📄 Final Report (MCP Tool Output):");
		console.log("=".repeat(60));
		console.log(finalReport);
		console.log("=".repeat(60));

	} catch (error: any) {
		console.error("❌ エラー:");
		console.error({
			message: error.message,
			stack: error.stack,
			error: error
		});
	}
}

// コマンドライン引数の使用方法を表示
if (process.argv.includes("--help") || process.argv.includes("-h")) {
	console.log(`
使用方法:
  tsx spike/spike_raw_response.ts [SYMBOL] [PERIOD]

例:
  tsx spike/spike_raw_response.ts AAPL 1y      # Apple 1年
  tsx spike/spike_raw_response.ts 6301.T 6mo   # コマツ 6ヶ月
  tsx spike/spike_raw_response.ts BTC-USD 3mo  # Bitcoin 3ヶ月

PERIOD options: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
	`);
	process.exit(0);
}

// スクリプト実行
testRawResponse().catch(console.error);