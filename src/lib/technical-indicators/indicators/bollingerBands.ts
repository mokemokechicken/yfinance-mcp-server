import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";

export interface BollingerBandsResult {
	upper: number;
	middle: number;
	lower: number;
	bandwidth: number;
	percentB: number;
}

export class BollingerBandsCalculator {
	// ボリンジャーバンドの計算
	public static calculate(prices: number[], period = 20, standardDeviations = 2): BollingerBandsResult {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError("Prices array is empty or invalid", "INVALID_PRICES");
		}

		if (prices.length < period) {
			throw new CalculationError(`Not enough data points. Need ${period}, got ${prices.length}`, "INSUFFICIENT_DATA");
		}

		// 移動平均の計算（中央線）
		const recentPrices = Calculator.lastN(prices, period);
		const middle = Calculator.average(recentPrices);

		// 標準偏差の計算
		const stdDev = Calculator.standardDeviation(recentPrices);

		// 上部バンドと下部バンドの計算
		const upper = middle + standardDeviations * stdDev;
		const lower = middle - standardDeviations * stdDev;

		// バンド幅の計算（上部バンド - 下部バンド）
		const bandwidth = middle > 0 ? Calculator.round((upper - lower) / middle, 4) : 0;

		// %Bの計算（現在価格がバンド内のどの位置にあるか）
		const currentPrice = prices[prices.length - 1];
		const percentB = upper > lower ? Calculator.round((currentPrice - lower) / (upper - lower), 4) : 0.5; // バンド幅が0の場合は中央値

		return {
			upper: Calculator.round(upper, 3),
			middle: Calculator.round(middle, 3),
			lower: Calculator.round(lower, 3),
			bandwidth,
			percentB,
		};
	}

	// ボリンジャーバンド配列の計算（全期間）
	public static calculateArray(
		prices: number[],
		period = 20,
		standardDeviations = 2,
	): {
		upper: number[];
		middle: number[];
		lower: number[];
		bandwidth: number[];
		percentB: number[];
	} {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError("Prices array is empty or invalid", "INVALID_PRICES");
		}

		if (prices.length < period) {
			return {
				upper: [],
				middle: [],
				lower: [],
				bandwidth: [],
				percentB: [],
			};
		}

		const upper: number[] = [];
		const middle: number[] = [];
		const lower: number[] = [];
		const bandwidth: number[] = [];
		const percentB: number[] = [];

		// 各期間でボリンジャーバンドを計算
		for (let i = period - 1; i < prices.length; i++) {
			const periodPrices = prices.slice(i - period + 1, i + 1);
			const avg = Calculator.average(periodPrices);
			const stdDev = Calculator.standardDeviation(periodPrices);

			const upperBand = avg + standardDeviations * stdDev;
			const lowerBand = avg - standardDeviations * stdDev;

			upper.push(Calculator.round(upperBand, 3));
			middle.push(Calculator.round(avg, 3));
			lower.push(Calculator.round(lowerBand, 3));

			const bw = avg > 0 ? Calculator.round((upperBand - lowerBand) / avg, 4) : 0;
			bandwidth.push(bw);

			const pb = upperBand > lowerBand ? Calculator.round((prices[i] - lowerBand) / (upperBand - lowerBand), 4) : 0.5; // バンド幅が0の場合は中央値
			percentB.push(pb);
		}

		return {
			upper,
			middle,
			lower,
			bandwidth,
			percentB,
		};
	}

	// ボリンジャーバンドのシグナル判定
	public static getSignal(result: BollingerBandsResult, currentPrice: number): "buy" | "sell" | "neutral" {
		const { upper, lower, percentB } = result;

		// 現在価格が下部バンドを下回る → 買いシグナル
		if (currentPrice <= lower || percentB <= 0) {
			return "buy";
		}

		// 現在価格が上部バンドを上回る → 売りシグナル
		if (currentPrice >= upper || percentB >= 1) {
			return "sell";
		}

		return "neutral";
	}

	// ボラティリティの状態判定
	public static getVolatilityState(
		bandwidth: number,
		thresholdHigh = 0.1,
		thresholdLow = 0.03,
	): "high" | "normal" | "low" {
		if (bandwidth >= thresholdHigh) return "high";
		if (bandwidth <= thresholdLow) return "low";
		return "normal";
	}

	// スクイーズ（収束）の検出
	public static detectSqueeze(prices: number[], period = 20, lookback = 5): boolean {
		try {
			const bbArray = BollingerBandsCalculator.calculateArray(prices, period, 2);

			if (bbArray.bandwidth.length < lookback) return false;

			const recentBandwidth = bbArray.bandwidth.slice(-lookback);
			const avgBandwidth = Calculator.average(recentBandwidth);

			// 過去の平均と比較して収束しているか判定
			return avgBandwidth < 0.05; // 5%以下で収束と判定
		} catch (error) {
			return false;
		}
	}

	// エクスパンション（拡張）の検出
	public static detectExpansion(prices: number[], period = 20, lookback = 5): boolean {
		try {
			const bbArray = BollingerBandsCalculator.calculateArray(prices, period, 2);

			if (bbArray.bandwidth.length < lookback * 2) return false;

			const recentBandwidth = bbArray.bandwidth.slice(-lookback);
			const previousBandwidth = bbArray.bandwidth.slice(-lookback * 2, -lookback);

			const recentAvg = Calculator.average(recentBandwidth);
			const previousAvg = Calculator.average(previousBandwidth);

			// 最近のバンド幅が以前より大幅に拡大している場合
			return recentAvg > previousAvg * 1.5;
		} catch (error) {
			return false;
		}
	}

	// Bollinger Bounce戦略の判定
	public static getBounceSignal(prices: number[], period = 20, lookback = 3): "bounce_up" | "bounce_down" | "none" {
		try {
			if (prices.length < period + lookback) return "none";

			const result = BollingerBandsCalculator.calculate(prices, period, 2);
			const recentPrices = Calculator.lastN(prices, lookback);

			// 下部バンドでのバウンス検出
			const touchedLowerBand = recentPrices.some((price) => price <= result.lower * 1.01);
			const currentlyAboveLower = prices[prices.length - 1] > result.lower;

			if (touchedLowerBand && currentlyAboveLower) {
				return "bounce_up";
			}

			// 上部バンドでのバウンス検出
			const touchedUpperBand = recentPrices.some((price) => price >= result.upper * 0.99);
			const currentlyBelowUpper = prices[prices.length - 1] < result.upper;

			if (touchedUpperBand && currentlyBelowUpper) {
				return "bounce_down";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}
}
