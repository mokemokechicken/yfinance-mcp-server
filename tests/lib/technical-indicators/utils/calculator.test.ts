import assert from "node:assert";
import { describe, it } from "node:test";
import { Calculator } from "../../../../src/lib/technical-indicators/utils/calculator.js";

describe("Calculator", () => {
	describe("standardDeviation", () => {
		it("空配列の場合0を返す", () => {
			const result = Calculator.standardDeviation([]);
			assert.strictEqual(result, 0);
		});

		it("正しい標準偏差を計算する", () => {
			const values = [2, 4, 4, 4, 5, 5, 7, 9];
			const result = Calculator.standardDeviation(values);
			// 期待値: 約2.0
			assert.ok(Math.abs(result - 2.0) < 0.1);
		});

		it("単一要素の場合0を返す", () => {
			const result = Calculator.standardDeviation([5]);
			assert.strictEqual(result, 0);
		});
	});

	describe("exponentialMovingAverage", () => {
		it("空配列の場合空配列を返す", () => {
			const result = Calculator.exponentialMovingAverage([], 10);
			assert.deepStrictEqual(result, []);
		});

		it("正しいEMAを計算する", () => {
			const values = [22, 23, 24, 25, 26];
			const period = 3;
			const result = Calculator.exponentialMovingAverage(values, period);

			// 最初の値は元の値と同じ
			assert.strictEqual(result[0], 22);
			// 配列長は元と同じ
			assert.strictEqual(result.length, values.length);
			// 単調増加している（この例の場合）
			for (let i = 1; i < result.length; i++) {
				assert.ok(result[i] > result[i - 1]);
			}
		});
	});

	describe("simpleMovingAverage", () => {
		it("期間より短い配列の場合空配列を返す", () => {
			const result = Calculator.simpleMovingAverage([1, 2], 3);
			assert.deepStrictEqual(result, []);
		});

		it("正しいSMAを計算する", () => {
			const values = [2, 4, 6, 8, 10];
			const period = 3;
			const result = Calculator.simpleMovingAverage(values, period);

			// 期待値: [(2+4+6)/3, (4+6+8)/3, (6+8+10)/3] = [4, 6, 8]
			assert.deepStrictEqual(result, [4, 6, 8]);
		});

		it("単一期間の場合すべての値を返す", () => {
			const values = [1, 2, 3, 4, 5];
			const result = Calculator.simpleMovingAverage(values, 1);
			assert.deepStrictEqual(result, values);
		});
	});

	describe("round", () => {
		it("デフォルトで小数点以下2桁に丸める", () => {
			assert.strictEqual(Calculator.round(Math.PI), 3.14);
		});

		it("指定した桁数で丸める", () => {
			assert.strictEqual(Calculator.round(Math.PI, 3), 3.142);
		});

		it("整数の場合そのまま返す", () => {
			assert.strictEqual(Calculator.round(5), 5);
		});
	});

	describe("lastN", () => {
		it("配列の最後のN個を返す", () => {
			const array = [1, 2, 3, 4, 5];
			const result = Calculator.lastN(array, 3);
			assert.deepStrictEqual(result, [3, 4, 5]);
		});

		it("Nが配列長より大きい場合全体を返す", () => {
			const array = [1, 2, 3];
			const result = Calculator.lastN(array, 5);
			assert.deepStrictEqual(result, [1, 2, 3]);
		});

		it("N=0の場合全配列を返す（slice(-0)の挙動）", () => {
			const array = [1, 2, 3];
			const result = Calculator.lastN(array, 0);
			assert.deepStrictEqual(result, [1, 2, 3]);
		});
	});

	describe("average", () => {
		it("正しい平均を計算する", () => {
			const values = [2, 4, 6, 8, 10];
			const result = Calculator.average(values);
			assert.strictEqual(result, 6);
		});

		it("空配列の場合0を返す", () => {
			const result = Calculator.average([]);
			assert.strictEqual(result, 0);
		});
	});

	describe("max", () => {
		it("配列の最大値を返す", () => {
			const values = [3, 1, 4, 1, 5, 9, 2, 6];
			const result = Calculator.max(values);
			assert.strictEqual(result, 9);
		});

		it("負の値でも正しく動作する", () => {
			const values = [-5, -2, -8, -1];
			const result = Calculator.max(values);
			assert.strictEqual(result, -1);
		});
	});

	describe("min", () => {
		it("配列の最小値を返す", () => {
			const values = [3, 1, 4, 1, 5, 9, 2, 6];
			const result = Calculator.min(values);
			assert.strictEqual(result, 1);
		});

		it("負の値でも正しく動作する", () => {
			const values = [-5, -2, -8, -1];
			const result = Calculator.min(values);
			assert.strictEqual(result, -8);
		});
	});
});
