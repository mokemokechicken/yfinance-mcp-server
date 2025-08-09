import assert from "node:assert";
import { describe, it } from "node:test";
import { ValidationUtils } from "../../../../src/lib/technical-indicators/utils/validation.js";
import { CalculationError } from "../../../../src/lib/technical-indicators/types.js";

describe("ValidationUtils", () => {
	describe("validatePricesArray", () => {
		it("正常な価格配列を受け入れる", () => {
			const prices = [100, 101, 102, 103];
			// エラーが投げられないことを確認
			assert.doesNotThrow(() => {
				ValidationUtils.validatePricesArray(prices);
			});
		});

		it("空配列の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePricesArray([]);
			}, /Prices array cannot be empty/);
		});

		it("配列以外の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePricesArray("invalid" as unknown as number[]);
			}, /Prices must be an array/);
		});

		it("無限大を含む場合エラーを投げる", () => {
			const prices = [100, Number.POSITIVE_INFINITY, 102];
			assert.throws(() => {
				ValidationUtils.validatePricesArray(prices);
			}, /Invalid price at index 1/);
		});

		it("NaNを含む場合エラーを投げる", () => {
			const prices = [100, Number.NaN, 102];
			assert.throws(() => {
				ValidationUtils.validatePricesArray(prices);
			}, /Invalid price at index 1/);
		});
	});

	describe("validatePeriod", () => {
		it("正の整数を受け入れる", () => {
			assert.doesNotThrow(() => {
				ValidationUtils.validatePeriod(14);
			});
		});

		it("0の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriod(0);
			}, /period must be a positive integer/);
		});

		it("負の値の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriod(-5);
			}, /period must be a positive integer/);
		});

		it("小数の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriod(14.5);
			}, /period must be a positive integer/);
		});

		it("カスタムパラメータ名でエラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriod(0, "customPeriod");
			}, /customPeriod must be a positive integer/);
		});
	});

	describe("validateDataLength", () => {
		it("十分なデータ長を受け入れる", () => {
			assert.doesNotThrow(() => {
				ValidationUtils.validateDataLength(100, 50);
			});
		});

		it("同じ長さの場合受け入れる", () => {
			assert.doesNotThrow(() => {
				ValidationUtils.validateDataLength(50, 50);
			});
		});

		it("不十分なデータ長の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validateDataLength(30, 50);
			}, /Insufficient data: need 50, got 30/);
		});

		it("カスタムデータタイプ名でエラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validateDataLength(30, 50, "price history");
			}, /Insufficient price history: need 50, got 30/);
		});
	});

	describe("validatePeriodRelationship", () => {
		it("正常な期間関係を受け入れる", () => {
			assert.doesNotThrow(() => {
				ValidationUtils.validatePeriodRelationship(12, 26);
			});
		});

		it("同じ期間の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriodRelationship(14, 14);
			}, /Slow period \(14\) must be greater than fast period \(14\)/);
		});

		it("逆転した期間関係の場合エラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriodRelationship(26, 12);
			}, /Slow period \(12\) must be greater than fast period \(26\)/);
		});

		it("無効な期間値でエラーを投げる", () => {
			assert.throws(() => {
				ValidationUtils.validatePeriodRelationship(0, 26);
			}, /fastPeriod must be a positive integer/);
		});
	});
});