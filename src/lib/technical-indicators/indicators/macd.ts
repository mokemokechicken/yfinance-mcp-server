import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";
import { ValidationUtils } from "../utils/validation";

export interface MACDResult {
	macd: number;
	signal: number;
	histogram: number;
}

export class MACDCalculator {
	// MACD計算のメインメソッド（修正版）
	public static calculate(
		prices: number[],
		fastPeriod = 12,
		slowPeriod = 26,
		signalPeriod = 9,
	): MACDResult {
		// 入力検証（強化版）
		ValidationUtils.validatePricesArray(prices);
		ValidationUtils.validatePeriodRelationship(fastPeriod, slowPeriod);
		ValidationUtils.validatePeriod(signalPeriod, "signalPeriod");

		const minRequiredLength = slowPeriod + signalPeriod;
		ValidationUtils.validateDataLength(
			prices.length,
			minRequiredLength,
			"price data",
		);

		// EMA計算（修正版Calculator使用）
		const fastEMA = Calculator.exponentialMovingAverage(prices, fastPeriod);
		const slowEMA = Calculator.exponentialMovingAverage(prices, slowPeriod);

		// 同じ日付の値で差分計算（修正版）
		const alignedLength = Math.min(fastEMA.length, slowEMA.length);
		const macdLine: number[] = [];

		for (let i = 0; i < alignedLength; i++) {
			macdLine.push(fastEMA[i] - slowEMA[i]); // 同一インデックス = 同一日付
		}

		// シグナル計算
		if (macdLine.length < signalPeriod) {
			throw new CalculationError(
				`Insufficient MACD data for signal: need ${signalPeriod}, got ${macdLine.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		const signalLine = Calculator.exponentialMovingAverage(
			macdLine,
			signalPeriod,
		);

		// 最新値取得（安全に）
		if (macdLine.length === 0 || signalLine.length === 0) {
			throw new CalculationError(
				"No valid MACD or signal data",
				"CALCULATION_FAILED",
			);
		}

		const macd = Calculator.round(macdLine[macdLine.length - 1], 3);
		const signal = Calculator.round(signalLine[signalLine.length - 1], 3);
		const histogram = Calculator.round(macd - signal, 3);

		return {
			macd,
			signal,
			histogram,
		};
	}

	// MACD配列の計算（全期間）- 修正版
	public static calculateArray(
		prices: number[],
		fastPeriod = 12,
		slowPeriod = 26,
		signalPeriod = 9,
	): {
		macd: number[];
		signal: number[];
		histogram: number[];
	} {
		// 入力検証（統一）
		ValidationUtils.validatePricesArray(prices);
		ValidationUtils.validatePeriodRelationship(fastPeriod, slowPeriod);
		ValidationUtils.validatePeriod(signalPeriod, "signalPeriod");

		const minRequiredLength = slowPeriod + signalPeriod;
		if (prices.length < minRequiredLength) {
			return {
				macd: [],
				signal: [],
				histogram: [],
			};
		}

		// EMA計算
		const fastEMA = Calculator.exponentialMovingAverage(prices, fastPeriod);
		const slowEMA = Calculator.exponentialMovingAverage(prices, slowPeriod);

		// 同一日付での差分計算（修正版）
		const alignedLength = Math.min(fastEMA.length, slowEMA.length);
		const macdLine: number[] = [];

		for (let i = 0; i < alignedLength; i++) {
			macdLine.push(fastEMA[i] - slowEMA[i]); // 同一インデックス = 同一日付
		}

		// シグナルライン計算
		if (macdLine.length < signalPeriod) {
			return {
				macd: [],
				signal: [],
				histogram: [],
			};
		}

		const signalLine = Calculator.exponentialMovingAverage(
			macdLine,
			signalPeriod,
		);

		// ヒストグラム計算（修正版）
		const histogram: number[] = [];
		const signalStartIndex = macdLine.length - signalLine.length;

		for (let i = 0; i < signalLine.length; i++) {
			histogram.push(macdLine[signalStartIndex + i] - signalLine[i]);
		}

		return {
			macd: macdLine.map((value) => Calculator.round(value, 3)),
			signal: signalLine.map((value) => Calculator.round(value, 3)),
			histogram: histogram.map((value) => Calculator.round(value, 3)),
		};
	}

	// MACDシグナルの判定
	public static getSignal(
		macdResult: MACDResult,
	): "bullish" | "bearish" | "neutral" {
		const { macd, signal, histogram } = macdResult;

		// ヒストグラムが正でMACDがシグナルより上 → 強気
		if (histogram > 0 && macd > signal) {
			return "bullish";
		}

		// ヒストグラムが負でMACDがシグナルより下 → 弱気
		if (histogram < 0 && macd < signal) {
			return "bearish";
		}

		return "neutral";
	}

	// MACDクロスの検出
	public static detectCross(
		prices: number[],
		fastPeriod = 12,
		slowPeriod = 26,
		signalPeriod = 9,
	): "bullish_cross" | "bearish_cross" | "none" {
		try {
			const macdArray = MACDCalculator.calculateArray(
				prices,
				fastPeriod,
				slowPeriod,
				signalPeriod,
			);

			if (macdArray.macd.length < 2 || macdArray.signal.length < 2) {
				return "none";
			}

			const currentMACD = macdArray.macd[macdArray.macd.length - 1];
			const previousMACD = macdArray.macd[macdArray.macd.length - 2];
			const currentSignal = macdArray.signal[macdArray.signal.length - 1];
			const previousSignal = macdArray.signal[macdArray.signal.length - 2];

			// Bullish cross: MACDがシグナルを下から上に突破
			if (previousMACD <= previousSignal && currentMACD > currentSignal) {
				return "bullish_cross";
			}

			// Bearish cross: MACDがシグナルを上から下に突破
			if (previousMACD >= previousSignal && currentMACD < currentSignal) {
				return "bearish_cross";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}

	// MACDの発散（ダイバージェンス）検出
	public static detectDivergence(
		prices: number[],
		fastPeriod = 12,
		slowPeriod = 26,
		signalPeriod = 9,
		lookback = 10,
	): "bullish" | "bearish" | "none" {
		try {
			const requiredLength =
				Math.max(slowPeriod, fastPeriod) + signalPeriod + lookback;
			if (prices.length < requiredLength) {
				return "none";
			}

			const macdArray = MACDCalculator.calculateArray(
				prices,
				fastPeriod,
				slowPeriod,
				signalPeriod,
			);
			const recentPrices = prices.slice(-lookback);
			const recentMACD = macdArray.macd.slice(-lookback);

			if (recentPrices.length < 2 || recentMACD.length < 2) {
				return "none";
			}

			const priceMin = Calculator.min(recentPrices);
			const priceMax = Calculator.max(recentPrices);
			const macdMin = Calculator.min(recentMACD);
			const macdMax = Calculator.max(recentMACD);

			const priceMinIndex = recentPrices.indexOf(priceMin);
			const priceMaxIndex = recentPrices.indexOf(priceMax);
			const macdMinIndex = recentMACD.indexOf(macdMin);
			const macdMaxIndex = recentMACD.indexOf(macdMax);

			// Bullish divergence: 価格が下落しているのにMACDが上昇
			if (priceMinIndex > priceMaxIndex && macdMinIndex < macdMaxIndex) {
				return "bullish";
			}

			// Bearish divergence: 価格が上昇しているのにMACDが下落
			if (priceMaxIndex > priceMinIndex && macdMaxIndex < macdMinIndex) {
				return "bearish";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}

	// MACDのモメンタム判定
	public static getMomentum(
		macdResult: MACDResult,
	): "accelerating" | "decelerating" | "neutral" {
		const { histogram } = macdResult;

		if (histogram > 0.5) return "accelerating"; // 加速中
		if (histogram < -0.5) return "decelerating"; // 減速中
		return "neutral";
	}

	// MACDの強度判定
	public static getStrength(
		macdResult: MACDResult,
	): "strong" | "moderate" | "weak" {
		const { macd, histogram } = macdResult;

		const macdAbs = Math.abs(macd);
		const histogramAbs = Math.abs(histogram);

		// 絶対値が大きく、ヒストグラムも大きい → 強い
		if (macdAbs > 2 && histogramAbs > 1) return "strong";

		// 中程度の値 → 中程度
		if (macdAbs > 1 || histogramAbs > 0.5) return "moderate";

		return "weak";
	}
}
