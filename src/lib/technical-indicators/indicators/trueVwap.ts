import yahooFinance from "yahoo-finance2";
import { CalculationError, type PriceData } from "../types";
import { Calculator } from "../utils/calculator";
import type { VWAPResult } from "./vwap";

export interface TrueVWAPResult extends VWAPResult {
	dataSource: "15min" | "unavailable";
	dataQuality: "high" | "medium" | "low";
	dataPoints: number;
	calculationDate: string;
}

export interface IntradayData extends PriceData {
	datetime: Date;
}

export class TrueVWAPCalculator {
	// キャッシュ（1時間TTL）
	private static cache = new Map<string, { data: TrueVWAPResult | null; timestamp: number }>();
	private static readonly CACHE_TTL = 60 * 60 * 1000; // 1時間

	/**
	 * 真の1日VWAP計算（15分足データ使用）
	 * @param symbol 株式シンボル
	 * @param targetDate 対象日（デフォルト：今日）
	 * @param standardDeviations 標準偏差倍数
	 * @returns 1日VWAP結果またはnull（データ取得失敗時）
	 */
	public static async calculateTrueDailyVWAP(
		symbol: string,
		targetDate?: Date,
		standardDeviations = 1,
	): Promise<TrueVWAPResult | null> {
		try {
			const date = targetDate || new Date();
			const cacheKey = `${symbol}_${date.toISOString().split("T")[0]}_${standardDeviations}`;

			// キャッシュチェック
			const cached = TrueVWAPCalculator.cache.get(cacheKey);
			if (cached && Date.now() - cached.timestamp < TrueVWAPCalculator.CACHE_TTL) {
				return cached.data;
			}

			// 15分足データ取得
			const intradayData = await TrueVWAPCalculator.fetch15MinData(symbol, date);
			if (!intradayData || intradayData.length === 0) {
				TrueVWAPCalculator.cache.set(cacheKey, { data: null, timestamp: Date.now() });
				return null;
			}

			// データ品質チェック
			const dataQuality = TrueVWAPCalculator.validateDataQuality(intradayData);
			if (dataQuality === "low") {
				console.warn(`Low quality 15min data for ${symbol} on ${date.toISOString()}`);
			}

			// 真の1日VWAP計算
			const vwapResult = TrueVWAPCalculator.calculateVWAPFromIntradayData(intradayData, standardDeviations);

			const result: TrueVWAPResult = {
				...vwapResult,
				dataSource: "15min",
				dataQuality,
				dataPoints: intradayData.length,
				calculationDate: date.toISOString().split("T")[0],
			};

			// キャッシュに保存
			TrueVWAPCalculator.cache.set(cacheKey, { data: result, timestamp: Date.now() });
			return result;
		} catch (error) {
			console.error(`Failed to calculate true daily VWAP for ${symbol}:`, error);
			return null;
		}
	}

	/**
	 * 15分足データ取得
	 * @param symbol 株式シンボル
	 * @param date 対象日
	 * @returns 15分足データ配列
	 */
	private static async fetch15MinData(symbol: string, date: Date): Promise<IntradayData[] | null> {
		try {
			// Yahoo Finance APIの15分足データ取得
			// 対象日の開始時刻と終了時刻を設定
			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);

			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);

			// 15分足データ取得（過去60日間のデータが利用可能）
			const now = new Date();
			const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

			if (date < sixtyDaysAgo) {
				console.warn(`Date ${date.toISOString()} is older than 60 days, 15min data unavailable`);
				return null;
			}

			// Yahoo Finance 15分足データ取得
			const result = await yahooFinance.chart(symbol, {
				period1: startOfDay,
				period2: endOfDay,
				interval: "15m",
			});

			if (!result.quotes || result.quotes.length === 0) {
				return null;
			}

			// データ変換
			const intradayData: IntradayData[] = result.quotes
				.filter((quote) => quote.open && quote.high && quote.low && quote.close && quote.volume)
				.map((quote) => ({
					date: quote.date as Date,
					datetime: quote.date as Date,
					open: quote.open as number,
					high: quote.high as number,
					low: quote.low as number,
					close: quote.close as number,
					volume: quote.volume as number,
				}));

			return intradayData;
		} catch (error) {
			console.error(`Failed to fetch 15min data for ${symbol}:`, error);
			return null;
		}
	}

	/**
	 * データ品質チェック
	 * @param data 15分足データ
	 * @returns データ品質レベル
	 */
	private static validateDataQuality(data: IntradayData[]): "high" | "medium" | "low" {
		if (data.length === 0) return "low";

		// 通常の取引日には約26個の15分足データポイントがある（6.5時間 × 4）
		const expectedDataPoints = 26;
		const completeness = data.length / expectedDataPoints;

		// 出来高チェック
		const zeroVolumeCount = data.filter((d) => d.volume === 0).length;
		const volumeQuality = 1 - zeroVolumeCount / data.length;

		// 価格データの整合性チェック
		const invalidPriceCount = data.filter((d) => d.high < d.low || d.close < 0 || d.open < 0).length;
		const priceQuality = 1 - invalidPriceCount / data.length;

		// 総合品質スコア
		const qualityScore = (completeness + volumeQuality + priceQuality) / 3;

		if (qualityScore >= 0.9) return "high";
		if (qualityScore >= 0.7) return "medium";
		return "low";
	}

	/**
	 * 15分足データからVWAP計算
	 * @param data 15分足データ
	 * @param standardDeviations 標準偏差倍数
	 * @returns VWAP結果
	 */
	private static calculateVWAPFromIntradayData(data: IntradayData[], standardDeviations: number): VWAPResult {
		if (data.length === 0) {
			throw new CalculationError("No intraday data available for VWAP calculation", "NO_DATA");
		}

		let totalVolumePrice = 0;
		let totalVolume = 0;

		// VWAP計算
		for (const point of data) {
			const typicalPrice = (point.high + point.low + point.close) / 3;
			const volumePrice = typicalPrice * point.volume;

			totalVolumePrice += volumePrice;
			totalVolume += point.volume;
		}

		if (totalVolume === 0) {
			throw new CalculationError("Total volume is zero for intraday VWAP calculation", "ZERO_VOLUME");
		}

		const vwap = totalVolumePrice / totalVolume;

		// 標準偏差計算
		const deviation = TrueVWAPCalculator.calculateVWAPStandardDeviation(data, vwap, totalVolume);

		// バンド計算
		const upperBand = vwap + standardDeviations * deviation;
		const lowerBand = vwap - standardDeviations * deviation;

		// 現在価格との位置関係
		const currentPrice = data[data.length - 1].close;
		let position: "above" | "below" | "at";
		if (currentPrice > vwap * 1.001) position = "above";
		else if (currentPrice < vwap * 0.999) position = "below";
		else position = "at";

		// シグナル強度計算
		const strength = TrueVWAPCalculator.calculateSignalStrength(data, vwap);

		// トレンド計算
		const trend = TrueVWAPCalculator.calculateTrend(data, vwap);

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

	/**
	 * VWAP標準偏差計算（15分足版）
	 */
	private static calculateVWAPStandardDeviation(data: IntradayData[], vwap: number, totalVolume: number): number {
		let varianceSum = 0;

		for (const point of data) {
			const typicalPrice = (point.high + point.low + point.close) / 3;
			const priceDiff = typicalPrice - vwap;
			varianceSum += priceDiff * priceDiff * point.volume;
		}

		const variance = varianceSum / totalVolume;
		return Math.sqrt(variance);
	}

	/**
	 * シグナル強度計算（15分足版）
	 */
	private static calculateSignalStrength(data: IntradayData[], vwap: number): "strong" | "moderate" | "weak" {
		if (data.length < 5) return "weak";

		const recentData = data.slice(-5); // 最新5データポイント
		let consistentDirection = 0;

		for (const point of recentData) {
			const typicalPrice = (point.high + point.low + point.close) / 3;
			if (typicalPrice > vwap) {
				consistentDirection += 1;
			} else if (typicalPrice < vwap) {
				consistentDirection -= 1;
			}
		}

		const consistency = Math.abs(consistentDirection) / recentData.length;

		if (consistency >= 0.8) return "strong";
		if (consistency >= 0.6) return "moderate";
		return "weak";
	}

	/**
	 * トレンド計算（15分足版）
	 */
	private static calculateTrend(data: IntradayData[], currentVWAP: number): "bullish" | "bearish" | "neutral" {
		if (data.length < 10) return "neutral";

		// 前半と後半でVWAPを比較
		const halfPoint = Math.floor(data.length / 2);
		const earlierData = data.slice(0, halfPoint);

		let totalVolumePrice = 0;
		let totalVolume = 0;

		for (const point of earlierData) {
			const typicalPrice = (point.high + point.low + point.close) / 3;
			totalVolumePrice += typicalPrice * point.volume;
			totalVolume += point.volume;
		}

		const earlierVWAP = totalVolume > 0 ? totalVolumePrice / totalVolume : currentVWAP;
		const change = (currentVWAP - earlierVWAP) / earlierVWAP;

		if (change > 0.02) return "bullish"; // 2%以上の上昇
		if (change < -0.02) return "bearish"; // 2%以上の下落
		return "neutral";
	}

	/**
	 * キャッシュクリア（テスト用）
	 */
	public static clearCache(): void {
		TrueVWAPCalculator.cache.clear();
	}

	/**
	 * 利用可能性チェック
	 * @param date 対象日
	 * @returns 15分足データが利用可能かどうか
	 */
	public static isDataAvailable(date: Date): boolean {
		const now = new Date();
		const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
		return date >= sixtyDaysAgo;
	}

	/**
	 * 複数日の真のVWAP計算
	 * @param symbol 株式シンボル
	 * @param days 日数
	 * @param standardDeviations 標準偏差倍数
	 * @returns 複数日のVWAP結果
	 */
	public static async calculateMultipleDayVWAP(
		symbol: string,
		days: number,
		standardDeviations = 1,
	): Promise<(TrueVWAPResult | null)[]> {
		const results: (TrueVWAPResult | null)[] = [];
		const now = new Date();

		for (let i = 0; i < days; i++) {
			const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			const result = await TrueVWAPCalculator.calculateTrueDailyVWAP(symbol, targetDate, standardDeviations);
			results.push(result);
		}

		return results;
	}
}
