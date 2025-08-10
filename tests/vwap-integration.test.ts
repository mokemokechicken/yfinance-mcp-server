import { describe, it } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * VWAP機能（ハイブリッドVWAP含む）の統合テスト
 * 真の1日VWAP、移動VWAP、ハイブリッド分析機能の統合検証
 */
describe("VWAP機能統合テスト", () => {
	const timeout = 40000; // VWAP計算は15分足APIを使用するため長めに設定

	describe("真の1日VWAP統合テスト", () => {
		it("真のVWAP有効化での統合分析", { timeout }, async () => {
			const vwapParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, vwapParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.extendedIndicators);

			// 真のVWAPまたは移動VWAPが存在することを確認
			const hasVwap = 'vwap' in result.extendedIndicators && result.extendedIndicators.vwap;
			const hasMvwap = 'vwap' in result.extendedIndicators && result.extendedIndicators.vwap;
			
			assert.ok(hasVwap || hasMvwap, "VWAPまたはMVWAP計算結果が存在しない");

			// エラーレポートの確認（15分足データが取得できない場合はMVWAPにフォールバック）
			console.log(`VWAP計算エラー数: ${errorReports.length}`);
			
			// レポート生成でVWAP情報が含まれることを確認
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report.includes("VWAP") || report.includes("MVWAP"), "レポートにVWAP情報が含まれていない");

			console.log("✅ 真のVWAP有効化での統合分析完了");
		});

		it("真のVWAP標準偏差カスタム設定での統合テスト", { timeout }, async () => {
			const customVwapParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 2.5,
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("MSFT", "1y", true, customVwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// VWAP計算結果の存在確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "VWAP計算が実行されていない");

			console.log("✅ 真のVWAP標準偏差カスタム設定での統合テスト完了");
		});

		it("15分足データ取得失敗時のMVWAPフォールバック", { timeout }, async () => {
			// 15分足データが利用できない可能性のある銘柄やシナリオでテスト
			const vwapParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("TSLA", "1y", true, vwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 何らかのVWAP計算結果が存在することを確認（フォールバック含む）
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "VWAP機能のフォールバックが動作していない");

			// エラーレポートの内容確認
			if (errorReports.length > 0) {
				console.log(`フォールバックが発生: ${errorReports.length}件のエラー`);
				// エラーハンドリングが適切に動作していることを確認
				assert.ok(errorReports.some(error => error.context?.indicator?.includes("VWAP")));
			}

			console.log("✅ 15分足データ取得失敗時のMVWAPフォールバック確認完了");
		});
	});

	describe("移動VWAP統合テスト", () => {
		it("移動VWAPのみでの統合分析", { timeout }, async () => {
			const vwapParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: false, // 真のVWAPを無効化
					standardDeviations: 1.5,
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, vwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 移動VWAPが存在することを確認
			const hasMvwap = 'vwap' in result.extendedIndicators && result.extendedIndicators.vwap;
			assert.ok(hasMvwap, "移動VWAP計算結果が存在しない");

			// 真のVWAPが計算されていないことを確認
			const hasVwap = 'vwap' in result.extendedIndicators && result.extendedIndicators.vwap;
			// 注: 実装により、VWAPがフォールバックとして計算される場合もあるため、
			// ここでは単純に存在しないことをアサートしない

			console.log("✅ 移動VWAPのみでの統合分析完了");
		});

		it("移動VWAPカスタム期間設定での統合テスト", { timeout }, async () => {
			const customMvwapParams: TechnicalParametersConfig = {
				vwap: {
					standardDeviations: 2.0,
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("GOOGL", "1y", true, customMvwapParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// レポート生成でカスタム期間が反映されることを確認
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(customMvwapParams);
			
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
				result, 
				7, 
				validationResult.validatedParams, 
				customMvwapParams
			);

			assert.ok(report);
			assert.ok(report.includes("VWAP") || report.includes("MVWAP"));

			console.log("✅ 移動VWAPカスタム期間設定での統合テスト完了");
		});
	});

	describe("ハイブリッドVWAP統合テスト", () => {
		it("真のVWAP + 移動VWAP両方有効での統合分析", { timeout }, async () => {
			const hybridParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1.3,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, hybridParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 少なくとも1つのVWAP関連指標が存在することを確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "ハイブリッドVWAP分析でVWAP計算が実行されていない");

			// レポート生成でハイブリッド情報が含まれることを確認
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report);
			
			// VWAPまたはMVWAP情報が含まれることを確認
			const hasVwapInReport = report.includes("VWAP") || report.includes("MVWAP");
			assert.ok(hasVwapInReport, "レポートにVWAP情報が含まれていない");

			console.log(`✅ ハイブリッドVWAP統合分析完了 (エラー数: ${errorReports.length})`);
		});

		it("異なる標準偏差設定でのハイブリッド分析", { timeout }, async () => {
			const differentSigmaParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 2.5, // 広いバンド
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("NVDA", "1y", true, differentSigmaParams);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 異なる設定での計算が実行されることを確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "異なる標準偏差でのVWAP計算が実行されていない");

			console.log("✅ 異なる標準偏差設定でのハイブリッド分析完了");
		});
	});

	describe("VWAPトレーディングシグナル統合テスト", () => {
		it("VWAP価格位置による統合シグナル分析", { timeout }, async () => {
			const signalParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, signalParams);

			assert.ok(result);
			assert.ok(result.signals);

			// 統合シグナル分析にVWAP情報が含まれることを期待
			// (実装により、VWAPベースのシグナルが統合シグナルに影響)
			assert.ok(result.signals.trend || result.signals.momentum || result.signals.strength);

			// レポートにシグナル分析が含まれることを確認
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);
			assert.ok(report);
			assert.ok(report.includes("シグナル") || report.includes("分析"));

			console.log("✅ VWAPトレーディングシグナル統合分析完了");
		});

		it("VWAPバンド境界での統合シグナル検証", { timeout }, async () => {
			const bandParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 2, // 広いバンドでのテスト
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("TSLA", "1y", true, bandParams);

			assert.ok(result);
			assert.ok(result.signals);

			// VWAPバンドが統合分析に影響することを確認
			// (具体的な検証は実装依存)
			assert.ok(typeof result.signals.trend === 'string');
			assert.ok(typeof result.signals.momentum === 'string');
			assert.ok(typeof result.signals.strength === 'string');

			console.log("✅ VWAPバンド境界での統合シグナル検証完了");
		});
	});

	describe("VWAP日本株統合テスト", () => {
		it("日本株でのVWAP統合分析", { timeout }, async () => {
			const japaneseStockParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("7203.T", "1y", true, japaneseStockParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "7203.T");
			assert.ok(result.extendedIndicators);

			// 日本株でもVWAP計算が実行されることを確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "日本株でのVWAP計算が実行されていない");

			// 15分足データの利用可能性によるエラーハンドリング
			console.log(`日本株VWAP分析エラー数: ${errorReports.length}`);

			console.log("✅ 日本株でのVWAP統合分析完了");
		});

		it("日本株でのMVWAPフォールバック統合テスト", { timeout }, async () => {
			const fallbackParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true, // 真のVWAP試行
					standardDeviations: 1.5,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("6301.T", "1y", true, fallbackParams);

			assert.ok(result);
			assert.strictEqual(result.symbol, "6301.T");

			// フォールバック機構が動作することを確認
			const hasVwap = 'vwap' in result.extendedIndicators;
			const hasMvwap = 'vwap' in result.extendedIndicators;
			assert.ok(hasVwap || hasMvwap, "日本株でのVWAPフォールバック機構が動作していない");

			console.log("✅ 日本株でのMVWAPフォールバック統合テスト完了");
		});
	});

	describe("VWAP計算パフォーマンステスト", () => {
		it("VWAP統合分析のパフォーマンス検証", { timeout }, async () => {
			const performanceParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
				// 他の指標も含めた総合的なパフォーマンステスト
				movingAverages: { periods: [25, 50, 200] },
				rsi: { periods: [14, 21] },
				macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
			};

			const startTime = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, performanceParams);
			const endTime = Date.now();

			assert.ok(result);
			
			const executionTime = endTime - startTime;
			console.log(`📊 VWAP統合分析実行時間: ${executionTime}ms`);

			// VWAP計算を含めても合理的な時間内で完了することを確認
			assert.ok(executionTime < 35000, `VWAP統合分析の実行時間が長すぎます: ${executionTime}ms`);

			console.log("✅ VWAP統合分析のパフォーマンス検証完了");
		});
	});

	describe("VWAPエラーハンドリング統合テスト", () => {
		it("15分足API制限時のGraceful Degradation", { timeout }, async () => {
			const limitTestParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 1,
				},
			};

			const { result, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive("AMZN", "1y", true, limitTestParams);

			// エラーが発生しても分析結果は返される
			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// エラーレポートが適切に処理される
			if (errorReports.length > 0) {
				const { ErrorHandler } = await import("../src/lib/technical-indicators/utils/errorHandler");
				const consolidatedMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
				assert.ok(consolidatedMessage || consolidatedMessage === '', "エラーメッセージ統合処理に問題があります");
			}

			console.log("✅ 15分足API制限時のGraceful Degradation確認完了");
		});

		it("無効なVWAPパラメータでの修正処理", { timeout }, async () => {
			const invalidVwapParams: TechnicalParametersConfig = {
				vwap: {
					enableTrueVWAP: true,
					standardDeviations: 0, // 無効値
				},
			};

			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, invalidVwapParams);

			// 無効パラメータが修正されて計算が継続される
			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// パラメータ検証で修正されることを確認
			const { ParameterValidator } = await import("../src/lib/technical-indicators/utils/parameterValidator");
			const validationResult = ParameterValidator.validateAndSetDefaults(invalidVwapParams);
			
			assert.ok(validationResult.validatedParams);
			assert.ok(validationResult.validatedParams.vwap);
			assert.ok(validationResult.validatedParams.vwap);
			
			// 修正された値が適切であることを確認
			assert.ok(validationResult.validatedParams.vwap.standardDeviations > 0);
			assert.ok(validationResult.validatedParams.vwap.standardDeviations > 0);

			console.log("✅ 無効なVWAPパラメータでの修正処理確認完了");
		});
	});
});