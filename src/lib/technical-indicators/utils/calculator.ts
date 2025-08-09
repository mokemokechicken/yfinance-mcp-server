export class Calculator {
	// 標準偏差計算
	public static standardDeviation(values: number[]): number {
		if (values.length === 0) return 0;

		const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
		const variance =
			values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
			values.length;
		return Math.sqrt(variance);
	}

	// 指数移動平均計算
	public static exponentialMovingAverage(
		values: number[],
		period: number,
	): number[] {
		if (values.length === 0) return [];

		const ema: number[] = [];
		const multiplier = 2 / (period + 1);

		// 最初の値はシンプル移動平均
		ema[0] = values[0];

		// 2番目以降はEMA計算
		for (let i = 1; i < values.length; i++) {
			ema[i] = values[i] * multiplier + ema[i - 1] * (1 - multiplier);
		}

		return ema;
	}

	// シンプル移動平均計算
	public static simpleMovingAverage(
		values: number[],
		period: number,
	): number[] {
		if (values.length < period) return [];

		const sma: number[] = [];

		for (let i = period - 1; i < values.length; i++) {
			const sum = values
				.slice(i - period + 1, i + 1)
				.reduce((sum, value) => sum + value, 0);
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
