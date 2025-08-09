import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";
import { MovingAverageCalculator } from "./movingAverage";

export interface CrossDetectionResult {
	type: "golden_cross" | "dead_cross" | "none";
	shortMA: number;
	longMA: number;
	crossPoint: number; // クロスが発生した時点での価格
	strength: "strong" | "moderate" | "weak";
	confirmationDays: number; // クロス後の継続日数
}

export class CrossDetectionCalculator {
	// ゴールデンクロス・デッドクロスの検出
	public static detectCross(
		prices: number[],
		shortPeriod = 25,
		longPeriod = 75,
		confirmationPeriod = 3,
	): CrossDetectionResult {
		if (!Array.isArray(prices) || prices.length === 0) {
			throw new CalculationError(
				"Prices array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		if (prices.length < Math.max(longPeriod, shortPeriod) + confirmationPeriod) {
			throw new CalculationError(
				`Not enough data points. Need ${Math.max(longPeriod, shortPeriod) + confirmationPeriod}, got ${prices.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		// 移動平均線の計算
		const shortMAArray = MovingAverageCalculator.calculateArray(prices, shortPeriod);
		const longMAArray = MovingAverageCalculator.calculateArray(prices, longPeriod);

		if (shortMAArray.length < 2 || longMAArray.length < 2) {
			return {
				type: "none",
				shortMA: 0,
				longMA: 0,
				crossPoint: 0,
				strength: "weak",
				confirmationDays: 0,
			};
		}

		// 配列の長さを合わせる
		const lengthDiff = shortMAArray.length - longMAArray.length;
		const adjustedShortMA = lengthDiff > 0 ? shortMAArray.slice(lengthDiff) : shortMAArray;
		const adjustedLongMA = lengthDiff < 0 ? longMAArray.slice(-lengthDiff) : longMAArray;

		// 現在と前回の移動平均値
		const currentShort = adjustedShortMA[adjustedShortMA.length - 1];
		const previousShort = adjustedShortMA[adjustedShortMA.length - 2];
		const currentLong = adjustedLongMA[adjustedLongMA.length - 1];
		const previousLong = adjustedLongMA[adjustedLongMA.length - 2];

		// クロス検出
		let crossType: "golden_cross" | "dead_cross" | "none" = "none";
		const crossPoint = prices[prices.length - 1];

		// ゴールデンクロス: 短期線が長期線を下から上に突破
		if (previousShort <= previousLong && currentShort > currentLong) {
			crossType = "golden_cross";
		}
		// デッドクロス: 短期線が長期線を上から下に突破
		else if (previousShort >= previousLong && currentShort < currentLong) {
			crossType = "dead_cross";
		}

		// 強度の判定
		const strength = CrossDetectionCalculator.calculateCrossStrength(
			adjustedShortMA,
			adjustedLongMA,
			prices,
		);

		// 継続日数の計算
		const confirmationDays = CrossDetectionCalculator.calculateConfirmationDays(
			adjustedShortMA,
			adjustedLongMA,
			confirmationPeriod,
		);

		return {
			type: crossType,
			shortMA: Calculator.round(currentShort, 2),
			longMA: Calculator.round(currentLong, 2),
			crossPoint: Calculator.round(crossPoint, 2),
			strength,
			confirmationDays,
		};
	}

	// 複数期間でのクロス検出
	public static detectMultipleCrosses(
		prices: number[],
		crossPairs: Array<{ short: number; long: number }> = [
			{ short: 5, long: 25 },
			{ short: 25, long: 75 },
			{ short: 50, long: 200 },
		],
	): CrossDetectionResult[] {
		const results: CrossDetectionResult[] = [];

		for (const pair of crossPairs) {
			try {
				const result = CrossDetectionCalculator.detectCross(
					prices,
					pair.short,
					pair.long,
				);
				results.push(result);
			} catch (error) {
				// エラーが発生した場合は空の結果を追加
				results.push({
					type: "none",
					shortMA: 0,
					longMA: 0,
					crossPoint: 0,
					strength: "weak",
					confirmationDays: 0,
				});
			}
		}

		return results;
	}

	// クロスの強度を計算
	private static calculateCrossStrength(
		shortMAArray: number[],
		longMAArray: number[],
		prices: number[],
	): "strong" | "moderate" | "weak" {
		if (shortMAArray.length < 5 || longMAArray.length < 5) {
			return "weak";
		}

		// 移動平均線の傾きを計算
		const shortTrend = CrossDetectionCalculator.calculateTrend(shortMAArray, 5);
		const longTrend = CrossDetectionCalculator.calculateTrend(longMAArray, 5);

		// 出来高や価格の変動率も考慮（簡易版）
		const recentPrices = Calculator.lastN(prices, 5);
		const volatility = Calculator.standardDeviation(recentPrices) / Calculator.average(recentPrices);

		// 強度判定ロジック
		if (Math.abs(shortTrend) > 0.02 && Math.abs(longTrend) > 0.01 && volatility > 0.03) {
			return "strong";
		}
		if (Math.abs(shortTrend) > 0.01 || Math.abs(longTrend) > 0.005 || volatility > 0.02) {
			return "moderate";
		}

		return "weak";
	}

	// 移動平均線の傾き（トレンド）を計算
	private static calculateTrend(maArray: number[], period: number): number {
		if (maArray.length < period) return 0;

		const recent = Calculator.lastN(maArray, period);
		const first = recent[0];
		const last = recent[recent.length - 1];

		return (last - first) / first;
	}

	// 継続日数を計算
	private static calculateConfirmationDays(
		shortMAArray: number[],
		longMAArray: number[],
		maxDays: number,
	): number {
		let confirmationDays = 0;
		const minLength = Math.min(shortMAArray.length, longMAArray.length);

		// 現在のクロス状態を確認
		const currentShort = shortMAArray[shortMAArray.length - 1];
		const currentLong = longMAArray[longMAArray.length - 1];
		const isGolden = currentShort > currentLong;

		// 過去に遡ってクロス状態が継続している日数をカウント
		for (let i = 1; i <= Math.min(maxDays, minLength - 1); i++) {
			const pastShort = shortMAArray[shortMAArray.length - 1 - i];
			const pastLong = longMAArray[longMAArray.length - 1 - i];
			const pastIsGolden = pastShort > pastLong;

			if (pastIsGolden === isGolden) {
				confirmationDays++;
			} else {
				break;
			}
		}

		return confirmationDays;
	}

	// トレンドフォロー戦略のシグナル判定
	public static getTrendFollowSignal(
		crossResult: CrossDetectionResult,
		minConfirmationDays = 2,
	): "strong_buy" | "buy" | "strong_sell" | "sell" | "hold" {
		const { type, strength, confirmationDays } = crossResult;

		if (type === "golden_cross") {
			if (strength === "strong" && confirmationDays >= minConfirmationDays) {
				return "strong_buy";
			}
			if (confirmationDays >= minConfirmationDays || strength !== "weak") {
				return "buy";
			}
		}

		if (type === "dead_cross") {
			if (strength === "strong" && confirmationDays >= minConfirmationDays) {
				return "strong_sell";
			}
			if (confirmationDays >= minConfirmationDays || strength !== "weak") {
				return "sell";
			}
		}

		return "hold";
	}

	// 逆張り戦略のシグナル判定（クロス後の反転狙い）
	public static getContrarianSignal(
		crossResult: CrossDetectionResult,
		maxConfirmationDays = 5,
	): "contrarian_buy" | "contrarian_sell" | "wait" {
		const { type, strength, confirmationDays } = crossResult;

		// 弱いクロスで確認日数が少ない場合は逆張りチャンス
		if (type === "dead_cross" && strength === "weak" && confirmationDays <= maxConfirmationDays) {
			return "contrarian_buy";
		}

		if (type === "golden_cross" && strength === "weak" && confirmationDays <= maxConfirmationDays) {
			return "contrarian_sell";
		}

		return "wait";
	}

	// 複数時間軸でのクロス分析
	public static getMultiTimeframeAnalysis(
		prices: number[],
	): {
		shortTerm: CrossDetectionResult;
		mediumTerm: CrossDetectionResult;
		longTerm: CrossDetectionResult;
		consensus: "bullish" | "bearish" | "mixed" | "neutral";
	} {
		const shortTerm = CrossDetectionCalculator.detectCross(prices, 5, 25, 2);
		const mediumTerm = CrossDetectionCalculator.detectCross(prices, 25, 75, 3);
		const longTerm = CrossDetectionCalculator.detectCross(prices, 50, 200, 5);

		// コンセンサス判定
		let bullishCount = 0;
		let bearishCount = 0;

		for (const result of [shortTerm, mediumTerm, longTerm]) {
			if (result.type === "golden_cross" || result.shortMA > result.longMA) {
				bullishCount++;
			} else if (result.type === "dead_cross" || result.shortMA < result.longMA) {
				bearishCount++;
			}
		}

		let consensus: "bullish" | "bearish" | "mixed" | "neutral";
		if (bullishCount >= 2 && bearishCount === 0) consensus = "bullish";
		else if (bearishCount >= 2 && bullishCount === 0) consensus = "bearish";
		else if (bullishCount > 0 && bearishCount > 0) consensus = "mixed";
		else consensus = "neutral";

		return {
			shortTerm,
			mediumTerm,
			longTerm,
			consensus,
		};
	}
}