import { ValidationUtils } from "./validation";

export class Calculator {
	// 標準偏差計算
	public static standardDeviation(values: number[]): number {
		if (values.length === 0) return 0;

		const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
		const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
		return Math.sqrt(variance);
	}

	// 指数移動平均計算（業界標準実装）
	public static exponentialMovingAverage(values: number[], period: number): number[] {
		// 入力検証
		ValidationUtils.validatePricesArray(values);
		ValidationUtils.validatePeriod(period);

		// データ長チェック
		if (values.length < period) {
			return [];
		}

		const ema: number[] = [];
		const multiplier = 2 / (period + 1);

		// 標準的な初期値計算: 最初のperiod分の単純平均
		const initialSMA = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

		// period-1番目に初期値をセット（標準実装）
		ema[period - 1] = initialSMA;

		// period番目以降をEMA計算
		for (let i = period; i < values.length; i++) {
			ema[i] = values[i] * multiplier + ema[i - 1] * (1 - multiplier);
		}

		// 有効な値のみ返却（period-1以降）
		return ema.slice(period - 1);
	}

	// シンプル移動平均計算
	public static simpleMovingAverage(values: number[], period: number): number[] {
		// 入力検証（統一）
		ValidationUtils.validatePricesArray(values);
		ValidationUtils.validatePeriod(period);

		if (values.length < period) return [];

		const sma: number[] = [];

		for (let i = period - 1; i < values.length; i++) {
			const sum = values.slice(i - period + 1, i + 1).reduce((sum, value) => sum + value, 0);
			sma.push(sum / period);
		}

		return sma;
	}

	// 数値の丸め処理
	public static round(value: number, decimals = 2): number {
		const factor = 10 ** decimals;
		return Math.round(value * factor) / factor;
	}

	// 配列の最後のN個の要素を取得
	public static lastN<T>(array: T[], n: number): T[] {
		return array.slice(-n);
	}

	// 平均計算
	public static average(values: number[]): number {
		if (values.length === 0) return 0;
		return values.reduce((sum, value) => sum + value, 0) / values.length;
	}

	// 最大値取得
	public static max(values: number[]): number {
		return Math.max(...values);
	}

	// 最小値取得
	public static min(values: number[]): number {
		return Math.min(...values);
	}
}
