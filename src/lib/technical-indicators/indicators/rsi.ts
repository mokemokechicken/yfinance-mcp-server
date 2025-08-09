import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";

export class RSICalculator {
	// RSI計算のメインメソッド（ウォームアップ期間を考慮）
	public static calculate(prices: number[], period = 14, warmupPeriod = 100): number {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError(
				"Prices array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		const requiredLength = period + warmupPeriod + 1;
		if (prices.length < requiredLength) {
			throw new CalculationError(
				`Not enough data points for accurate RSI. Need ${requiredLength}, got ${prices.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		// ウォームアップ期間を考慮した価格データを使用
		const warmupStartIndex = Math.max(0, prices.length - period - warmupPeriod - 1);
		const effectivePrices = prices.slice(warmupStartIndex);
		
		// 価格変動の計算
		const priceChanges = RSICalculator.calculatePriceChanges(effectivePrices);

		// 上昇・下落の分離
		const gains: number[] = [];
		const losses: number[] = [];

		for (const change of priceChanges) {
			gains.push(change > 0 ? change : 0);
			losses.push(change < 0 ? Math.abs(change) : 0);
		}

		// 平均上昇・平均下落の計算（最初のperiod分）
		const initialAvgGain = Calculator.average(gains.slice(0, period));
		const initialAvgLoss = Calculator.average(losses.slice(0, period));

		// Wilder's smoothing method for subsequent periods
		let avgGain = initialAvgGain;
		let avgLoss = initialAvgLoss;

		// 最新のperiod分まで順次計算（高精度で保持）
		for (let i = period; i < gains.length; i++) {
			avgGain = (avgGain * (period - 1) + gains[i]) / period;
			avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
		}

		// RSの計算
		if (avgLoss === 0) {
			return 100; // 下落がない場合RSI = 100
		}

		const rs = avgGain / avgLoss;

		// RSI = 100 - (100 / (1 + RS))（最終結果のみ丸める）
		const rsi = 100 - 100 / (1 + rs);

		return Calculator.round(rsi, 2);
	}

	// 複数期間のRSIを一度に計算
	public static calculateMultiplePeriods(
		prices: number[],
		periods: number[],
	): { [key: string]: number } {
		const result: { [key: string]: number } = {};

		for (const period of periods) {
			try {
				result[`rsi${period}`] = RSICalculator.calculate(prices, period);
			} catch (error) {
				// エラーが発生した期間はNaNを設定
				result[`rsi${period}`] = Number.NaN;
			}
		}

		return result;
	}

	// 価格変動（価格差）の配列を計算
	private static calculatePriceChanges(prices: number[]): number[] {
		const changes: number[] = [];

		for (let i = 1; i < prices.length; i++) {
			changes.push(prices[i] - prices[i - 1]);
		}

		return changes;
	}

	// RSI配列の計算（全期間）
	public static calculateArray(prices: number[], period = 14): number[] {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError(
				"Prices array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		if (prices.length < period + 1) {
			return [];
		}

		const rsiArray: number[] = [];
		const priceChanges = RSICalculator.calculatePriceChanges(prices);

		// 上昇・下落の分離
		const gains: number[] = [];
		const losses: number[] = [];

		for (const change of priceChanges) {
			gains.push(change > 0 ? change : 0);
			losses.push(change < 0 ? Math.abs(change) : 0);
		}

		// 最初のRSI計算（シンプル移動平均）
		let avgGain = Calculator.average(gains.slice(0, period));
		let avgLoss = Calculator.average(losses.slice(0, period));

		// 最初のRSI値
		if (avgLoss === 0) {
			rsiArray.push(100);
		} else {
			const rs = avgGain / avgLoss;
			const rsi = 100 - 100 / (1 + rs);
			rsiArray.push(Calculator.round(rsi, 2));
		}

		// 以降のRSI値（Wilder's smoothing）
		for (let i = period; i < gains.length; i++) {
			avgGain = (avgGain * (period - 1) + gains[i]) / period;
			avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

			if (avgLoss === 0) {
				rsiArray.push(100);
			} else {
				const rs = avgGain / avgLoss;
				const rsi = 100 - 100 / (1 + rs);
				rsiArray.push(Calculator.round(rsi, 2));
			}
		}

		return rsiArray;
	}

	// RSIによるシグナル判定
	public static getSignal(rsi: number): "overbought" | "oversold" | "neutral" {
		if (rsi >= 70) return "overbought"; // 買われすぎ
		if (rsi <= 30) return "oversold"; // 売られすぎ
		return "neutral";
	}

	// モメンタム判定
	public static getMomentum(
		prices: number[],
		period = 14,
	): "positive" | "negative" | "neutral" {
		try {
			const rsiArray = RSICalculator.calculateArray(prices, period);
			if (rsiArray.length < 2) return "neutral";

			const current = rsiArray[rsiArray.length - 1];
			const previous = rsiArray[rsiArray.length - 2];

			if (current > previous + 2) return "positive"; // 2ポイント以上上昇
			if (current < previous - 2) return "negative"; // 2ポイント以上下落
			return "neutral";
		} catch (error) {
			return "neutral";
		}
	}

	// RSIの強度判定
	public static getStrength(rsi: number): "strong" | "moderate" | "weak" {
		if (rsi >= 80 || rsi <= 20) return "strong"; // 極端な水準
		if (rsi >= 65 || rsi <= 35) return "moderate"; // やや極端
		return "weak"; // 中立圏
	}

	// ダイバージェンスの検出（簡易版）
	public static detectDivergence(
		prices: number[],
		rsiPeriod = 14,
		lookback = 10,
	): "bullish" | "bearish" | "none" {
		try {
			if (prices.length < rsiPeriod + lookback) return "none";

			const rsiArray = RSICalculator.calculateArray(prices, rsiPeriod);
			const recentPrices = prices.slice(-lookback);
			const recentRsi = rsiArray.slice(-lookback);

			if (recentPrices.length < 2 || recentRsi.length < 2) return "none";

			const priceMin = Calculator.min(recentPrices);
			const priceMax = Calculator.max(recentPrices);
			const rsiMin = Calculator.min(recentRsi);
			const rsiMax = Calculator.max(recentRsi);

			const priceMinIndex = recentPrices.indexOf(priceMin);
			const priceMaxIndex = recentPrices.indexOf(priceMax);
			const rsiMinIndex = recentRsi.indexOf(rsiMin);
			const rsiMaxIndex = recentRsi.indexOf(rsiMax);

			// Bullish divergence: 価格が下落しているのにRSIが上昇
			if (priceMinIndex > priceMaxIndex && rsiMinIndex < rsiMaxIndex) {
				return "bullish";
			}

			// Bearish divergence: 価格が上昇しているのにRSIが下落
			if (priceMaxIndex > priceMinIndex && rsiMaxIndex < rsiMinIndex) {
				return "bearish";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}
}
