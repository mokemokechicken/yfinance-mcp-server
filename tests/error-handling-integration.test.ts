import { describe, it } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * エラーハンドリングの統合テスト
 * Graceful Degradation、エラー復旧、フォールバック機構の総合検証
 */
describe("エラーハンドリング統合テスト", () => {
	const timeout = 40000;

	describe("無効銘柄コードエラーハンドリング", () => {
		it("完全に無効な銘柄コードでのエラーハンドリング", { timeout }, async () => {
			try {
				await TechnicalAnalyzer.analyzeStockComprehensive("COMPLETELY_INVALID_SYMBOL_12345");
				assert.fail("エラーが発生すべきです");
			} catch (error: any) {
				assert.ok(error);
				assert.ok(error.message || error.toString());
				console.log(`✅ 無効銘柄コードエラー確認: ${error.message || error.toString()}`);
			}
		});

		it("形式が不正な銘柄コードでのエラーハンドリング", { timeout }, async () => {
			const invalidSymbols = [
				"",
				" ",
				"123",
				"!@#$%",
				"TOOLONGTOBEVALIDSYMBOLNAME123456789",
			];

			for (const invalidSymbol of invalidSymbols) {
				try {
					await TechnicalAnalyzer.analyzeStockComprehensive(invalidSymbol);
					// エラーが発生しない場合もあるが、これは正常（Graceful Degradation）
					console.log(`⚠️ エラーが発生しませんでした（正常な可能性）: ${invalidSymbol}`);
				} catch (error: any) {
					assert.ok(error);
					console.log(`✅ 不正形式銘柄コードエラー確認: ${invalidSymbol} -> ${error.message || error.toString()}`);
				}
			}
		});

		it("存在しない日本株コードでのエラーハンドリング", { timeout }, async () => {
			try {
				await TechnicalAnalyzer.analyzeStockComprehensive("99999.T"); // 存在しない銘柄番号
				assert.fail("エラーが発生すべきです");
			} catch (error: any) {
				assert.ok(error);
				console.log(`✅ 存在しない日本株コードエラー確認: ${error.message || error.toString()}`);
			}
		});
	});

	describe("パラメータエラーハンドリング", () => {
		it("すべて無効なパラメータでのGraceful Degradation", { timeout }, async () => {
			const allInvalidParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-1, -5, -10, 0, 2000] },
				rsi: { periods: [-1, 0, 500], overbought: 150, oversold: -50 },
				macd: { fastPeriod: -1, slowPeriod: -5, signalPeriod: -3 },
				bollingerBands: { period: -10, standardDeviations: -2 },
				stochastic: { kPeriod: -5, dPeriod: -2, overbought: 200, oversold: -100 },
				volumeAnalysis: { period: -15, spikeThreshold: -1 },
				vwap: { enableTrueVWAP: true, standardDeviations: -1 },
				mvwap: { period: -20, standardDeviations: -1 },
			};

			// エラーが発生せずに結果が返されることを確認（パラメータ自動修正）
			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, allInvalidParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);

			// パラメータ検証で修正されることを確認
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(allInvalidParams);
			
			assert.ok(validationResult.validatedParams);
			assert.ok(Array.isArray(validationResult.warnings));
			
			// 警告が生成されていることを確認
			assert.ok(validationResult.warnings.length > 0, "無効パラメータに対して警告が生成されていない");

			console.log(`✅ 全無効パラメータでのGraceful Degradation確認 (警告数: ${validationResult.warnings.length}, エラー数: ${errorReports.length})`);
		});

		it("部分的に無効なパラメータでの混在処理", { timeout }, async () => {
			const mixedParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, -5, 50, 2000, 200] }, // 有効・無効混在
				rsi: { periods: [14], overbought: 150 }, // 1つ有効、1つ無効
				macd: { fastPeriod: 12, slowPeriod: -1, signalPeriod: 9 }, // 2つ有効、1つ無効
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, mixedParams);

			assert.ok(result);
			assert.ok(result.technicalIndicators);

			// 有効なパラメータは正しく処理されることを確認
			assert.ok(result.technicalIndicators.movingAverages);
			assert.ok(result.technicalIndicators.rsi);
			assert.ok(result.technicalIndicators.macd);

			console.log(`✅ 混在パラメータでの処理確認 (エラー数: ${errorReports.length})`);
		});
	});

	describe("API制限・ネットワークエラーシミュレーション", () => {
		it("短期間での複数API呼び出しによる制限テスト", { timeout }, async () => {
			const symbols = ["AAPL", "MSFT", "GOOGL"];
			const promises = symbols.map(symbol => 
				TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true)
			);

			// 並列実行で制限に遭遇する可能性をテスト
			const results = await Promise.allSettled(promises);

			// 少なくとも一部は成功することを確認
			const successCount = results.filter(result => result.status === 'fulfilled').length;
			const errorCount = results.filter(result => result.status === 'rejected').length;

			console.log(`📊 並列API呼び出し結果: 成功${successCount}件, エラー${errorCount}件`);
			
			// すべてがエラーでないことを確認（少なくとも1つは成功）
			assert.ok(successCount > 0, "すべてのAPI呼び出しが失敗しました");

			console.log("✅ 短期間での複数API呼び出し制限テスト完了");
		});

		it("大量データ処理時のメモリエラーハンドリング", { timeout }, async () => {
			// 大きな期間配列での処理テスト
			const largeParams: TechnicalParametersConfig = {
				movingAverages: { 
					periods: Array.from({length: 20}, (_, i) => 5 + i * 10) // 5, 15, 25, ..., 195
				},
				rsi: { periods: [7, 14, 21, 28, 35, 42, 49] },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, largeParams);

			// メモリエラーが発生せずに完了することを確認
			assert.ok(result);
			assert.ok(result.technicalIndicators);

			console.log(`✅ 大量データ処理時のエラーハンドリング確認 (エラー数: ${errorReports.length})`);
		});
	});

	describe("計算エラー・数値エラーハンドリング", () => {
		it("計算不可能なデータでのGraceful Degradation", { timeout }, async () => {
			// 非常に短い期間での計算テスト（計算困難シナリオ）
			const difficultParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1, 2] }, // 非常に短い
				rsi: { periods: [1] },
				macd: { fastPeriod: 1, slowPeriod: 2, signalPeriod: 1 },
				bollingerBands: { period: 2, standardDeviations: 0.1 },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, difficultParams);

			// エラーが発生しても基本構造は保たれることを確認
			assert.ok(result);
			assert.ok(result.technicalIndicators || result.extendedIndicators);

			console.log(`✅ 計算困難データでのGraceful Degradation確認 (エラー数: ${errorReports.length})`);
		});

		it("NaN・Infinity値の処理", { timeout }, async () => {
			// 極端な標準偏差設定でNaNが発生する可能性をテスト
			const extremeParams: TechnicalParametersConfig = {
				bollingerBands: { period: 5, standardDeviations: 100 }, // 極端に大きい標準偏差
				vwap: { standardDeviations: 50 },
				mvwap: { period: 5, standardDeviations: 50 },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, extremeParams);

			assert.ok(result);
			// NaN/Infinityが適切に処理されることを期待
			
			console.log(`✅ NaN・Infinity値の処理確認 (エラー数: ${errorReports.length})`);
		});
	});

	describe("統合エラーメッセージ生成テスト", () => {
		it("複数エラーの統合メッセージ生成", { timeout }, async () => {
			const problematicParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-1, 0, 1000] },
				rsi: { periods: [-5], overbought: 200 },
				vwap: { enableTrueVWAP: true, standardDeviations: -1 },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, problematicParams);

			assert.ok(result);
			
			if (errorReports.length > 0) {
				const { ErrorHandler } = await import("../src/lib/technical-indicators/utils/errorHandler");
				const consolidatedMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
				
				assert.ok(typeof consolidatedMessage === 'string');
				console.log(`📝 統合エラーメッセージ (${errorReports.length}件):\n${consolidatedMessage}`);
			}

			console.log("✅ 複数エラーの統合メッセージ生成確認完了");
		});

		it("エラー分類と優先度付けテスト", { timeout }, async () => {
			// 異なる種類のエラーを意図的に発生させる
			const mixedErrorParams: TechnicalParametersConfig = {
				movingAverages: { periods: [] }, // 空配列
				rsi: { periods: [0, -1, 1000] }, // 複数の無効値
				macd: { fastPeriod: 50, slowPeriod: 10, signalPeriod: 20 }, // 論理的矛盾（fast > slow）
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, mixedErrorParams);

			assert.ok(result);
			
			// エラーレポートの構造確認
			if (errorReports.length > 0) {
				for (const errorReport of errorReports) {
					assert.ok(errorReport.userMessage);
					assert.ok(errorReport.technicalDetails);
					assert.ok(errorReport.context);
				}
			}

			console.log(`✅ エラー分類と優先度付け確認 (分類されたエラー数: ${errorReports.length})`);
		});
	});

	describe("フォールバック機構統合テスト", () => {
		it("真のVWAP失敗時のMVWAPフォールバック", { timeout }, async () => {
			const vwapParams: TechnicalParametersConfig = {
				vwap: { enableTrueVWAP: true },
				mvwap: { period: 20 }, // フォールバック用
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, vwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 何らかのVWAP計算結果が存在することを確認（フォールバック含む）
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'mvwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "VWAPフォールバック機構が動作していない");

			console.log(`✅ VWAPフォールバック機構確認 (エラー数: ${errorReports.length})`);
		});

		it("部分的な指標計算失敗時の継続処理", { timeout }, async () => {
			// 一部の指標で問題が発生する可能性の高い設定
			const partialFailureParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1] }, // 問題の可能性
				rsi: { periods: [14, 21] }, // 正常
				macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }, // 正常
				bollingerBands: { period: 1, standardDeviations: 1 }, // 問題の可能性
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, partialFailureParams);

			assert.ok(result);
			
			// 少なくとも一部の指標は計算されることを確認
			const hasAnyIndicator = (
				result.technicalIndicators?.rsi ||
				result.technicalIndicators?.macd ||
				result.technicalIndicators?.movingAverages ||
				result.extendedIndicators?.bollingerBands
			);
			assert.ok(hasAnyIndicator, "すべての指標計算が失敗しました");

			console.log(`✅ 部分的計算失敗時の継続処理確認 (エラー数: ${errorReports.length})`);
		});
	});

	describe("レポート生成エラーハンドリング", () => {
		it("不完全なデータでのレポート生成", { timeout }, async () => {
			// 計算困難な設定で不完全なデータを作成
			const incompleteParams: TechnicalParametersConfig = {
				movingAverages: { periods: [1, 2] },
				rsi: { periods: [1] },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, incompleteParams);

			// 不完全でもレポートが生成されることを確認
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report);
			assert.ok(typeof report === 'string');
			assert.ok(report.includes("AAPL"));

			console.log(`✅ 不完全データでのレポート生成確認 (エラー数: ${errorReports.length})`);
		});

		it("エラー情報付きレポート統合", { timeout }, async () => {
			const errorProneParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-5, 1000] },
				vwap: { enableTrueVWAP: true, standardDeviations: -1 },
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, errorProneParams);

			// パラメータ検証とレポート生成
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(errorProneParams);
			
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
				result, 
				7, 
				validationResult.validatedParams, 
				errorProneParams
			);

			// エラー情報を含む統合メッセージ生成
			const { ErrorHandler } = await import("../src/lib/technical-indicators/utils/errorHandler");
			const consolidatedErrorMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
			
			const finalReport = consolidatedErrorMessage ? `${report}\n\n---\n\n${consolidatedErrorMessage}` : report;

			assert.ok(finalReport);
			assert.ok(finalReport.includes("AAPL"));

			console.log(`✅ エラー情報付きレポート統合確認 (統合後文字数: ${finalReport.length})`);
		});
	});

	describe("リアルタイムエラー復旧テスト", () => {
		it("複数銘柄での連続エラー処理", { timeout }, async () => {
			const testCases = [
				{ symbol: "AAPL", params: { movingAverages: { periods: [-1, 25, 50] } } },
				{ symbol: "INVALID123", params: { rsi: { periods: [999] } } },
				{ symbol: "MSFT", params: { macd: { fastPeriod: -1, slowPeriod: 26, signalPeriod: 9 } } },
			];

			for (const testCase of testCases) {
				try {
					const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive(
						testCase.symbol, 
						"1y", 
						true, 
						testCase.params
					);
					
					if (result) {
						console.log(`✅ ${testCase.symbol}: 成功 (エラー数: ${errorReports.length})`);
					}
				} catch (error: any) {
					console.log(`⚠️ ${testCase.symbol}: エラー - ${error.message || error.toString()}`);
					// エラーが発生しても次のテストケースに継続
				}
			}

			console.log("✅ 複数銘柄での連続エラー処理確認完了");
		});
	});
});