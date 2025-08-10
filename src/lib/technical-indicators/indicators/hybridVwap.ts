import type { PriceData, VWAPAnalysisResult } from "../types";
import { TrueVWAPCalculator, type TrueVWAPResult } from "./trueVwap";
import { VWAPCalculator, type VWAPResult } from "./vwap";

// VWAPAnalysisResult は types.ts で定義

export interface VWAPConfig {
	enableTrueVWAP?: boolean;
	standardDeviations?: number;
	mvwap?: {
		period?: number;
		standardDeviations?: number;
	};
}

export class HybridVWAPCalculator {
	/**
	 * ハイブリッドVWAP分析（真のVWAPと移動VWAP統合）
	 * @param symbol 株式シンボル
	 * @param priceData 日足価格データ
	 * @param config VWAP設定
	 * @returns 統合VWAP分析結果
	 */
	public static async calculateHybridVWAP(
		symbol: string,
		priceData: PriceData[],
		config: VWAPConfig = {},
	): Promise<VWAPAnalysisResult> {
		const { enableTrueVWAP = true, standardDeviations = 1, mvwap = { period: 20, standardDeviations: 1 } } = config;

		// 移動VWAP計算（常時利用可能）
		const movingVWAPResult = VWAPCalculator.calculate(
			priceData.slice(-(mvwap.period || 20)),
			mvwap.standardDeviations || 1,
		);

		const movingVWAP = {
			...movingVWAPResult,
			config: {
				period: mvwap.period || 20,
				sigma: mvwap.standardDeviations || 1,
			},
		};

		let trueDailyVWAP: VWAPAnalysisResult["trueDailyVWAP"];
		const dataSource: VWAPAnalysisResult["dataSource"] = { moving: "daily" };

		// 真の1日VWAP計算（設定が有効で利用可能な場合）
		if (enableTrueVWAP) {
			try {
				const result = await TrueVWAPCalculator.calculateTrueDailyVWAP(symbol, new Date(), standardDeviations);

				if (result) {
					trueDailyVWAP = {
						vwap: result.vwap,
						upperBand: result.upperBand,
						lowerBand: result.lowerBand,
						deviation: result.deviation,
						position: result.position,
						strength: result.strength,
						trend: result.trend,
						dataSource: result.dataSource,
						dataQuality: result.dataQuality,
						dataPoints: result.dataPoints,
						calculationDate: result.calculationDate,
					};
					dataSource.daily = result.dataSource;
				} else {
					dataSource.daily = "unavailable";
				}
			} catch (error) {
				console.warn(`Failed to calculate true daily VWAP for ${symbol}:`, error);
				dataSource.daily = "unavailable";
			}
		}

		// 推奨VWAP選択
		const recommendedVWAP = HybridVWAPCalculator.selectRecommendedVWAP(trueDailyVWAP, movingVWAP);

		// 分析データ生成
		const analysis = HybridVWAPCalculator.generateAnalysis(trueDailyVWAP, movingVWAP, priceData);

		return {
			trueDailyVWAP,
			movingVWAP,
			recommendedVWAP,
			dataSource,
			analysis,
		};
	}

	/**
	 * 最適なVWAP選択ロジック
	 * @param dailyVWAP 真の1日VWAP
	 * @param movingVWAP 移動VWAP
	 * @returns 推奨VWAP
	 */
	private static selectRecommendedVWAP(
		dailyVWAP: VWAPAnalysisResult["trueDailyVWAP"],
		movingVWAP: VWAPResult & { config: { period: number; sigma: number } },
	): "daily" | "moving" | "both" {
		// 真の1日VWAPが利用不可の場合は移動VWAP
		if (!dailyVWAP) {
			return "moving";
		}

		// データ品質による判断
		if (dailyVWAP.dataQuality === "low") {
			return "moving";
		}

		// 高品質の場合は両方を推奨
		if (dailyVWAP.dataQuality === "high" && dailyVWAP.dataPoints >= 20) {
			return "both";
		}

		// 中品質の場合は真のVWAPを優先
		return "daily";
	}

	/**
	 * VWAP分析データ生成
	 * @param dailyVWAP 真の1日VWAP
	 * @param movingVWAP 移動VWAP
	 * @param priceData 価格データ
	 * @returns 分析結果
	 */
	private static generateAnalysis(
		dailyVWAP: VWAPAnalysisResult["trueDailyVWAP"],
		movingVWAP: VWAPResult & { config: { period: number; sigma: number } },
		priceData: PriceData[],
	): VWAPAnalysisResult["analysis"] {
		const currentPrice = priceData[priceData.length - 1].close;

		// 収束性分析（両方のVWAPがある場合）
		let convergence: "converging" | "diverging" | "aligned" | undefined;
		if (dailyVWAP) {
			const vwapDiff = Math.abs(dailyVWAP.vwap - movingVWAP.vwap);
			const avgVWAP = (dailyVWAP.vwap + movingVWAP.vwap) / 2;
			const diffPercent = vwapDiff / avgVWAP;

			if (diffPercent < 0.005) {
				// 0.5%以内
				convergence = "aligned";
			} else if (diffPercent < 0.02) {
				// 2%以内
				convergence = "converging";
			} else {
				convergence = "diverging";
			}
		}

		// 信頼性評価
		let reliability: "high" | "medium" | "low" = "medium";
		if (dailyVWAP) {
			if (dailyVWAP.dataQuality === "high" && convergence === "aligned") {
				reliability = "high";
			} else if (dailyVWAP.dataQuality === "low" || convergence === "diverging") {
				reliability = "low";
			}
		}

		// トレーディングシグナル統合
		const tradingSignal = HybridVWAPCalculator.generateTradingSignal(dailyVWAP, movingVWAP, currentPrice);

		return {
			convergence,
			reliability,
			tradingSignal,
		};
	}

	/**
	 * 統合トレーディングシグナル生成
	 * @param dailyVWAP 真の1日VWAP
	 * @param movingVWAP 移動VWAP
	 * @param currentPrice 現在価格
	 * @returns トレーディングシグナル
	 */
	private static generateTradingSignal(
		dailyVWAP: VWAPAnalysisResult["trueDailyVWAP"],
		movingVWAP: VWAPResult,
		currentPrice: number,
	): "bullish" | "bearish" | "neutral" {
		const signals: ("bullish" | "bearish" | "neutral")[] = [];

		// 移動VWAPからのシグナル
		if (currentPrice > movingVWAP.upperBand) {
			signals.push("bullish");
		} else if (currentPrice < movingVWAP.lowerBand) {
			signals.push("bearish");
		} else {
			signals.push("neutral");
		}

		// 真のVWAPからのシグナル（利用可能な場合）
		if (dailyVWAP) {
			if (currentPrice > dailyVWAP.upperBand) {
				signals.push("bullish");
			} else if (currentPrice < dailyVWAP.lowerBand) {
				signals.push("bearish");
			} else {
				signals.push("neutral");
			}
		}

		// 複数シグナルの統合
		const bullishCount = signals.filter((s) => s === "bullish").length;
		const bearishCount = signals.filter((s) => s === "bearish").length;

		if (bullishCount > bearishCount) return "bullish";
		if (bearishCount > bullishCount) return "bearish";
		return "neutral";
	}

	/**
	 * VWAP価格レベル分析
	 * @param vwapResult VWAP分析結果
	 * @param currentPrice 現在価格
	 * @returns 価格レベル情報
	 */
	public static analyzePriceLevels(
		vwapResult: VWAPAnalysisResult,
		currentPrice: number,
	): {
		keyLevels: { price: number; type: "support" | "resistance" | "vwap"; source: "daily" | "moving" }[];
		currentPosition: "above_all" | "between" | "below_all" | "at_level";
	} {
		const keyLevels: {
			price: number;
			type: "support" | "resistance" | "vwap";
			source: "daily" | "moving";
		}[] = [];

		// 移動VWAPレベル
		keyLevels.push(
			{ price: vwapResult.movingVWAP.vwap, type: "vwap", source: "moving" },
			{ price: vwapResult.movingVWAP.upperBand, type: "resistance", source: "moving" },
			{ price: vwapResult.movingVWAP.lowerBand, type: "support", source: "moving" },
		);

		// 真のVWAPレベル（利用可能な場合）
		if (vwapResult.trueDailyVWAP) {
			keyLevels.push(
				{ price: vwapResult.trueDailyVWAP.vwap, type: "vwap", source: "daily" },
				{ price: vwapResult.trueDailyVWAP.upperBand, type: "resistance", source: "daily" },
				{ price: vwapResult.trueDailyVWAP.lowerBand, type: "support", source: "daily" },
			);
		}

		// 価格でソート
		keyLevels.sort((a, b) => b.price - a.price);

		// 現在位置判定
		let currentPosition: "above_all" | "between" | "below_all" | "at_level" = "between";

		const highestLevel = Math.max(...keyLevels.map((l) => l.price));
		const lowestLevel = Math.min(...keyLevels.map((l) => l.price));

		if (currentPrice > highestLevel * 1.001) {
			currentPosition = "above_all";
		} else if (currentPrice < lowestLevel * 0.999) {
			currentPosition = "below_all";
		} else if (keyLevels.some((l) => Math.abs(currentPrice - l.price) / l.price < 0.005)) {
			currentPosition = "at_level";
		}

		return { keyLevels, currentPosition };
	}

	/**
	 * VWAP効果性分析
	 * @param vwapResult VWAP分析結果
	 * @param priceData 価格データ
	 * @returns 効果性スコア
	 */
	public static analyzeVWAPEffectiveness(
		vwapResult: VWAPAnalysisResult,
		priceData: PriceData[],
	): {
		movingVWAPEffectiveness: number;
		dailyVWAPEffectiveness?: number;
		overallEffectiveness: number;
	} {
		const movingVWAPEffectiveness = VWAPCalculator.calculateVWAPEfficiency(
			priceData.slice(-vwapResult.movingVWAP.config.period),
		);

		let dailyVWAPEffectiveness: number | undefined;
		if (vwapResult.trueDailyVWAP) {
			// 簡易的な効果性計算（15分足データがないため概算）
			const currentPrice = priceData[priceData.length - 1].close;
			const vwapDistance = Math.abs(currentPrice - vwapResult.trueDailyVWAP.vwap);
			const relativeDistance = vwapDistance / vwapResult.trueDailyVWAP.vwap;
			dailyVWAPEffectiveness = Math.max(0, 1 - relativeDistance * 2); // 簡易スコア
		}

		// 総合効果性
		const overallEffectiveness = dailyVWAPEffectiveness
			? (movingVWAPEffectiveness + dailyVWAPEffectiveness) / 2
			: movingVWAPEffectiveness;

		return {
			movingVWAPEffectiveness,
			dailyVWAPEffectiveness,
			overallEffectiveness,
		};
	}
}
