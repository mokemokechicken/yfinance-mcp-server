import { CalculationError } from "../types";
import type { PriceData } from "../types";
import { Calculator } from "../utils/calculator";

export interface VolumeAnalysisResult {
	averageVolume: number; // 平均出来高
	relativeVolume: number; // 相対出来高（現在出来高 / 平均出来高）
	volumeTrend: "increasing" | "decreasing" | "stable";
	volumeSpike: boolean; // 出来高急増の検出
	priceVolumeStrength: "strong" | "moderate" | "weak"; // 価格と出来高の相関強度
	accumulation: "accumulating" | "distributing" | "neutral"; // 蓄積・分散の判定
}

export class VolumeAnalysisCalculator {
	// 出来高分析の計算
	public static calculate(priceData: PriceData[], period = 20): VolumeAnalysisResult {
		if (!Array.isArray(priceData) || priceData.length === 0) {
			throw new CalculationError("Price data array is empty or invalid", "INVALID_PRICES");
		}

		if (priceData.length < period) {
			throw new CalculationError(
				`Not enough data points. Need ${period}, got ${priceData.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		const recentData = Calculator.lastN(priceData, period);
		const volumes = recentData.map((d) => d.volume);
		const currentVolume = priceData[priceData.length - 1].volume;

		// 平均出来高の計算
		const averageVolume = Calculator.average(volumes);

		// 相対出来高の計算
		const relativeVolume = averageVolume > 0 ? currentVolume / averageVolume : 1;

		// 出来高トレンドの判定
		const volumeTrend = VolumeAnalysisCalculator.calculateVolumeTrend(recentData);

		// 出来高急増の検出
		const volumeSpike = VolumeAnalysisCalculator.detectVolumeSpike(recentData, period);

		// 価格と出来高の相関強度
		const priceVolumeStrength = VolumeAnalysisCalculator.calculatePriceVolumeStrength(recentData);

		// 蓄積・分散の判定
		const accumulation = VolumeAnalysisCalculator.calculateAccumulationDistribution(recentData);

		return {
			averageVolume: Calculator.round(averageVolume, 0),
			relativeVolume: Calculator.round(relativeVolume, 2),
			volumeTrend,
			volumeSpike,
			priceVolumeStrength,
			accumulation,
		};
	}

	// 出来高トレンドの計算
	private static calculateVolumeTrend(priceData: PriceData[], lookback = 5): "increasing" | "decreasing" | "stable" {
		if (priceData.length < lookback * 2) return "stable";

		const recent = Calculator.lastN(priceData, lookback);
		const previous = priceData.slice(-lookback * 2, -lookback);

		const recentAvg = Calculator.average(recent.map((d) => d.volume));
		const previousAvg = Calculator.average(previous.map((d) => d.volume));

		const change = (recentAvg - previousAvg) / previousAvg;

		if (change > 0.2) return "increasing"; // 20%以上増加
		if (change < -0.2) return "decreasing"; // 20%以上減少
		return "stable";
	}

	// 出来高急増の検出
	private static detectVolumeSpike(priceData: PriceData[], period: number, spikeThreshold = 2.0): boolean {
		if (priceData.length < period) return false;

		const volumes = priceData.map((d) => d.volume);
		const currentVolume = volumes[volumes.length - 1];
		const averageVolume = Calculator.average(volumes.slice(0, -1)); // 現在を除く

		return currentVolume > averageVolume * spikeThreshold;
	}

	// 価格と出来高の相関強度の計算
	private static calculatePriceVolumeStrength(priceData: PriceData[]): "strong" | "moderate" | "weak" {
		if (priceData.length < 10) return "weak";

		// 価格変動率と出来高変動率の相関を計算
		const priceChanges: number[] = [];
		const volumeChanges: number[] = [];

		for (let i = 1; i < priceData.length; i++) {
			const priceChange = (priceData[i].close - priceData[i - 1].close) / priceData[i - 1].close;
			const volumeChange =
				priceData[i - 1].volume > 0 ? (priceData[i].volume - priceData[i - 1].volume) / priceData[i - 1].volume : 0;

			priceChanges.push(Math.abs(priceChange));
			volumeChanges.push(Math.abs(volumeChange));
		}

		// 簡易相関係数の計算
		const correlation = VolumeAnalysisCalculator.calculateCorrelation(priceChanges, volumeChanges);

		if (correlation > 0.6) return "strong";
		if (correlation > 0.3) return "moderate";
		return "weak";
	}

	// 相関係数の計算
	private static calculateCorrelation(x: number[], y: number[]): number {
		if (x.length !== y.length || x.length === 0) return 0;

		const n = x.length;
		const sumX = x.reduce((sum, val) => sum + val, 0);
		const sumY = y.reduce((sum, val) => sum + val, 0);
		const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
		const sumXX = x.reduce((sum, val) => sum + val * val, 0);
		const sumYY = y.reduce((sum, val) => sum + val * val, 0);

		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

		return denominator === 0 ? 0 : numerator / denominator;
	}

	// 蓄積・分散の判定（OBV風の簡易版）
	private static calculateAccumulationDistribution(
		priceData: PriceData[],
	): "accumulating" | "distributing" | "neutral" {
		if (priceData.length < 5) return "neutral";

		let obvValue = 0;
		const obvValues: number[] = [];

		// OBV風の指標を計算
		for (let i = 1; i < priceData.length; i++) {
			const priceChange = priceData[i].close - priceData[i - 1].close;

			if (priceChange > 0) {
				obvValue += priceData[i].volume;
			} else if (priceChange < 0) {
				obvValue -= priceData[i].volume;
			}
			// 価格変動なしの場合は出来高を加算しない

			obvValues.push(obvValue);
		}

		if (obvValues.length < 3) return "neutral";

		// 直近のOBVトレンドを判定
		const recent = Calculator.lastN(obvValues, 3);
		const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0];
		const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0];

		if (isIncreasing) return "accumulating";
		if (isDecreasing) return "distributing";
		return "neutral";
	}

	// 出来高プロファイルの分析（価格帯別出来高）
	public static calculateVolumeProfile(
		priceData: PriceData[],
		bins = 10,
	): Array<{
		priceLevel: number;
		volume: number;
		percentage: number;
	}> {
		if (priceData.length === 0) return [];

		const prices = priceData.map((d) => d.close);
		const volumes = priceData.map((d) => d.volume);
		const minPrice = Calculator.min(prices);
		const maxPrice = Calculator.max(prices);
		const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

		// 価格帯を分割
		const binSize = (maxPrice - minPrice) / bins;
		const profile: Array<{
			priceLevel: number;
			volume: number;
			percentage: number;
		}> = [];

		for (let i = 0; i < bins; i++) {
			const lowerBound = minPrice + i * binSize;
			const upperBound = minPrice + (i + 1) * binSize;
			const priceLevel = (lowerBound + upperBound) / 2;

			let binVolume = 0;

			for (const data of priceData) {
				if (data.close >= lowerBound && data.close < upperBound) {
					binVolume += data.volume;
				}
			}

			const percentage = totalVolume > 0 ? binVolume / totalVolume : 0;

			profile.push({
				priceLevel: Calculator.round(priceLevel, 2),
				volume: binVolume,
				percentage: Calculator.round(percentage * 100, 2),
			});
		}

		return profile.sort((a, b) => b.volume - a.volume); // 出来高順にソート
	}

	// 出来高移動平均線の計算
	public static calculateVolumeMA(priceData: PriceData[], period = 20): number[] {
		const volumes = priceData.map((d) => d.volume);
		return Calculator.simpleMovingAverage(volumes, period);
	}

	// 相対出来高の配列を計算
	public static calculateRelativeVolumeArray(priceData: PriceData[], period = 20): number[] {
		if (priceData.length < period) return [];

		const relativeVolumes: number[] = [];

		for (let i = period - 1; i < priceData.length; i++) {
			const periodData = priceData.slice(i - period + 1, i + 1);
			const volumes = periodData.map((d) => d.volume);
			const avgVolume = Calculator.average(volumes.slice(0, -1)); // 現在を除く
			const currentVolume = volumes[volumes.length - 1];

			const relativeVolume = avgVolume > 0 ? currentVolume / avgVolume : 1;
			relativeVolumes.push(Calculator.round(relativeVolume, 2));
		}

		return relativeVolumes;
	}

	// チャイキンマネーフロー（CMF）の計算
	public static calculateChaikinMoneyFlow(priceData: PriceData[], period = 20): number {
		if (priceData.length < period) {
			throw new CalculationError(
				`Not enough data points for CMF. Need ${period}, got ${priceData.length}`,
				"INSUFFICIENT_DATA",
			);
		}

		const recentData = Calculator.lastN(priceData, period);
		let cmfSum = 0;
		let volumeSum = 0;

		for (const data of recentData) {
			const { high, low, close, volume } = data;

			// マネーフロー倍数の計算
			const moneyFlowMultiplier = high - low > 0 ? (close - low - (high - close)) / (high - low) : 0;

			// マネーフローボリュームの計算
			const moneyFlowVolume = moneyFlowMultiplier * volume;

			cmfSum += moneyFlowVolume;
			volumeSum += volume;
		}

		return volumeSum > 0 ? Calculator.round(cmfSum / volumeSum, 4) : 0;
	}

	// 出来高重み付き価格（VWAP）のサポート関数
	public static calculatePeriodVWAP(priceData: PriceData[]): number {
		if (priceData.length === 0) return 0;

		let totalVolumePrice = 0;
		let totalVolume = 0;

		for (const data of priceData) {
			const typicalPrice = (data.high + data.low + data.close) / 3;
			totalVolumePrice += typicalPrice * data.volume;
			totalVolume += data.volume;
		}

		return totalVolume > 0 ? Calculator.round(totalVolumePrice / totalVolume, 2) : 0;
	}
}
