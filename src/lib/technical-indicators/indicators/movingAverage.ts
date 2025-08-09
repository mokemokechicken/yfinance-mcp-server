import { Calculator } from "../utils/calculator";
import { CalculationError } from "../types";

export class MovingAverageCalculator {
	// シンプル移動平均の計算
	public static calculate(prices: number[], period: number): number {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError("Prices array is empty or invalid", "INVALID_PRICES");
		}

		if (prices.length < period) {
			throw new CalculationError(`Not enough data points. Need ${period}, got ${prices.length}`, "INSUFFICIENT_DATA");
		}

		// 最後のperiod分のデータを使用
		const recentPrices = Calculator.lastN(prices, period);
		const sum = recentPrices.reduce((sum, price) => sum + price, 0);
		
		return Calculator.round(sum / period, 3);
	}

	// 複数期間の移動平均を一度に計算
	public static calculateMultiplePeriods(prices: number[], periods: number[]): { [key: string]: number } {
		const result: { [key: string]: number } = {};

		for (const period of periods) {
			try {
				result[`ma${period}`] = this.calculate(prices, period);
			} catch (error) {
				// エラーが発生した期間はNaNを設定
				result[`ma${period}`] = NaN;
			}
		}

		return result;
	}

	// 指数移動平均の計算（将来拡張用）
	public static calculateEMA(prices: number[], period: number): number {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError("Prices array is empty or invalid", "INVALID_PRICES");
		}

		if (prices.length < period) {
			throw new CalculationError(`Not enough data points. Need ${period}, got ${prices.length}`, "INSUFFICIENT_DATA");
		}

		const emaValues = Calculator.exponentialMovingAverage(prices, period);
		return Calculator.round(emaValues[emaValues.length - 1], 3);
	}

	// 移動平均の配列を計算（全期間）
	public static calculateArray(prices: number[], period: number): number[] {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError("Prices array is empty or invalid", "INVALID_PRICES");
		}

		if (prices.length < period) {
			return [];
		}

		const smaArray = Calculator.simpleMovingAverage(prices, period);
		return smaArray.map(value => Calculator.round(value, 3));
	}

	// トレンド判定（移動平均線の傾き）
	public static getTrend(prices: number[], period: number, lookback: number = 5): "upward" | "downward" | "sideways" {
		try {
			const maArray = this.calculateArray(prices, period);
			if (maArray.length < lookback) {
				return "sideways";
			}

			const recent = maArray.slice(-lookback);
			const first = recent[0];
			const last = recent[recent.length - 1];
			
			const change = (last - first) / first;
			const threshold = 0.005; // 0.5%の変化を閾値とする

			if (change > threshold) return "upward";
			if (change < -threshold) return "downward";
			return "sideways";
		} catch (error) {
			return "sideways";
		}
	}

	// ゴールデンクロス/デッドクロスの検出
	public static detectCross(prices: number[], shortPeriod: number, longPeriod: number): "golden" | "dead" | "none" {
		try {
			if (prices.length < Math.max(shortPeriod, longPeriod) + 1) {
				return "none";
			}

			const shortMA = this.calculateArray(prices, shortPeriod);
			const longMA = this.calculateArray(prices, longPeriod);

			if (shortMA.length < 2 || longMA.length < 2) {
				return "none";
			}

			// 最新とその前の値を比較
			const shortCurrent = shortMA[shortMA.length - 1];
			const shortPrevious = shortMA[shortMA.length - 2];
			const longCurrent = longMA[longMA.length - 1];
			const longPrevious = longMA[longMA.length - 2];

			// ゴールデンクロス: 短期線が長期線を下から上に突破
			if (shortPrevious <= longPrevious && shortCurrent > longCurrent) {
				return "golden";
			}

			// デッドクロス: 短期線が長期線を上から下に突破
			if (shortPrevious >= longPrevious && shortCurrent < longCurrent) {
				return "dead";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}
}