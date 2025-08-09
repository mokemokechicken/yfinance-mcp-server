import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";
import type { PriceData } from "../types";

export interface StochasticResult {
	k: number; // %K値（Fast Stochastic）
	d: number; // %D値（Slow Stochastic）
}

export class StochasticCalculator {
	// ストキャスティクスの計算（OHLCデータを使用）
	public static calculateWithOHLC(
		priceData: PriceData[],
		kPeriod = 14,
		dPeriod = 3,
	): StochasticResult {
		if (!Array.isArray(priceData) || priceData.length === 0) {
			throw new CalculationError(
				"Price data array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		if (priceData.length < kPeriod) {
			throw new CalculationError(
				`Not enough data points. Need ${kPeriod}, got ${priceData.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		// %K値の計算
		const kValues = StochasticCalculator.calculateKArray(priceData, kPeriod);

		if (kValues.length < dPeriod) {
			throw new CalculationError(
				`Not enough K values for D calculation. Need ${dPeriod}, got ${kValues.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		// %D値の計算（%Kの移動平均）
		const recentKValues = Calculator.lastN(kValues, dPeriod);
		const d = Calculator.average(recentKValues);

		return {
			k: Calculator.round(kValues[kValues.length - 1], 2),
			d: Calculator.round(d, 2),
		};
	}

	// 終値のみを使用した簡易版（HLを終値で代用）
	public static calculate(
		closePrices: number[],
		kPeriod = 14,
		dPeriod = 3,
	): StochasticResult {
		if (!Array.isArray(closePrices) || closePrices.length === 0) {
			throw new CalculationError(
				"Close prices array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		if (closePrices.length < kPeriod) {
			throw new CalculationError(
				`Not enough data points. Need ${kPeriod}, got ${closePrices.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		// 終値をHigh/Lowとして扱う簡易版
		const priceData: PriceData[] = closePrices.map((close, index) => ({
			date: new Date(Date.now() - (closePrices.length - index) * 24 * 60 * 60 * 1000),
			open: close,
			high: close,
			low: close,
			close: close,
			volume: 0,
		}));

		return StochasticCalculator.calculateWithOHLC(priceData, kPeriod, dPeriod);
	}

	// %K値の配列を計算
	private static calculateKArray(
		priceData: PriceData[],
		period: number,
	): number[] {
		const kValues: number[] = [];

		for (let i = period - 1; i < priceData.length; i++) {
			const periodData = priceData.slice(i - period + 1, i + 1);

			// 期間内の最高値と最安値を取得
			const highest = Calculator.max(periodData.map(d => d.high));
			const lowest = Calculator.min(periodData.map(d => d.low));
			const currentClose = priceData[i].close;

			// %K = (現在の終値 - 最安値) / (最高値 - 最安値) * 100
			let k: number;
			if (highest - lowest === 0) {
				k = 50; // 最高値と最安値が同じ場合は中央値
			} else {
				k = ((currentClose - lowest) / (highest - lowest)) * 100;
			}

			kValues.push(Calculator.round(k, 2));
		}

		return kValues;
	}

	// ストキャスティクス配列の計算（全期間）
	public static calculateArray(
		priceData: PriceData[],
		kPeriod = 14,
		dPeriod = 3,
	): {
		k: number[];
		d: number[];
	} {
		if (!Array.isArray(priceData) || priceData.length === 0) {
			return { k: [], d: [] };
		}

		if (priceData.length < kPeriod + dPeriod - 1) {
			return { k: [], d: [] };
		}

		const kValues = StochasticCalculator.calculateKArray(priceData, kPeriod);
		const dValues: number[] = [];

		// %D値の計算（%Kの移動平均）
		for (let i = dPeriod - 1; i < kValues.length; i++) {
			const periodKValues = kValues.slice(i - dPeriod + 1, i + 1);
			const d = Calculator.average(periodKValues);
			dValues.push(Calculator.round(d, 2));
		}

		return {
			k: kValues.slice(dPeriod - 1), // %D値と同じ長さに調整
			d: dValues,
		};
	}

	// ストキャスティクスのシグナル判定
	public static getSignal(result: StochasticResult): "buy" | "sell" | "neutral" {
		const { k, d } = result;

		// 買われすぎ・売られすぎの判定
		if (k <= 20 && d <= 20 && k > d) {
			return "buy"; // 売られすぎからの反転
		}

		if (k >= 80 && d >= 80 && k < d) {
			return "sell"; // 買われすぎからの反転
		}

		return "neutral";
	}

	// ストキャスティクスのクロス検出
	public static detectCross(
		priceData: PriceData[],
		kPeriod = 14,
		dPeriod = 3,
	): "golden_cross" | "dead_cross" | "none" {
		try {
			const stochArray = StochasticCalculator.calculateArray(
				priceData,
				kPeriod,
				dPeriod,
			);

			if (stochArray.k.length < 2 || stochArray.d.length < 2) {
				return "none";
			}

			const currentK = stochArray.k[stochArray.k.length - 1];
			const previousK = stochArray.k[stochArray.k.length - 2];
			const currentD = stochArray.d[stochArray.d.length - 1];
			const previousD = stochArray.d[stochArray.d.length - 2];

			// ゴールデンクロス: %Kが%Dを下から上に突破
			if (previousK <= previousD && currentK > currentD) {
				return "golden_cross";
			}

			// デッドクロス: %Kが%Dを上から下に突破
			if (previousK >= previousD && currentK < currentD) {
				return "dead_cross";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}

	// オーバーボート・オーバーソールド状態の判定
	public static getOverboughtOversoldState(
		result: StochasticResult,
	): "overbought" | "oversold" | "neutral" {
		const { k, d } = result;

		// 両方が80以上 → 買われすぎ
		if (k >= 80 && d >= 80) return "overbought";

		// 両方が20以下 → 売られすぎ
		if (k <= 20 && d <= 20) return "oversold";

		return "neutral";
	}

	// ダイバージェンス（発散）の検出
	public static detectDivergence(
		priceData: PriceData[],
		kPeriod = 14,
		dPeriod = 3,
		lookback = 10,
	): "bullish" | "bearish" | "none" {
		try {
			if (priceData.length < kPeriod + dPeriod + lookback) {
				return "none";
			}

			const stochArray = StochasticCalculator.calculateArray(
				priceData,
				kPeriod,
				dPeriod,
			);
			const recentPrices = priceData.slice(-lookback).map(d => d.close);
			const recentK = stochArray.k.slice(-lookback);

			if (recentPrices.length < 2 || recentK.length < 2) {
				return "none";
			}

			const priceMin = Calculator.min(recentPrices);
			const priceMax = Calculator.max(recentPrices);
			const kMin = Calculator.min(recentK);
			const kMax = Calculator.max(recentK);

			const priceMinIndex = recentPrices.indexOf(priceMin);
			const priceMaxIndex = recentPrices.indexOf(priceMax);
			const kMinIndex = recentK.indexOf(kMin);
			const kMaxIndex = recentK.indexOf(kMax);

			// Bullish divergence: 価格が下落しているのに%Kが上昇
			if (priceMinIndex > priceMaxIndex && kMinIndex < kMaxIndex) {
				return "bullish";
			}

			// Bearish divergence: 価格が上昇しているのに%Kが下落
			if (priceMaxIndex > priceMinIndex && kMaxIndex < kMinIndex) {
				return "bearish";
			}

			return "none";
		} catch (error) {
			return "none";
		}
	}

	// モメンタムの判定
	public static getMomentum(
		priceData: PriceData[],
		kPeriod = 14,
		dPeriod = 3,
	): "accelerating" | "decelerating" | "neutral" {
		try {
			const stochArray = StochasticCalculator.calculateArray(
				priceData,
				kPeriod,
				dPeriod,
			);

			if (stochArray.k.length < 3) return "neutral";

			const recent = stochArray.k.slice(-3);
			const trend1 = recent[1] - recent[0];
			const trend2 = recent[2] - recent[1];

			// 加速している
			if (trend2 > trend1 && trend2 > 2) return "accelerating";

			// 減速している
			if (trend2 < trend1 && trend2 < -2) return "decelerating";

			return "neutral";
		} catch (error) {
			return "neutral";
		}
	}
}