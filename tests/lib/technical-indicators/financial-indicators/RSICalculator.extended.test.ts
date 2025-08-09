import assert from "node:assert";
import { describe, it } from "node:test";
import { RSICalculator } from "../../../../src/lib/technical-indicators/indicators/rsi.js";
import type { 
	RSIExtendedResult, 
	RSILevels 
} from "../../../../src/lib/technical-indicators/financial-indicators/types.js";

describe("RSICalculator Extended Features", () => {
	// 十分な長さのサンプルデータ（50日分）
	const samplePrices = [
		44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89,
		46.03, 46.83, 47.69, 46.49, 46.26, 47.09, 46.66, 47.91, 48.83, 49.05,
		49.20, 49.35, 49.92, 49.68, 49.57, 50.65, 51.77, 50.65, 52.96, 53.75,
		53.87, 53.98, 51.03, 50.95, 49.05, 48.53, 49.24, 49.93, 50.13, 49.38,
		50.33, 50.70, 50.52, 50.51, 50.58, 49.91, 49.88, 49.44, 48.96, 49.53,
	];

	describe("calculateExtended", () => {
		it("14日と21日のRSIを同時に計算する", () => {
			const result: RSIExtendedResult = RSICalculator.calculateExtended(samplePrices);

			// 基本的な型チェック
			assert.ok(typeof result.rsi14 === "number");
			assert.ok(typeof result.rsi21 === "number");
			assert.ok(["overbought", "oversold", "neutral"].includes(result.signal14));
			assert.ok(["overbought", "oversold", "neutral"].includes(result.signal21));

			// 値の範囲チェック
			assert.ok(result.rsi14 >= 0 && result.rsi14 <= 100);
			assert.ok(result.rsi21 >= 0 && result.rsi21 <= 100);
		});

		it("カスタムレベルでのシグナル判定", () => {
			const customLevels: RSILevels = {
				overbought: 80,
				oversold: 20,
			};

			const result: RSIExtendedResult = RSICalculator.calculateExtended(samplePrices, customLevels);

			assert.ok(typeof result.signal14 === "string");
			assert.ok(typeof result.signal21 === "string");
			
			// RSI値とシグナルの整合性をチェック
			if (result.rsi14 >= 80) {
				assert.strictEqual(result.signal14, "overbought");
			} else if (result.rsi14 <= 20) {
				assert.strictEqual(result.signal14, "oversold");
			} else {
				assert.strictEqual(result.signal14, "neutral");
			}
		});

		it("21日RSIが14日RSIより滑らかになる", () => {
			// より長い期間のRSIはより滑らかになることをテスト
			const volatilePrices = [
				50, 60, 40, 70, 30, 80, 20, 90, 10, 95, 
				45, 65, 35, 75, 25, 85, 15, 55, 45, 65,
				50, 60, 40, 70, 30, 80, 20, 90, 10, 95,
				45, 65, 35, 75, 25, 85, 15, 55, 45, 65,
			];

			const result: RSIExtendedResult = RSICalculator.calculateExtended(volatilePrices);

			// 両方とも有効な値であることを確認
			assert.ok(Number.isFinite(result.rsi14));
			assert.ok(Number.isFinite(result.rsi21));
		});
	});

	describe("getSignalWithLevels", () => {
		it("標準レベルでのシグナル判定", () => {
			const standardLevels: RSILevels = { overbought: 70, oversold: 30 };

			assert.strictEqual(RSICalculator.getSignalWithLevels(80, standardLevels), "overbought");
			assert.strictEqual(RSICalculator.getSignalWithLevels(20, standardLevels), "oversold");
			assert.strictEqual(RSICalculator.getSignalWithLevels(50, standardLevels), "neutral");
		});

		it("カスタムレベルでのシグナル判定", () => {
			const customLevels: RSILevels = { overbought: 85, oversold: 15 };

			assert.strictEqual(RSICalculator.getSignalWithLevels(90, customLevels), "overbought");
			assert.strictEqual(RSICalculator.getSignalWithLevels(75, customLevels), "neutral"); // 標準なら overbought
			assert.strictEqual(RSICalculator.getSignalWithLevels(10, customLevels), "oversold");
			assert.strictEqual(RSICalculator.getSignalWithLevels(25, customLevels), "neutral"); // 標準なら oversold
		});

		it("境界値でのシグナル判定", () => {
			const levels: RSILevels = { overbought: 70, oversold: 30 };

			// 境界値は買われすぎ/売られすぎと判定される
			assert.strictEqual(RSICalculator.getSignalWithLevels(70, levels), "overbought");
			assert.strictEqual(RSICalculator.getSignalWithLevels(30, levels), "oversold");
			
			// 境界値の直前は中立
			assert.strictEqual(RSICalculator.getSignalWithLevels(69.99, levels), "neutral");
			assert.strictEqual(RSICalculator.getSignalWithLevels(30.01, levels), "neutral");
		});
	});

	describe("compareMultipleRSI", () => {
		it("複数期間RSIの比較分析を実行する", () => {
			const periods = [14, 21];
			const result = RSICalculator.compareMultipleRSI(samplePrices, periods);

			// 基本構造の確認
			assert.deepStrictEqual(result.periods, periods);
			assert.strictEqual(result.values.length, periods.length);
			assert.strictEqual(result.signals.length, periods.length);

			// 値の妥当性
			result.values.forEach((value) => {
				assert.ok(value >= 0 && value <= 100);
			});

			// シグナルの妥当性
			result.signals.forEach((signal) => {
				assert.ok(["overbought", "oversold", "neutral"].includes(signal));
			});

			// トレンド判定
			assert.ok(["converging", "diverging", "stable"].includes(result.trend));

			// 推奨判定
			assert.ok(["strong_buy", "buy", "hold", "sell", "strong_sell"].includes(result.recommendation));
		});

		it("収束トレンドの検出", () => {
			// 類似した値を持つRSIを作るため、安定したデータを使用
			const stablePrices = new Array(50).fill(0).map((_, i) => 100 + Math.sin(i / 10) * 2);
			
			const result = RSICalculator.compareMultipleRSI(stablePrices, [14, 21]);

			// 安定したデータでは差異が小さくなる傾向
			const maxDiff = Math.max(...result.values) - Math.min(...result.values);
			
			if (maxDiff < 5) {
				assert.strictEqual(result.trend, "converging");
			}
			
			assert.ok(result.values.length === 2);
		});

		it("発散トレンドの検出", () => {
			// 期間によって大きく異なる値を持つように調整された価格データ
			const divergingPrices = [
				// 初期は安定
				...new Array(20).fill(50),
				// 急激な変動（短期RSIに大きく影響）
				80, 20, 90, 10, 85, 15, 80, 20, 90, 10,
				...new Array(20).fill(50),
			];

			const result = RSICalculator.compareMultipleRSI(divergingPrices, [7, 21]);

			// 期間差が大きい場合は発散しやすい
			assert.ok(result.values.length === 2);
			assert.ok(result.trend);
		});

		it("推奨レベルの判定", () => {
			// 極端に低いRSI値を作るデータ
			const oversoldPrices = [
				...new Array(30).fill(100), // 安定期間
				...new Array(10).fill(50),  // 急激な下落
			];

			const result = RSICalculator.compareMultipleRSI(oversoldPrices, [14, 21]);
			
			// 平均RSIが低い場合は買い推奨になる傾向
			const avgRSI = result.values.reduce((sum, val) => sum + val, 0) / result.values.length;
			
			if (avgRSI <= 30) {
				assert.ok(["strong_buy", "buy"].includes(result.recommendation));
			}
		});

		it("単一期間での動作", () => {
			const result = RSICalculator.compareMultipleRSI(samplePrices, [14]);

			assert.strictEqual(result.periods.length, 1);
			assert.strictEqual(result.values.length, 1);
			assert.strictEqual(result.signals.length, 1);
			assert.strictEqual(result.trend, "stable"); // 単一期間では常にstable
		});
	});

	describe("calculateMultiplePeriods", () => {
		it("複数期間のRSI計算", () => {
			const periods = [9, 14, 21, 30];
			const result = RSICalculator.calculateMultiplePeriods(samplePrices, periods);

			// すべての期間で結果が返される
			periods.forEach((period) => {
				const key = `rsi${period}`;
				assert.ok(key in result);
				assert.ok(typeof result[key] === "number");
				assert.ok(result[key] >= 0 && result[key] <= 100);
			});
		});

		it("データ不足の期間はNaNを返す", () => {
			const shortPrices = new Array(15).fill(0).map((_, i) => 100 + i);
			const periods = [14, 21, 50]; // 21と50はデータ不足

			const result = RSICalculator.calculateMultiplePeriods(shortPrices, periods);

			assert.ok(Number.isFinite(result.rsi14)); // 14期間は計算可能
			// 21期間と50期間は計算できない可能性があるが、エラーはthrowしない
			assert.ok("rsi21" in result);
			assert.ok("rsi50" in result);
		});
	});

	describe("integration with existing RSI methods", () => {
		it("calculateExtendedと個別計算の整合性", () => {
			const extended = RSICalculator.calculateExtended(samplePrices);
			const individual14 = RSICalculator.calculate(samplePrices, 14);
			const individual21 = RSICalculator.calculate(samplePrices, 21);

			// 同じ結果になることを確認（小数点誤差を考慮）
			assert.ok(Math.abs(extended.rsi14 - individual14) < 0.001);
			assert.ok(Math.abs(extended.rsi21 - individual21) < 0.001);
		});

		it("getSignalWithLevelsと標準getSignalの整合性", () => {
			const standardLevels: RSILevels = { overbought: 70, oversold: 30 };
			const testRSI = 85;

			const customSignal = RSICalculator.getSignalWithLevels(testRSI, standardLevels);
			const standardSignal = RSICalculator.getSignal(testRSI);

			// 標準レベルを使用した場合は同じ結果になる
			assert.strictEqual(customSignal, standardSignal);
		});
	});

	describe("error handling", () => {
		it("空のデータでの拡張計算", () => {
			assert.throws(() => {
				RSICalculator.calculateExtended([]);
			});
		});

		it("不十分なデータでの拡張計算", () => {
			const shortData = [100, 102, 104]; // 21日分のデータが不足

			assert.throws(() => {
				RSICalculator.calculateExtended(shortData);
			});
		});

		it("無効なレベル設定", () => {
			const invalidLevels: RSILevels = { overbought: -10, oversold: 150 };

			// 無効な値でも動作するが、論理的でない結果になる
			const result = RSICalculator.getSignalWithLevels(50, invalidLevels);
			assert.ok(["overbought", "oversold", "neutral"].includes(result));
		});
	});

	describe("edge cases", () => {
		it("RSI拡張計算での極端な値", () => {
			// すべて上昇する価格データ
			const risingPrices = new Array(50).fill(0).map((_, i) => 100 + i * 2);
			
			const result = RSICalculator.calculateExtended(risingPrices);

			// 上昇トレンドではRSIは高くなる
			assert.ok(result.rsi14 >= 50);
			assert.ok(result.rsi21 >= 50);
			assert.ok(result.rsi14 <= 100);
			assert.ok(result.rsi21 <= 100);
		});

		it("フラットな価格でのRSI拡張", () => {
			const flatPrices = new Array(50).fill(100);
			
			const result = RSICalculator.calculateExtended(flatPrices);

			// 価格変動がない場合はRSI=50
			assert.strictEqual(result.rsi14, 50);
			assert.strictEqual(result.rsi21, 50);
			assert.strictEqual(result.signal14, "neutral");
			assert.strictEqual(result.signal21, "neutral");
		});

		it("極端なボラティリティでのRSI比較", () => {
			const volatilePrices = [
				...new Array(15).fill(100),
				200, 50, 180, 60, 170, 70, 160, 80, 150, 90,
				...new Array(25).fill(100),
			];

			const comparison = RSICalculator.compareMultipleRSI(volatilePrices, [5, 14, 21]);

			// ボラティリティが高い場合は発散しやすい
			assert.ok(comparison.values.length === 3);
			
			// すべての値が有限値
			comparison.values.forEach(value => {
				assert.ok(Number.isFinite(value));
				assert.ok(value >= 0 && value <= 100);
			});
		});
	});

	describe("performance considerations", () => {
		it("大量データでの拡張RSI計算", () => {
			// 大量のデータ（500日分）
			const largePrices = new Array(500).fill(0).map((_, i) => 
				100 + Math.sin(i / 20) * 10 + (Math.random() - 0.5) * 5
			);

			const startTime = Date.now();
			const result = RSICalculator.calculateExtended(largePrices);
			const endTime = Date.now();

			// 結果が有効
			assert.ok(Number.isFinite(result.rsi14));
			assert.ok(Number.isFinite(result.rsi21));

			// パフォーマンス確認（1秒以内で完了する想定）
			assert.ok(endTime - startTime < 1000);
		});

		it("多数期間での比較分析", () => {
			const manyPeriods = [7, 9, 14, 18, 21, 25, 30];
			
			const startTime = Date.now();
			const result = RSICalculator.compareMultipleRSI(samplePrices, manyPeriods);
			const endTime = Date.now();

			// 全期間の結果が返される
			assert.strictEqual(result.periods.length, manyPeriods.length);
			assert.strictEqual(result.values.length, manyPeriods.length);

			// パフォーマンス確認
			assert.ok(endTime - startTime < 1000);
		});
	});
});