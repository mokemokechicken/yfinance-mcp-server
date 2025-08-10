/**
 * エラーハンドリング強化機能のテスト
 * Phase 3: Error Handling Enhancement の動作確認
 */

import { test } from "node:test";
import assert from "node:assert";
import { ErrorHandler } from "../src/lib/technical-indicators/utils/errorHandler";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import {
	APIConnectionError,
	APILimitError,
	CalculationError,
	DataFetchError,
	TechnicalIndicatorError,
	ValidationError,
} from "../src/lib/technical-indicators/types";

test("ErrorHandler - Error normalization and handling", async () => {
	// 一般的なErrorの正規化テスト
	const genericError = new Error("Network timeout occurred");
	const context = { symbol: "AAPL", indicator: "Test" };
	
	const report = ErrorHandler.handleError(genericError, context);
	
	assert.strictEqual(report.error.name, "APIConnectionError");
	assert.strictEqual(report.context.symbol, "AAPL");
	assert.ok(report.userMessage.includes("ネットワークエラー"));
	assert.ok(report.technicalDetails.includes("Network timeout occurred"));
});

test("ErrorHandler - Safe execute with fallback", () => {
	const context = { symbol: "TEST", indicator: "計算テスト" };
	
	// 成功ケース
	const successResult = ErrorHandler.safeExecute(
		() => 42,
		() => 0,
		context
	);
	
	assert.strictEqual(successResult.result, 42);
	assert.strictEqual(successResult.error, undefined);
	
	// エラー + フォールバックケース
	const errorResult = ErrorHandler.safeExecute(
		() => { throw new Error("Calculation failed"); },
		() => 0,
		context
	);
	
	assert.strictEqual(errorResult.result, 0);
	assert.ok(errorResult.error);
	assert.ok(errorResult.error.userMessage.includes("計算テスト"));
});

test("ErrorHandler - Safe execute async with retry", async () => {
	const context = { symbol: "TEST", indicator: "非同期テスト" };
	let attemptCount = 0;
	
	// 2回目で成功するケース
	const retryResult = await ErrorHandler.safeExecuteAsync(
		async () => {
			attemptCount++;
			if (attemptCount < 2) {
				throw new Error("Temporary failure");
			}
			return "success";
		},
		() => "fallback",
		context,
		3, // maxRetries
		10 // short delay for test
	);
	
	assert.strictEqual(retryResult.result, "success");
	assert.strictEqual(retryResult.error, undefined);
	assert.strictEqual(attemptCount, 2);
});

test("ErrorHandler - Non-recoverable error handling", async () => {
	const context = { symbol: "TEST", indicator: "非回復可能エラー" };
	
	const result = await ErrorHandler.safeExecuteAsync(
		async () => {
			throw new APILimitError("Rate limit exceeded", context);
		},
		() => "fallback",
		context,
		3
	);
	
	assert.strictEqual(result.result, "fallback");
	assert.ok(result.error);
	assert.strictEqual(result.error.error.name, "APILimitError");
	assert.strictEqual(result.error.error.isRecoverable, false);
});

test("ErrorHandler - Consolidated error messages", () => {
	const errors = [
		ErrorHandler.handleError(new DataFetchError("Data fetch failed", "FETCH_ERROR"), { symbol: "AAPL" }),
		ErrorHandler.handleError(new CalculationError("RSI calculation failed", "CALC_ERROR"), { symbol: "AAPL", indicator: "RSI" }),
		ErrorHandler.handleError(new ValidationError("Invalid parameter", "VALIDATION_ERROR"), { symbol: "AAPL" }),
	];
	
	const consolidatedMessage = ErrorHandler.generateConsolidatedUserMessage(errors);
	
	assert.ok(consolidatedMessage.includes("注意"));
	assert.ok(consolidatedMessage.includes("データ取得"));
	assert.ok(consolidatedMessage.includes("技術指標"));
	assert.ok(consolidatedMessage.includes("パラメータ設定"));
});

test("TechnicalAnalyzer - Enhanced error handling in comprehensive analysis", async () => {
	// 無効な銘柄での分析実行
	try {
		const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive(
			"INVALID_SYMBOL_12345",
			"1y",
			true,
			{
				rsi: {
					periods: [14],
					overbought: 150, // 無効な値
					oversold: -10,   // 無効な値
				},
			}
		);
		
		// エラーが発生してもフォールバック結果が返される
		assert.ok(result);
		assert.strictEqual(result.symbol, "INVALID_SYMBOL_12345");
		
		// エラーレポートが生成される
		assert.ok(errorReports.length > 0);
		
		// パラメータ検証エラーが含まれている
		const paramErrors = errorReports.filter(r => 
			r.context.indicator === "パラメータ検証"
		);
		assert.ok(paramErrors.length > 0);
		
	} catch (error) {
		// 予期しないエラーの場合はテスト失敗
		assert.fail(`Unexpected error: ${error}`);
	}
});

test("Error type classification", () => {
	const context = { symbol: "TEST" };
	
	// ネットワーク関連エラー
	const networkError = ErrorHandler.handleError(
		new Error("network connection failed"),
		context
	);
	assert.strictEqual(networkError.error.name, "APIConnectionError");
	
	// レート制限エラー
	const rateLimitError = ErrorHandler.handleError(
		new Error("429 rate limit exceeded"),
		context
	);
	assert.strictEqual(rateLimitError.error.name, "APILimitError");
	
	// 検証エラー
	const validationError = ErrorHandler.handleError(
		new Error("validation failed: invalid input"),
		context
	);
	assert.strictEqual(validationError.error.name, "ValidationError");
	
	// 計算エラー
	const calcError = ErrorHandler.handleError(
		new Error("math calculation overflow"),
		context
	);
	assert.strictEqual(calcError.error.name, "CalculationError");
});

test("Error context and technical details", () => {
	const context = {
		symbol: "AAPL",
		indicator: "RSI",
		parameters: { period: 14, overbought: 70 },
	};
	
	const error = new CalculationError(
		"Insufficient data for RSI calculation",
		"INSUFFICIENT_DATA",
		{ minRequired: 14, available: 10 }
	);
	
	const report = ErrorHandler.handleError(error, context);
	
	assert.ok(report.technicalDetails.includes("AAPL"));
	assert.ok(report.technicalDetails.includes("RSI"));
	assert.ok(report.technicalDetails.includes("INSUFFICIENT_DATA"));
	assert.ok(report.technicalDetails.includes("period"));
	assert.ok(report.context.timestamp);
});

test("Error history and summary", () => {
	// エラー履歴をクリア
	ErrorHandler.clearErrorHistory();
	
	// いくつかのエラーを生成
	const contexts = [
		{ symbol: "AAPL", indicator: "RSI" },
		{ symbol: "GOOGL", indicator: "MACD" },
		{ symbol: "AAPL", indicator: "ボリンジャーバンド" },
	];
	
	for (const context of contexts) {
		ErrorHandler.handleError(new CalculationError("Test error", "TEST_ERROR"), context);
	}
	
	const summary = ErrorHandler.getErrorSummary();
	
	assert.strictEqual(summary.total, 3);
	assert.strictEqual(summary.byType.CalculationError, 3);
	assert.strictEqual(summary.recent.length, 3);
	
	// 履歴クリア確認
	ErrorHandler.clearErrorHistory();
	const emptySummary = ErrorHandler.getErrorSummary();
	assert.strictEqual(emptySummary.total, 0);
});

// モック無効な銘柄でのAPIフォールバック動作テスト
test("API fallback behavior with invalid symbol", async () => {
	try {
		// 完全に無効な銘柄でデータフェッチ
		const priceData = await TechnicalAnalyzer.fetchData("COMPLETELY_INVALID_SYMBOL_999", "1y", 1);
		
		// フォールバック動作で空配列が返されることを確認
		assert.ok(Array.isArray(priceData), "Should return an array even on error");
		assert.ok(priceData.length === 0, "Should return empty array for invalid symbol");
		
	} catch (error) {
		// エラーが投げられた場合は、適切なエラータイプであることを確認
		assert.ok(error instanceof DataFetchError || error instanceof APIConnectionError || error instanceof TechnicalIndicatorError);
		console.log("Expected error caught:", error.constructor.name, error.message);
	}
});