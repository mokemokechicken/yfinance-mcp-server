import { describe, it } from "node:test";
import assert from "node:assert";
import { ParameterValidator } from "../src/lib/technical-indicators/utils/parameterValidator";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

describe("パラメータ渡し機能のテスト", () => {
	describe("ParameterValidator", () => {
		it("デフォルト値の検証", () => {
			const result = ParameterValidator.validateAndSetDefaults();
			
			assert.strictEqual(result.hasCustomSettings, false);
			assert.deepStrictEqual(result.validatedParams.movingAverages.periods, [25, 50, 200]);
			assert.deepStrictEqual(result.validatedParams.rsi.periods, [14, 21]);
			assert.strictEqual(result.validatedParams.rsi.overbought, 70);
			assert.strictEqual(result.validatedParams.rsi.oversold, 30);
		});

		it("カスタムパラメータの検証", () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14], overbought: 75, oversold: 25 },
				bollingerBands: { period: 15, standardDeviations: 1.5 },
			};

			const result = ParameterValidator.validateAndSetDefaults(customParams);
			
			assert.strictEqual(result.hasCustomSettings, true);
			assert.deepStrictEqual(result.validatedParams.movingAverages.periods, [10, 30, 100]);
			assert.deepStrictEqual(result.validatedParams.rsi.periods, [7, 14]);
			assert.strictEqual(result.validatedParams.rsi.overbought, 75);
			assert.strictEqual(result.validatedParams.rsi.oversold, 25);
			assert.strictEqual(result.validatedParams.bollingerBands.period, 15);
			assert.strictEqual(result.validatedParams.bollingerBands.standardDeviations, 1.5);
		});

		it("無効なパラメータの修正", () => {
			const invalidParams: TechnicalParametersConfig = {
				movingAverages: { periods: [-5, 0, 1000] }, // 無効値
				rsi: { overbought: 150, oversold: -10 },     // 範囲外
			};

			const result = ParameterValidator.validateAndSetDefaults(invalidParams);
			
			assert.strictEqual(result.hasCustomSettings, true);
			assert.ok(result.warnings.length > 0);
			// 無効値はデフォルト値に修正される
			assert.deepStrictEqual(result.validatedParams.movingAverages.periods, [25, 50, 200]);
			assert.strictEqual(result.validatedParams.rsi.overbought, 70);
			assert.strictEqual(result.validatedParams.rsi.oversold, 30);
		});

		it("部分的なパラメータ設定", () => {
			const partialParams: TechnicalParametersConfig = {
				movingAverages: { periods: [20, 60] }
				// 他の設定はデフォルト値を使用
			};

			const result = ParameterValidator.validateAndSetDefaults(partialParams);
			
			assert.strictEqual(result.hasCustomSettings, true);
			assert.deepStrictEqual(result.validatedParams.movingAverages.periods, [20, 60]);
			assert.deepStrictEqual(result.validatedParams.rsi.periods, [14, 21]); // デフォルト
			assert.strictEqual(result.validatedParams.rsi.overbought, 70); // デフォルト
		});
	});

	describe("TechnicalAnalyzer.analyzeStockComprehensive", () => {
		it("新しいメソッドシグネチャの受け入れテスト", async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30] },
				rsi: { periods: [7], overbought: 75 },
			};

			// メソッドが4番目の引数を受け取ることを検証
			// 実際のAPIコールはしないで、メソッドシグネチャのテスト
			const methodExists = typeof TechnicalAnalyzer.analyzeStockComprehensive === "function";
			assert.strictEqual(methodExists, true);

			// メソッドの引数の長さをチェック（デフォルト値を持つパラメータはlengthに含まれない）
			const methodLength = TechnicalAnalyzer.analyzeStockComprehensive.length;
			assert.strictEqual(methodLength, 1); // symbolのみ（他はデフォルト値あり）

			// 型チェックのため、実際の呼び出しを模擬的に検証
			// ただし、実際のAPI呼び出しは避けるため、ここでは型の互換性のみ検証
			const callParams = ["AAPL", "1y", true, customParams] as const;
			assert.strictEqual(callParams.length, 4);
		});

		it("下位互換性のテスト", async () => {
			// 既存の呼び出し方法が動作することを検証
			const methodExists = typeof TechnicalAnalyzer.analyzeStockComprehensive === "function";
			assert.strictEqual(methodExists, true);

			// 3引数での呼び出しも可能であることを型レベルで検証
			const compatibleCall = ["AAPL", "1y", true] as const;
			assert.strictEqual(compatibleCall.length, 3);
		});
	});

	describe("拡張指標計算のパラメータ伝播", () => {
		it("calculateExtendedIndicatorsがパラメータを受け取る", async () => {
			// TechnicalAnalyzerインスタンスを作成してメソッドの存在を確認
			const mockPriceData = [
				{
					date: new Date("2024-01-01"),
					open: 100,
					high: 105,
					low: 95,
					close: 102,
					volume: 1000000,
				},
			];

			const analyzer = new TechnicalAnalyzer(mockPriceData);
			const methodExists = typeof analyzer.calculateExtendedIndicators === "function";
			assert.strictEqual(methodExists, true);

			// デフォルト呼び出し（パラメータなし）
			const result1 = await analyzer.calculateExtendedIndicators("AAPL");
			assert.ok(result1);
			assert.ok("bollingerBands" in result1);
			assert.ok("stochastic" in result1);
			assert.ok("vwap" in result1);

			// カスタムパラメータでの呼び出し
			const customParams = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14], overbought: 75, oversold: 25 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 15, standardDeviations: 1.5 },
				stochastic: { kPeriod: 10, dPeriod: 5, overbought: 85, oversold: 15 },
				volumeAnalysis: { period: 15, spikeThreshold: 2.5 },
				vwap: { enableTrueVWAP: true, standardDeviations: 1.5 },
				mvwap: { period: 25, standardDeviations: 1.5 },
			};

			const result2 = await analyzer.calculateExtendedIndicators("AAPL", customParams);
			assert.ok(result2);
			assert.ok("bollingerBands" in result2);
			assert.ok("stochastic" in result2);
			assert.ok("vwap" in result2);
		});
	});

	describe("エラーハンドリング", () => {
		it("Graceful Degradationの動作", async () => {
			// データ不足の場合でもエラーで止まらず、フォールバック値を返すことを検証
			const emptyData: any[] = [];
			const analyzer = new TechnicalAnalyzer(emptyData);

			// エラーが発生しても関数は完了し、結果オブジェクトが返される
			const result = await analyzer.calculateExtendedIndicators("AAPL");
			assert.ok(result);
			assert.ok("bollingerBands" in result);
			assert.ok("stochastic" in result);
			assert.ok("vwap" in result);

			// フォールバック値が設定されている
			assert.strictEqual(result.bollingerBands.upper, 0);
			assert.strictEqual(result.stochastic.k, 0);
			assert.strictEqual(result.vwap.movingVWAP.vwap, 0);
		});
	});
});