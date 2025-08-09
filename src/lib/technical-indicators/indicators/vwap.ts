import { CalculationError } from "../types";
import { Calculator } from "../utils/calculator";
import type { PriceData } from "../types";

export interface VWAPResult {
	vwap: number;
	upperBand: number;
	lowerBand: number;
	deviation: number;
	position: "above" | "below" | "at";
	strength: "strong" | "moderate" | "weak";
	trend: "bullish" | "bearish" | "neutral";
}

export class VWAPCalculator {
	// VWAP（出来高加重平均価格）の計算
	public static calculate(
		priceData: PriceData[],
		standardDeviations = 1,
	): VWAPResult {
		if (!Array.isArray(priceData) || priceData.length === 0) {
			throw new CalculationError(
				"Price data array is empty or invalid",
				"INVALID_PRICES",
			);
		}

		// VWAP計算用のデータ準備
		let totalVolumePrice = 0;
		let totalVolume = 0;
		const volumePrices: number[] = [];
		const volumes: number[] = [];

		priceData.forEach(data => {
			// 代表価格（Typical Price）の計算
			const typicalPrice = (data.high + data.low + data.close) / 3;
			const volumePrice = typicalPrice * data.volume;
			
			totalVolumePrice += volumePrice;
			totalVolume += data.volume;
			
			volumePrices.push(volumePrice);
			volumes.push(data.volume);
		});

		if (totalVolume === 0) {
			throw new CalculationError(
				"Total volume is zero, cannot calculate VWAP",
				"ZERO_VOLUME",
			);
		}

		// VWAP = Σ(代表価格 × 出来高) / Σ(出来高)
		const vwap = totalVolumePrice / totalVolume;

		// VWAP標準偏差の計算
		const deviation = VWAPCalculator.calculateVWAPStandardDeviation(
			priceData,
			vwap,
			totalVolume,
		);

		// バンドの計算
		const upperBand = vwap + standardDeviations * deviation;
		const lowerBand = vwap - standardDeviations * deviation;

		// 現在価格とVWAPの位置関係
		const currentPrice = priceData[priceData.length - 1].close;
		let position: "above" | "below" | "at";
		if (currentPrice > vwap * 1.001) position = "above"; // 0.1%の余裕
		else if (currentPrice < vwap * 0.999) position = "below";
		else position = "at";

		// シグナルの強度
		const strength = VWAPCalculator.calculateSignalStrength(priceData, vwap);

		// トレンドの判定
		const trend = VWAPCalculator.calculateTrend(priceData, vwap);

		return {
			vwap: Calculator.round(vwap, 2),
			upperBand: Calculator.round(upperBand, 2),
			lowerBand: Calculator.round(lowerBand, 2),
			deviation: Calculator.round(deviation, 4),
			position,
			strength,
			trend,
		};
	}

	// VWAP配列の計算（累積VWAP）
	public static calculateArray(priceData: PriceData[]): number[] {
		if (priceData.length === 0) return [];

		const vwapArray: number[] = [];
		let cumulativeVolumePrice = 0;
		let cumulativeVolume = 0;

		priceData.forEach(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			cumulativeVolumePrice += typicalPrice * data.volume;
			cumulativeVolume += data.volume;
			
			const vwap = cumulativeVolume > 0 
				? cumulativeVolumePrice / cumulativeVolume 
				: typicalPrice;
			
			vwapArray.push(Calculator.round(vwap, 2));
		});

		return vwapArray;
	}

	// 移動VWAP（指定期間の出来高加重平均）
	public static calculateMovingVWAP(
		priceData: PriceData[],
		period: number,
	): number[] {
		if (priceData.length < period) return [];

		const movingVWAP: number[] = [];

		for (let i = period - 1; i < priceData.length; i++) {
			const periodData = priceData.slice(i - period + 1, i + 1);
			
			let totalVolumePrice = 0;
			let totalVolume = 0;
			
			periodData.forEach(data => {
				const typicalPrice = (data.high + data.low + data.close) / 3;
				totalVolumePrice += typicalPrice * data.volume;
				totalVolume += data.volume;
			});
			
			const vwap = totalVolume > 0 
				? totalVolumePrice / totalVolume 
				: periodData[periodData.length - 1].close;
			
			movingVWAP.push(Calculator.round(vwap, 2));
		}

		return movingVWAP;
	}

	// VWAP標準偏差の計算
	private static calculateVWAPStandardDeviation(
		priceData: PriceData[],
		vwap: number,
		totalVolume: number,
	): number {
		let varianceSum = 0;

		priceData.forEach(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			const priceDiff = typicalPrice - vwap;
			varianceSum += (priceDiff * priceDiff) * data.volume;
		});

		const variance = varianceSum / totalVolume;
		return Math.sqrt(variance);
	}

	// シグナル強度の計算
	private static calculateSignalStrength(
		priceData: PriceData[],
		vwap: number,
	): "strong" | "moderate" | "weak" {
		if (priceData.length < 5) return "weak";

		const recentPrices = Calculator.lastN(priceData, 5);
		let consistentDirection = 0;

		// 価格がVWAPに対して一貫した方向にあるかチェック
		recentPrices.forEach(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			if (typicalPrice > vwap) {
				consistentDirection += 1;
			} else if (typicalPrice < vwap) {
				consistentDirection -= 1;
			}
		});

		const consistency = Math.abs(consistentDirection) / recentPrices.length;
		
		if (consistency >= 0.8) return "strong"; // 80%以上の一貫性
		if (consistency >= 0.6) return "moderate"; // 60%以上の一貫性
		return "weak";
	}

	// トレンドの計算
	private static calculateTrend(
		priceData: PriceData[],
		currentVWAP: number,
	): "bullish" | "bearish" | "neutral" {
		if (priceData.length < 10) return "neutral";

		// 過去のVWAPと比較してトレンドを判定
		const halfwayPoint = Math.floor(priceData.length / 2);
		const earlierData = priceData.slice(0, halfwayPoint);
		
		let totalVolumePrice = 0;
		let totalVolume = 0;
		
		earlierData.forEach(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			totalVolumePrice += typicalPrice * data.volume;
			totalVolume += data.volume;
		});
		
		const earlierVWAP = totalVolume > 0 ? totalVolumePrice / totalVolume : currentVWAP;
		
		const change = (currentVWAP - earlierVWAP) / earlierVWAP;
		
		if (change > 0.02) return "bullish"; // 2%以上の上昇
		if (change < -0.02) return "bearish"; // 2%以上の下落
		return "neutral";
	}

	// VWAPのサポート・レジスタンス判定
	public static getSupportResistanceLevel(
		priceData: PriceData[],
		vwap: number,
	): "support" | "resistance" | "neutral" {
		if (priceData.length < 3) return "neutral";

		const recentPrices = Calculator.lastN(priceData, 3);
		const touchCount = recentPrices.filter(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			return Math.abs(typicalPrice - vwap) / vwap < 0.005; // 0.5%の範囲
		}).length;

		const currentPrice = priceData[priceData.length - 1].close;
		
		// VWAPに複数回触れて反発している場合
		if (touchCount >= 2) {
			if (currentPrice > vwap) {
				return "support"; // サポートとして機能
			} else {
				return "resistance"; // レジスタンスとして機能
			}
		}

		return "neutral";
	}

	// VWAPブレイクアウトの検出
	public static detectBreakout(
		priceData: PriceData[],
		volumeThreshold = 1.5,
	): "bullish_breakout" | "bearish_breakout" | "none" {
		if (priceData.length < 10) return "none";

		const vwapResult = VWAPCalculator.calculate(priceData);
		const currentData = priceData[priceData.length - 1];
		const currentPrice = currentData.close;

		// 平均出来高の計算
		const volumes = priceData.slice(-10).map(d => d.volume);
		const avgVolume = Calculator.average(volumes.slice(0, -1)); // 現在を除く

		// 出来高が閾値を超えているかチェック
		const volumeSpike = currentData.volume > avgVolume * volumeThreshold;

		if (!volumeSpike) return "none";

		// VWAPバンドからのブレイクアウト判定
		if (currentPrice > vwapResult.upperBand) {
			return "bullish_breakout";
		}
		
		if (currentPrice < vwapResult.lowerBand) {
			return "bearish_breakout";
		}

		return "none";
	}

	// VWAPのリバージョン（平均回帰）シグナル
	public static getReversionSignal(
		priceData: PriceData[],
		reversionThreshold = 2.0,
	): "buy_reversion" | "sell_reversion" | "none" {
		if (priceData.length < 5) return "none";

		const vwapResult = VWAPCalculator.calculate(priceData, 1); // 1標準偏差
		const currentPrice = priceData[priceData.length - 1].close;

		// VWAPから大きく乖離している場合の平均回帰狙い
		const deviationFromVWAP = Math.abs(currentPrice - vwapResult.vwap) / vwapResult.deviation;

		if (deviationFromVWAP > reversionThreshold) {
			if (currentPrice > vwapResult.vwap) {
				return "sell_reversion"; // 高すぎるので売り
			} else {
				return "buy_reversion"; // 安すぎるので買い
			}
		}

		return "none";
	}

	// アンカードVWAP（特定日からのVWAP）
	public static calculateAnchoredVWAP(
		priceData: PriceData[],
		anchorIndex: number,
	): number[] {
		if (anchorIndex >= priceData.length) return [];

		const anchoredData = priceData.slice(anchorIndex);
		return VWAPCalculator.calculateArray(anchoredData);
	}

	// VWAP効率性の計算（価格変動に対する出来高の効率性）
	public static calculateVWAPEfficiency(
		priceData: PriceData[],
	): number {
		if (priceData.length < 2) return 0;

		const vwap = VWAPCalculator.calculate(priceData).vwap;
		
		let totalVolumeWeightedDeviation = 0;
		let totalVolume = 0;

		priceData.forEach(data => {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			const deviation = Math.abs(typicalPrice - vwap);
			totalVolumeWeightedDeviation += deviation * data.volume;
			totalVolume += data.volume;
		});

		const avgWeightedDeviation = totalVolume > 0 
			? totalVolumeWeightedDeviation / totalVolume 
			: 0;

		// 効率性 = 1 / (平均乖離率 + 1)（0〜1の値）
		return avgWeightedDeviation > 0 
			? Calculator.round(1 / (avgWeightedDeviation / vwap + 1), 4)
			: 1;
	}
}