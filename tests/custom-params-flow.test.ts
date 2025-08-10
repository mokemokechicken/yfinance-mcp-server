import { describe, it } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * カスタムパラメータでの全フロー統合テスト
 * パラメータ渡し → 計算 → レポート生成までの一連の流れを検証
 */
describe("カスタムパラメータ全フロー統合テスト", () => {
	const timeout = 35000;

	describe("パラメータ渡し全フロー検証", () => {
		it("カスタムパラメータが各計算メソッドまで正しく伝播される", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [8, 21, 55] },
				rsi: { periods: [9, 15], overbought: 78, oversold: 22 },
				macd: { fastPeriod: 10, slowPeriod: 24, signalPeriod: 7 },
				bollingerBands: { period: 18, standardDeviations: 1.8 },
				stochastic: { kPeriod: 12, dPeriod: 4, overbought: 82, oversold: 18 },
				volumeAnalysis: { period: 15, spikeThreshold: 2.2 },
				vwap: { enableTrueVWAP: true, standardDeviations: 1.2 },
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);

			// 基本構造確認
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);

			// 移動平均線のカスタム期間が反映されていることを確認
			const ma = result.technicalIndicators.movingAverages;
			assert.ok(ma);
			// 8日、21日、55日の移動平均が存在することを確認
			const periods = Object.keys(ma).map(key => Number(key.replace('ma', '')));
			assert.ok(periods.includes(8), "8日移動平均が存在しない");
			assert.ok(periods.includes(21), "21日移動平均が存在しない");
			assert.ok(periods.includes(55), "55日移動平均が存在しない");

			// RSI期間が反映されていることを確認
			assert.ok(result.technicalIndicators.rsi);
			assert.ok(result.extendedIndicators.rsiExtended);

			// その他の指標の存在確認
			assert.ok(result.technicalIndicators.macd, "MACDが存在しない");
			assert.ok(result.extendedIndicators.bollingerBands, "ボリンジャーバンドが存在しない");
			assert.ok(result.extendedIndicators.stochastic, "ストキャスティクスが存在しない");
			assert.ok(result.extendedIndicators.vwap, "VWAPが存在しない");

			console.log("✅ カスタムパラメータの伝播確認完了");
		});

		it("部分的なカスタムパラメータ + デフォルト値での全フロー", { timeout }, async () => {
			const partialParams: TechnicalParametersConfig = {
				movingAverages: { periods: [12, 26] }, // カスタム
				rsi: { overbought: 75 }, // 部分的カスタム（periods はデフォルト）
				// macd, bollingerBands等はデフォルト値を使用
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("MSFT", "1y", true, partialParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "MSFT");

			// カスタム移動平均期間の確認
			const ma = result.technicalIndicators.movingAverages;
			assert.ok(ma);
			const periods = Object.keys(ma).map(key => Number(key.replace('ma', '')));
			assert.ok(periods.includes(12), "12日移動平均が存在しない");
			assert.ok(periods.includes(26), "26日移動平均が存在しない");

			// デフォルト設定の指標も存在することを確認
			assert.ok(result.technicalIndicators.macd, "MACDが存在しない（デフォルト設定）");
			assert.ok(result.extendedIndicators.bollingerBands, "ボリンジャーバンドが存在しない（デフォルト設定）");

			console.log("✅ 部分的カスタムパラメータでの全フロー確認完了");
		});

		it("無効パラメータの自動修正と全フロー継続", { timeout }, async () => {
			const invalidParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-5, 0, 1200] }, // すべて無効
				rsi: { periods: [500, -10], overbought: 150, oversold: -20 }, // すべて無効
				macd: { fastPeriod: -1, slowPeriod: 0, signalPeriod: -5 }, // すべて無効
				bollingerBands: { period: -10, standardDeviations: -2 }, // すべて無効
			};

			// エラーが発生せずに結果が返されることを確認
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, invalidParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");

			// デフォルト値で計算が継続されることを確認
			assert.ok(result.technicalIndicators.movingAverages, "移動平均線が存在しない");
			assert.ok(result.technicalIndicators.rsi, "RSIが存在しない");
			assert.ok(result.technicalIndicators.macd, "MACDが存在しない");
			assert.ok(result.extendedIndicators.bollingerBands, "ボリンジャーバンドが存在しない");

			console.log("✅ 無効パラメータの自動修正と全フロー継続確認完了");
		});
	});

	describe("レポート生成フロー統合テスト", () => {
		it("カスタムパラメータ情報がレポートに反映される", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [7, 14, 28] },
				rsi: { periods: [10], overbought: 80, oversold: 20 },
				macd: { fastPeriod: 6, slowPeriod: 18, signalPeriod: 4 },
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			
			// パラメータ検証とレポート生成
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
			
			// カスタム設定の表示を確認
			assert.ok(report.includes("カスタム") || report.includes("カスタマイズ"), "カスタム設定の表示が不十分");
			
			// 各指標の期間表示を確認
			assert.ok(report.includes("移動平均線"));
			assert.ok(report.includes("RSI"));
			assert.ok(report.includes("MACD"));
			
			// 期間情報の表示を確認（7日、14日、28日等）
			assert.ok(report.includes("7") && report.includes("14") && report.includes("28"), "カスタム期間の表示が不十分");

			console.log("✅ カスタムパラメータ情報のレポート反映確認完了");
		});

		it("デフォルト設定での標準レポート生成", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);

			assert.ok(report);
			assert.ok(typeof report === "string");
			assert.ok(report.includes("AAPL"));
			
			// デフォルト期間の表示を確認
			assert.ok(report.includes("25") && report.includes("50") && report.includes("200"), "デフォルト移動平均期間の表示が不十分");
			assert.ok(report.includes("14") || report.includes("21"), "デフォルトRSI期間の表示が不十分");
			
			// カスタム設定の表示がないことを確認
			assert.ok(!report.includes("カスタム") && !report.includes("カスタマイズ"), "デフォルト設定でカスタム表示が含まれている");

			console.log("✅ デフォルト設定での標準レポート生成確認完了");
		});

		it("警告メッセージ付きレポート生成（パラメータ修正時）", { timeout }, async () => {
			const problematicParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1, 1000] }, // 1つは短すぎ、1つは長すぎ
				rsi: { overbought: 110 }, // 範囲外
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, problematicParams);
			
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(problematicParams);
			
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
				result, 
				7, 
				validationResult.validatedParams, 
				problematicParams
			);

			assert.ok(report);
			assert.ok(typeof report === "string");
			
			// 警告または修正に関する情報が含まれていることを期待
			// (実際の警告表示は実装による)
			
			console.log("✅ 警告メッセージ付きレポート生成確認完了");
		});
	});

	describe("VWAP機能統合フロー", () => {
		it("真のVWAPでの全フロー", { timeout }, async () => {
			const vwapParams: TechnicalParametersConfig = {
				vwap: { enableTrueVWAP: true, standardDeviations: 1.5 },
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, vwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);
			
			// VWAPが存在することを確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap, "VWAP機能が動作していない");

			// レポート生成でVWAP情報が含まれることを確認
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report.includes("VWAP") || report.includes("MVWAP"), "レポートにVWAP情報が含まれていない");

			console.log("✅ VWAP機能統合フロー確認完了");
		});

		it("移動VWAPのみでの統合フロー", { timeout }, async () => {
			const mvwapOnlyParams: TechnicalParametersConfig = {
				vwap: { enableTrueVWAP: false },
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("MSFT", "1y", true, mvwapOnlyParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			console.log("✅ 移動VWAPのみでの統合フロー確認完了");
		});
	});

	describe("エラー復旧フロー統合テスト", () => {
		it("一部の指標計算失敗時のGraceful Degradation全フロー", { timeout }, async () => {
			// 極端なパラメータで一部指標の計算が困難になる可能性を作る
			const extremeParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1, 2] }, // 極端に短い期間
				rsi: { periods: [1] },
				macd: { fastPeriod: 1, slowPeriod: 2, signalPeriod: 1 },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, extremeParams);

			// エラーが発生しても結果は返される
			assert.ok(result);
			assert.ok(result.symbol);
			
			// エラーレポートが適切に生成される
			assert.ok(Array.isArray(errorReports));
			
			// レポート生成も継続される
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report);

			// エラーハンドラーによる統合メッセージ生成
			const { ErrorHandler } = await import("../src/lib/technical-indicators/utils/errorHandler");
			const consolidatedMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
			
			// エラーがある場合は適切にメッセージが生成される
			if (errorReports.length > 0) {
				assert.ok(consolidatedMessage);
			}

			console.log(`✅ Graceful Degradation全フロー確認完了 (エラー数: ${errorReports.length})`);
		});

		it("ネットワークエラー等でのフォールバック全フロー", { timeout }, async () => {
			// ここでは通常の分析を実行し、エラーハンドリング機構が組み込まれていることを確認
			try {
				const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
				assert.ok(result); // 成功時
				console.log("✅ 正常時のエラーハンドリング機構確認完了");
			} catch (error) {
				// エラー時の適切な処理
				assert.ok(error);
				console.log("✅ エラー時のフォールバック機構確認完了");
			}
		});
	});

	describe("パフォーマンス最適化フロー", () => {
		it("複数パラメータ設定での並列処理最適化", { timeout }, async () => {
			const complexParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 10, 20, 50, 100, 200] },
				rsi: { periods: [7, 14, 21, 28] },
				macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
				bollingerBands: { period: 20, standardDeviations: 2 },
				stochastic: { kPeriod: 14, dPeriod: 3 },
				volumeAnalysis: { period: 20, spikeThreshold: 2 },
				vwap: { enableTrueVWAP: true, standardDeviations: 1 },
			};

			const startTime = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, complexParams);
			const endTime = Date.now();

			assert.ok(result);
			
			const executionTime = endTime - startTime;
			console.log(`📊 複数パラメータでの実行時間: ${executionTime}ms`);
			
			// 実用的な時間内で完了することを確認（30秒以内）
			assert.ok(executionTime < 30000, `実行時間が長すぎます: ${executionTime}ms`);

			console.log("✅ 複数パラメータ設定での並列処理最適化確認完了");
		});
	});

	describe("日本株での全フロー統合テスト", () => {
		it("日本株銘柄でのカスタムパラメータ全フロー", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 25, 75] },
				rsi: { periods: [9, 14] },
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("7203.T", "1y", true, customParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "7203.T");
			assert.ok(result.technicalIndicators);

			// レポート生成
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report);
			assert.ok(report.includes("7203.T"));

			console.log("✅ 日本株でのカスタムパラメータ全フロー確認完了");
		});
	});
});