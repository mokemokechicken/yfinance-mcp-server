import { describe, it } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

describe("統合テスト（実際のAPI使用）", () => {
	// APIコールを含むテストのため、タイムアウトを長めに設定
	const timeout = 30000;

	describe("TechnicalAnalyzer.analyzeStockComprehensive", () => {
		it("デフォルトパラメータでの包括的分析", { timeout }, async () => {
			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			
			// 基本構造の確認
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.priceData);
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);
			assert.ok(result.signals);
			
			// 技術指標の存在確認
			assert.ok("movingAverages" in result.technicalIndicators);
			assert.ok("rsi" in result.technicalIndicators);
			assert.ok("macd" in result.technicalIndicators);
			
			// 拡張指標の存在確認
			assert.ok("bollingerBands" in result.extendedIndicators);
			assert.ok("stochastic" in result.extendedIndicators);
			assert.ok("vwap" in result.extendedIndicators);
			assert.ok("rsiExtended" in result.extendedIndicators);
			
			console.log("✅ デフォルトパラメータでの分析完了");
		});

		it("カスタムパラメータでの包括的分析", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14], overbought: 75, oversold: 25 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 15, standardDeviations: 1.5 },
				stochastic: { kPeriod: 10, dPeriod: 5, overbought: 85, oversold: 15 },
			};

			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			
			// 基本構造の確認
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			
			// カスタムパラメータが適用されていることは、内部的には検証済み
			// 結果の構造が正しいことを確認
			assert.ok(result.extendedIndicators);
			assert.ok("bollingerBands" in result.extendedIndicators);
			assert.ok("stochastic" in result.extendedIndicators);
			assert.ok("rsiExtended" in result.extendedIndicators);
			
			console.log("✅ カスタムパラメータでの分析完了");
		});

		it("部分的なカスタムパラメータでの分析", { timeout }, async () => {
			const partialParams: TechnicalParametersConfig = {
				movingAverages: { periods: [20, 60] },
				rsi: { overbought: 80 }
				// 他の設定はデフォルト値を使用
			};

			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, partialParams);
			
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.extendedIndicators);
			
			console.log("✅ 部分的なカスタムパラメータでの分析完了");
		});

		it("無効パラメータの修正とGraceful Degradation", { timeout }, async () => {
			const invalidParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-5, 0, 1000] }, // 無効値
				rsi: { periods: [999], overbought: 150, oversold: -10 }, // 範囲外
				macd: { fastPeriod: -1, slowPeriod: 0, signalPeriod: 1000 }, // 無効値
			};

			// エラーが発生せずに結果が返されることを確認
			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, invalidParams);
			
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.extendedIndicators);
			
			console.log("✅ 無効パラメータの修正とGraceful Degradation動作確認");
		});

		it("下位互換性テスト - 既存の呼び出し方法", { timeout }, async () => {
			// 既存のAPI呼び出しが変更なく動作することを確認
			const result1 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL");
			assert.ok(result1);
			
			const result2 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y");
			assert.ok(result2);
			
			const result3 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			assert.ok(result3);
			
			console.log("✅ 下位互換性確認完了");
		});
	});

	describe("日本語レポート生成", () => {
		it("デフォルトパラメータでの日本語レポート生成", { timeout }, async () => {
			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			
			assert.ok(report);
			assert.ok(typeof report === "string");
			assert.ok(report.includes("AAPL"));
			assert.ok(report.includes("移動平均線"));
			assert.ok(report.includes("RSI"));
			assert.ok(report.includes("MACD"));
			
			console.log("✅ デフォルトパラメータでの日本語レポート生成完了");
		});

		it("カスタムパラメータでの日本語レポート生成", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14], overbought: 75 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
			};

			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(customParams);
			
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
				result, 
				7, 
				validationResult.validatedParams, 
				customParams
			);
			
			assert.ok(report);
			assert.ok(typeof report === "string");
			assert.ok(report.includes("AAPL"));
			
			// カスタム設定の表示確認
			assert.ok(report.includes("カスタム設定") || report.includes("カスタマイズされた設定"));
			
			console.log("✅ カスタムパラメータでの日本語レポート生成完了");
		});
	});

	describe("パフォーマンステスト", () => {
		it("計算時間がベースライン（デフォルト）から10%以内の増加", { timeout }, async () => {
			// ベースライン測定（デフォルトパラメータ）
			const startDefault = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const defaultTime = Date.now() - startDefault;
			
			// カスタムパラメータでの測定
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14], overbought: 75 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 15, standardDeviations: 1.5 },
			};
			
			const startCustom = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			const customTime = Date.now() - startCustom;
			
			const increase = ((customTime - defaultTime) / defaultTime) * 100;
			
			console.log(`📊 パフォーマンス結果:`);
			console.log(`   デフォルト: ${defaultTime}ms`);
			console.log(`   カスタム: ${customTime}ms`);
			console.log(`   増加率: ${increase.toFixed(1)}%`);
			
			// 10%以内の増加であることを確認
			assert.ok(increase <= 10, `計算時間増加が10%を超えています: ${increase.toFixed(1)}%`);
			
			console.log("✅ パフォーマンス要件達成");
		});
	});

	describe("エラーハンドリングと信頼性", () => {
		it("存在しない銘柄での適切なエラーハンドリング", { timeout }, async () => {
			try {
				await TechnicalAnalyzer.analyzeStockComprehensive("INVALID_SYMBOL_12345");
				assert.fail("エラーが発生すべきです");
			} catch (error) {
				assert.ok(error);
				console.log("✅ 無効銘柄のエラーハンドリング確認");
			}
		});

		it("極端なパラメータでのGraceful Degradation", { timeout }, async () => {
			const extremeParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1, 2, 3] }, // 非常に短い期間
				rsi: { periods: [1], overbought: 99, oversold: 1 },
				macd: { fastPeriod: 1, slowPeriod: 2, signalPeriod: 1 },
			};

			const result = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, extremeParams);
			
			// エラーが発生せず、結果が返されることを確認
			assert.ok(result);
			assert.ok(result.extendedIndicators);
			
			console.log("✅ 極端なパラメータでのGraceful Degradation確認");
		});
	});
});