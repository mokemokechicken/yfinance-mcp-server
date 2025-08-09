import assert from "node:assert";
import { describe, it } from "node:test";
import { RSICalculator } from "../../../../src/lib/technical-indicators/indicators/rsi.js";
import { CalculationError } from "../../../../src/lib/technical-indicators/types.js";

describe("RSICalculator", () => {
	describe("calculate", () => {
		it("基本的なRSI計算を実行する", () => {
			// 15個のデータポイント（14期間 + 1）
			const prices = [
				44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
				46.03, 46.83, 47.69, 46.49, 46.26,
			];

			const result = RSICalculator.calculate(prices, 14);

			// RSIは0-100の範囲
			assert.ok(result >= 0 && result <= 100);
		});

		it("空配列の場合エラーを投げる", () => {
			assert.throws(() => {
				RSICalculator.calculate([], 14);
			}, CalculationError);
		});

		it("期間が足りない場合エラーを投げる", () => {
			const prices = [1, 2, 3]; // 期間14に対して不足
			assert.throws(() => {
				RSICalculator.calculate(prices, 14);
			}, CalculationError);
		});

		it("価格が全て上昇の場合RSI=100を返す", () => {
			const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
			const result = RSICalculator.calculate(prices, 14);

			assert.strictEqual(result, 100);
		});

		// 新しいエラーケーステスト
		it("無効なperiodでエラーを投げる", () => {
			const prices = new Array(120).fill(0).map((_, i) => 100 + i);
			assert.throws(() => {
				RSICalculator.calculate(prices, 0);
			}, {
				name: 'CalculationError',
				message: /period must be a positive integer/
			});
		});

		it("無効なwarmupPeriodでエラーを投げる", () => {
			const prices = new Array(120).fill(0).map((_, i) => 100 + i);
			assert.throws(() => {
				RSICalculator.calculate(prices, 14, -10);
			}, {
				name: 'CalculationError',
				message: /warmupPeriod must be a positive integer/
			});
		});

		it("価格に非有限値が含まれる場合エラーを投げる", () => {
			const prices = new Array(120).fill(0).map((_, i) => 100 + i);
			prices[50] = Number.NaN;
			assert.throws(() => {
				RSICalculator.calculate(prices, 14);
			}, {
				name: 'CalculationError',
				message: /Invalid price at index 50/
			});
		});

		it("価格が変動しない場合RSI=50を返す", () => {
			const prices = new Array(120).fill(100); // 全て同じ価格
			const result = RSICalculator.calculate(prices, 14);
			assert.strictEqual(result, 50);
		});
	});

	describe("calculateMultiplePeriods", () => {
		it("複数期間のRSIを計算する", () => {
			const prices = [
				44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
				46.03, 46.83, 47.69, 46.49, 46.26, 47.09, 46.66, 47.91,
			];
			const periods = [14, 21];
			const result = RSICalculator.calculateMultiplePeriods(prices, periods);

			assert.ok(typeof result.rsi14 === "number");
			assert.ok(result.rsi14 >= 0 && result.rsi14 <= 100);
			// 21期間の方はデータ不足でNaN
			assert.ok(Number.isNaN(result.rsi21));
		});
	});

	describe("calculateArray", () => {
		it("RSI配列を計算する", () => {
			const prices = [
				44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
				46.03, 46.83, 47.69, 46.49, 46.26, 47.09,
			];

			const result = RSICalculator.calculateArray(prices, 14);

			// 16個のデータから2個のRSI値が計算される
			assert.strictEqual(result.length, 2);
			assert.ok(result.every((rsi) => rsi >= 0 && rsi <= 100));
		});

		it("期間が足りない場合空配列を返す", () => {
			const prices = [1, 2, 3];
			const result = RSICalculator.calculateArray(prices, 14);

			assert.deepStrictEqual(result, []);
		});
	});

	describe("getSignal", () => {
		it("買われすぎシグナルを検出する", () => {
			const result = RSICalculator.getSignal(80);
			assert.strictEqual(result, "overbought");
		});

		it("売られすぎシグナルを検出する", () => {
			const result = RSICalculator.getSignal(20);
			assert.strictEqual(result, "oversold");
		});

		it("中立シグナルを返す", () => {
			const result = RSICalculator.getSignal(50);
			assert.strictEqual(result, "neutral");
		});

		it("境界値で正しく動作する", () => {
			assert.strictEqual(RSICalculator.getSignal(70), "overbought");
			assert.strictEqual(RSICalculator.getSignal(30), "oversold");
		});
	});

	describe("getMomentum", () => {
		it("モメンタム計算が実行される", () => {
			// 十分なデータがある場合に有効な結果を返すことを確認
			const prices = [
				40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 50, 60,
			];
			const result = RSICalculator.getMomentum(prices, 14);

			// 有効な値のいずれかを返すことを確認
			assert.ok(["positive", "negative", "neutral"].includes(result));
		});

		it("データ不足の場合ニュートラルを返す", () => {
			const prices = [1, 2, 3];
			const result = RSICalculator.getMomentum(prices, 14);

			assert.strictEqual(result, "neutral");
		});
	});

	describe("getStrength", () => {
		it("強いシグナルを検出する", () => {
			assert.strictEqual(RSICalculator.getStrength(85), "strong");
			assert.strictEqual(RSICalculator.getStrength(15), "strong");
		});

		it("中程度のシグナルを検出する", () => {
			assert.strictEqual(RSICalculator.getStrength(70), "moderate");
			assert.strictEqual(RSICalculator.getStrength(30), "moderate");
		});

		it("弱いシグナルを検出する", () => {
			assert.strictEqual(RSICalculator.getStrength(50), "weak");
		});
	});

	describe("detectDivergence", () => {
		it("基本的なダイバージェンス検出を実行する", () => {
			const prices = [
				44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
				46.03, 46.83, 47.69, 46.49, 46.26, 47.09, 46.66, 47.91, 48.83, 49.05,
				49.20, 49.35, 49.92,
			];

			const result = RSICalculator.detectDivergence(prices, 14, 10);

			// 有効な値のいずれかを返す
			assert.ok(["bullish", "bearish", "none"].includes(result));
		});

		it("データ不足の場合noneを返す", () => {
			const prices = [1, 2, 3];
			const result = RSICalculator.detectDivergence(prices, 14, 10);

			assert.strictEqual(result, "none");
		});
	});
});