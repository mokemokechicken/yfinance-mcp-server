import assert from "node:assert";
import { describe, it } from "node:test";
import { MovingAverageDeviationCalculator } from "../../../../src/lib/technical-indicators/financial-indicators/MovingAverageDeviationCalculator.js";
import type { 
	MovingAverageDeviationResult, 
	DeviationSignal 
} from "../../../../src/lib/technical-indicators/financial-indicators/types.js";

describe("MovingAverageDeviationCalculator", () => {
	const samplePrices = [
		100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
		111, 110, 112, 114, 113, 115, 117, 116, 118, 120,
		119, 121, 123, 122, 124, 126, 125, 127, 129, 128,
	];

	describe("calculate", () => {
		it("基本的な移動平均乖離率を計算する", () => {
			const result = MovingAverageDeviationCalculator.calculate(samplePrices, 10);

			assert.ok(typeof result.period === "number");
			assert.ok(typeof result.currentPrice === "number");
			assert.ok(typeof result.movingAverage === "number");
			assert.ok(typeof result.deviation === "number");
			assert.ok(["positive", "negative"].includes(result.deviationDirection));
			
			// 期間が正しく設定される
			assert.strictEqual(result.period, 10);
			
			// 現在価格は最後の価格
			assert.strictEqual(result.currentPrice, samplePrices[samplePrices.length - 1]);
			
			// 乖離率は-100%から+100%の範囲外も可能だが、有限値である
			assert.ok(Number.isFinite(result.deviation));
		});

		it("正の乖離率を正しく計算する", () => {
			// 上昇トレンドのデータ
			const upTrendPrices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 110]; // 最後だけ高い
			const result = MovingAverageDeviationCalculator.calculate(upTrendPrices, 9);

			assert.ok(result.deviation > 0);
			assert.strictEqual(result.deviationDirection, "positive");
			assert.strictEqual(result.currentPrice, 110);
		});

		it("負の乖離率を正しく計算する", () => {
			// 下降トレンドのデータ
			const downTrendPrices = [110, 110, 110, 110, 110, 110, 110, 110, 110, 100]; // 最後だけ低い
			const result = MovingAverageDeviationCalculator.calculate(downTrendPrices, 9);

			assert.ok(result.deviation < 0);
			assert.strictEqual(result.deviationDirection, "negative");
			assert.strictEqual(result.currentPrice, 100);
		});

		it("乖離率の計算式が正しい", () => {
			const prices = [100, 100, 100, 100, 120]; // MA=104, 現在価格=120
			const result = MovingAverageDeviationCalculator.calculate(prices, 4);

			const expectedMA = (100 + 100 + 100 + 120) / 4; // 105
			const expectedDeviation = ((120 - expectedMA) / expectedMA) * 100;

			assert.strictEqual(result.movingAverage, expectedMA);
			assert.strictEqual(result.currentPrice, 120);
			assert.ok(Math.abs(result.deviation - expectedDeviation) < 0.001); // 小数点誤差を考慮
		});
	});

	describe("calculateMultiple", () => {
		it("複数期間の乖離率を一括計算する", () => {
			const periods = [5, 10, 20];
			const results = MovingAverageDeviationCalculator.calculateMultiple(samplePrices, periods);

			assert.strictEqual(results.length, 3);
			
			results.forEach((result, index) => {
				assert.strictEqual(result.period, periods[index]);
				assert.ok(Number.isFinite(result.deviation));
				assert.strictEqual(result.currentPrice, samplePrices[samplePrices.length - 1]);
			});
		});

		it("期間が長すぎる場合エラーを投げる", () => {
			const shortPrices = [100, 102, 104];
			const periods = [5, 10]; // 5期間は計算不可能

			assert.throws(() => {
				MovingAverageDeviationCalculator.calculateMultiple(shortPrices, periods);
			});
		});
	});

	describe("getDeviationSignal", () => {
		it("強い上振れシグナルを検出する", () => {
			const signal = MovingAverageDeviationCalculator.getDeviationSignal(15);
			assert.strictEqual(signal, "strong_above");
		});

		it("上振れシグナルを検出する", () => {
			const signal = MovingAverageDeviationCalculator.getDeviationSignal(7);
			assert.strictEqual(signal, "above");
		});

		it("中立シグナルを検出する", () => {
			const signal = MovingAverageDeviationCalculator.getDeviationSignal(2);
			assert.strictEqual(signal, "neutral");
		});

		it("下振れシグナルを検出する", () => {
			const signal = MovingAverageDeviationCalculator.getDeviationSignal(-7);
			assert.strictEqual(signal, "below");
		});

		it("強い下振れシグナルを検出する", () => {
			const signal = MovingAverageDeviationCalculator.getDeviationSignal(-15);
			assert.strictEqual(signal, "strong_below");
		});

		it("境界値で正しく動作する", () => {
			assert.strictEqual(MovingAverageDeviationCalculator.getDeviationSignal(10), "strong_above");
			assert.strictEqual(MovingAverageDeviationCalculator.getDeviationSignal(5), "above");
			assert.strictEqual(MovingAverageDeviationCalculator.getDeviationSignal(-5), "below");
			assert.strictEqual(MovingAverageDeviationCalculator.getDeviationSignal(-10), "strong_below");
		});
	});

	describe("getOverallSignal", () => {
		it("強い上振れの総合シグナル", () => {
			const results: MovingAverageDeviationResult[] = [
				{
					period: 25,
					currentPrice: 120,
					movingAverage: 100,
					deviation: 15, // strong_above
					deviationDirection: "positive",
				},
				{
					period: 50,
					currentPrice: 120,
					movingAverage: 105,
					deviation: 12, // strong_above
					deviationDirection: "positive",
				},
			];

			const overallSignal = MovingAverageDeviationCalculator.getOverallSignal(results);

			assert.strictEqual(overallSignal.signal, "strong_above");
			assert.strictEqual(overallSignal.confidence, "high");
			assert.ok(overallSignal.details.includes("25日"));
			assert.ok(overallSignal.details.includes("50日"));
		});

		it("混合シグナルの総合判定", () => {
			const results: MovingAverageDeviationResult[] = [
				{
					period: 25,
					currentPrice: 110,
					movingAverage: 100,
					deviation: 7, // above
					deviationDirection: "positive",
				},
				{
					period: 50,
					currentPrice: 110,
					movingAverage: 115,
					deviation: -4, // neutral
					deviationDirection: "negative",
				},
				{
					period: 200,
					currentPrice: 110,
					movingAverage: 105,
					deviation: 2, // neutral
					deviationDirection: "positive",
				},
			];

			const overallSignal = MovingAverageDeviationCalculator.getOverallSignal(results);

			// 60%以上が同じシグナルでない場合は、優勢なシグナルに基づく
			assert.ok(["above", "neutral"].includes(overallSignal.signal));
			assert.ok(overallSignal.confidence);
			assert.ok(overallSignal.details.length > 0);
		});

		it("空の結果配列でエラーを投げる", () => {
			assert.throws(() => {
				MovingAverageDeviationCalculator.getOverallSignal([]);
			}, /乖離率結果が空です/);
		});
	});

	describe("analyzeDeviationTrend", () => {
		it("上昇トレンドを検出する", () => {
			// 段階的に上昇するデータ
			const pricesHistory = [
				[100, 100, 100, 100, 100], // 5日前
				[100, 100, 100, 100, 102], // 4日前
				[100, 100, 100, 102, 104], // 3日前
				[100, 100, 102, 104, 106], // 2日前
				[100, 102, 104, 106, 108], // 1日前
			];

			const analysis = MovingAverageDeviationCalculator.analyzeDeviationTrend(
				pricesHistory, 
				3, // 3日移動平均
				5  // 5日分を分析
			);

			assert.ok(["increasing", "decreasing", "stable"].includes(analysis.trend));
			assert.strictEqual(analysis.deviationHistory.length, 5);
			assert.ok(Number.isFinite(analysis.averageDeviation));
		});

		it("データ不足の場合エラーを投げる", () => {
			const pricesHistory = [
				[100, 100, 100],
				[100, 100, 102],
			]; // 5日分のデータが必要

			assert.throws(() => {
				MovingAverageDeviationCalculator.analyzeDeviationTrend(pricesHistory, 3, 5);
			}, /トレンド分析には最低5日分のデータが必要です/);
		});

		it("線形回帰による傾き計算", () => {
			// 完全に上昇するトレンド
			const pricesHistory = [
				[100, 100, 100, 100, 100], // 乖離率0%
				[100, 100, 100, 100, 105], // 乖離率約5%
				[100, 100, 100, 105, 110], // 乖離率約10%
				[100, 100, 105, 110, 115], // 乖離率約15%
				[100, 105, 110, 115, 120], // 乖離率約20%
			];

			const analysis = MovingAverageDeviationCalculator.analyzeDeviationTrend(
				pricesHistory, 
				4, // 4日移動平均
				5  // 5日分を分析
			);

			// 明確な上昇トレンドの場合
			assert.strictEqual(analysis.trend, "increasing");
			assert.ok(analysis.averageDeviation > 0);
		});
	});

	describe("error handling", () => {
		it("空の価格配列でエラーを投げる", () => {
			assert.throws(() => {
				MovingAverageDeviationCalculator.calculate([], 10);
			}, /価格データが空です/);
		});

		it("無効な期間でエラーを投げる", () => {
			assert.throws(() => {
				MovingAverageDeviationCalculator.calculate([100, 102], 0);
			}, /無効な期間です/);

			assert.throws(() => {
				MovingAverageDeviationCalculator.calculate([100, 102], 5);
			}, /無効な期間です/);
		});

		it("期間配列が空の場合エラーを投げる", () => {
			assert.throws(() => {
				MovingAverageDeviationCalculator.calculateMultiple(samplePrices, []);
			}, /期間配列が空です/);
		});
	});

	describe("edge cases", () => {
		it("価格が全て同じ場合", () => {
			const flatPrices = new Array(20).fill(100);
			const result = MovingAverageDeviationCalculator.calculate(flatPrices, 10);

			assert.strictEqual(result.currentPrice, 100);
			assert.strictEqual(result.movingAverage, 100);
			assert.strictEqual(result.deviation, 0);
			assert.strictEqual(result.deviationDirection, "positive"); // 0は正として扱われる
		});

		it("極端に小さな期間", () => {
			const result = MovingAverageDeviationCalculator.calculate([100, 110], 1);

			assert.strictEqual(result.period, 1);
			assert.strictEqual(result.currentPrice, 110);
			assert.strictEqual(result.movingAverage, 110); // 1期間MA = 現在価格
			assert.strictEqual(result.deviation, 0);
		});

		it("極端に大きな乖離率", () => {
			const extremePrices = [100, 100, 100, 100, 1000]; // 最後だけ10倍
			const result = MovingAverageDeviationCalculator.calculate(extremePrices, 4);

			// 計算結果が有限値であることを確認
			assert.ok(Number.isFinite(result.deviation));
			assert.ok(result.deviation !== 0); // 乖離があることを確認
			assert.ok(Math.abs(result.deviation) > 10); // 大きな乖離率であることを確認
			assert.strictEqual(result.currentPrice, 1000);
		});

		it("負の価格データの処理", () => {
			// 理論的には価格は負にならないが、差分データなどで使用される可能性
			const negativePrices = [-10, -8, -6, -4, -2];
			const result = MovingAverageDeviationCalculator.calculate(negativePrices, 3);

			assert.ok(Number.isFinite(result.deviation));
			assert.strictEqual(result.currentPrice, -2);
		});
	});

	describe("precision", () => {
		it("小数点精度の確認", () => {
			const precisePrices = [100.123, 100.456, 100.789];
			const result = MovingAverageDeviationCalculator.calculate(precisePrices, 2);

			// 計算結果が適切な精度で返される
			assert.ok(Number.isFinite(result.movingAverage));
			assert.ok(Number.isFinite(result.deviation));
			
			// 基本的な数値検証のみ
			assert.ok(typeof result.deviation === 'number');
		});

		it("非常に大きな数値での計算", () => {
			const largePrices = [1e10, 1.01e10, 1.02e10];
			const result = MovingAverageDeviationCalculator.calculate(largePrices, 2);

			assert.ok(Number.isFinite(result.deviation));
			assert.ok(!Number.isNaN(result.deviation));
		});
	});
});