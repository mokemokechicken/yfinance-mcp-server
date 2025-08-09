import assert from "node:assert";
import { describe, it } from "node:test";
import { DataProcessor } from "../../../../src/lib/technical-indicators/utils/dataProcessor.js";
import { ValidationError } from "../../../../src/lib/technical-indicators/types.js";

describe("DataProcessor", () => {
	describe("processRawData", () => {
		it("正常なデータを変換する", () => {
			const rawData = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
			];

			const result = DataProcessor.processRawData(rawData);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].close, 105);
			assert.strictEqual(result[0].volume, 1000);
			assert.strictEqual(result[1].close, 110);
			assert.strictEqual(result[1].volume, 1500);
		});

		it("volumeが未定義の場合0で補完する", () => {
			const rawData = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
				},
			];

			const result = DataProcessor.processRawData(rawData);

			assert.strictEqual(result[0].volume, 0);
		});

		it("空配列の場合エラーを投げる", () => {
			assert.throws(() => {
				DataProcessor.processRawData([]);
			}, ValidationError);
		});

		it("null配列の場合エラーを投げる", () => {
			assert.throws(() => {
				DataProcessor.processRawData(null as any);
			}, ValidationError);
		});
	});

	describe("cleanData", () => {
		it("日付順にソートする", () => {
			const data = [
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.cleanData(data);

			assert.ok(result[0].date < result[1].date);
			assert.strictEqual(result[0].close, 105);
			assert.strictEqual(result[1].close, 110);
		});

		it("NaN値を前の値で補完する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: Number.NaN,
					high: Number.NaN,
					low: Number.NaN,
					close: Number.NaN,
					volume: 1500,
				},
			];

			const result = DataProcessor.cleanData(data);

			assert.strictEqual(result[1].open, 105);
			assert.strictEqual(result[1].high, 105);
			assert.strictEqual(result[1].low, 105);
			assert.strictEqual(result[1].close, 105);
		});

		it("高値・安値の論理エラーを修正する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 95, // 安値より低い高値
					low: 110, // 高値より高い安値
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.cleanData(data);

			assert.ok(result[0].high >= result[0].low);
			assert.ok(result[0].high >= Math.max(result[0].open, result[0].close));
			assert.ok(result[0].low <= Math.min(result[0].open, result[0].close));
		});

		it("負の価格を0に修正する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: -100,
					high: -110,
					low: -95,
					close: -105,
					volume: -1000,
				},
			];

			const result = DataProcessor.cleanData(data);

			assert.strictEqual(result[0].open, 0);
			assert.strictEqual(result[0].high, 0);
			assert.strictEqual(result[0].low, 0);
			assert.strictEqual(result[0].close, 0);
			assert.strictEqual(result[0].volume, 0);
		});

		it("空配列の場合そのまま返す", () => {
			const result = DataProcessor.cleanData([]);
			assert.deepStrictEqual(result, []);
		});
	});

	describe("validateData", () => {
		it("正常なデータの場合trueを返す", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.validateData(data);
			assert.strictEqual(result, true);
		});

		it("空配列の場合falseを返す", () => {
			const result = DataProcessor.validateData([]);
			assert.strictEqual(result, false);
		});

		it("無効な日付データの場合falseを返す", () => {
			const data = [
				{
					date: "invalid-date" as any,
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.validateData(data);
			assert.strictEqual(result, false);
		});

		it("NaN値を含むデータの場合falseを返す", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: Number.NaN,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.validateData(data);
			assert.strictEqual(result, false);
		});
	});

	describe("extractClosePrices", () => {
		it("終値データを抽出する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
			];

			const result = DataProcessor.extractClosePrices(data);
			assert.deepStrictEqual(result, [105, 110]);
		});
	});

	describe("extractHighPrices", () => {
		it("高値データを抽出する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
			];

			const result = DataProcessor.extractHighPrices(data);
			assert.deepStrictEqual(result, [110, 115]);
		});
	});

	describe("extractLowPrices", () => {
		it("安値データを抽出する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
			];

			const result = DataProcessor.extractLowPrices(data);
			assert.deepStrictEqual(result, [95, 100]);
		});
	});

	describe("extractVolumes", () => {
		it("出来高データを抽出する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
			];

			const result = DataProcessor.extractVolumes(data);
			assert.deepStrictEqual(result, [1000, 1500]);
		});
	});

	describe("getLastNDays", () => {
		it("指定期間のデータを取得する", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
				{
					date: new Date("2023-01-02"),
					open: 105,
					high: 115,
					low: 100,
					close: 110,
					volume: 1500,
				},
				{
					date: new Date("2023-01-03"),
					open: 110,
					high: 120,
					low: 105,
					close: 115,
					volume: 2000,
				},
			];

			const result = DataProcessor.getLastNDays(data, 2);
			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].close, 110);
			assert.strictEqual(result[1].close, 115);
		});

		it("データ数より大きい値を指定した場合全データを返す", () => {
			const data = [
				{
					date: new Date("2023-01-01"),
					open: 100,
					high: 110,
					low: 95,
					close: 105,
					volume: 1000,
				},
			];

			const result = DataProcessor.getLastNDays(data, 10);
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].close, 105);
		});
	});
});