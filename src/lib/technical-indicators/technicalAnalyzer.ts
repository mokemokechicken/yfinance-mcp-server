import yahooFinance from "yahoo-finance2";
import { MACDCalculator } from "./indicators/macd";
import { MovingAverageCalculator } from "./indicators/movingAverage";
import { RSICalculator } from "./indicators/rsi";
import {
	DataFetchError,
	type IndicatorConfig,
	type PriceData,
	type StockAnalysisResult,
	type TechnicalIndicators,
} from "./types";
import { Calculator } from "./utils/calculator";
import { DataProcessor } from "./utils/dataProcessor";

// デフォルト設定
const DEFAULT_CONFIG: IndicatorConfig = {
	movingAverages: {
		periods: [25, 50, 200],
	},
	rsi: {
		periods: [14, 21],
	},
	macd: {
		fastPeriod: 12,
		slowPeriod: 26,
		signalPeriod: 9,
	},
	precision: {
		price: 2,
		indicator: 3,
		percentage: 2,
	},
};

export class TechnicalAnalyzer {
	private priceData: PriceData[];
	private config: IndicatorConfig;

	constructor(
		priceData: PriceData[],
		config: IndicatorConfig = DEFAULT_CONFIG,
	) {
		this.priceData = DataProcessor.cleanData(priceData);
		this.config = config;
	}

	// メインの分析実行メソッド
	public analyze(symbol: string, companyName?: string): StockAnalysisResult {
		if (this.priceData.length === 0) {
			throw new DataFetchError(
				"No price data available for analysis",
				"NO_DATA",
			);
		}

		// 終値データの抽出
		const closePrices = DataProcessor.extractClosePrices(this.priceData);

		// 各指標の計算
		const technicalIndicators = this.calculateAllIndicators(closePrices);

		// 現在価格情報の取得
		const currentPriceInfo = this.getCurrentPriceInfo();

		// シグナル判定
		const signals = this.analyzeSignals(closePrices, technicalIndicators);

		return {
			symbol,
			companyName: companyName || symbol,
			period: `${this.priceData.length} days`,
			lastUpdated: new Date().toISOString(),
			priceData: currentPriceInfo,
			technicalIndicators,
			signals,
		};
	}

	// Yahoo Finance APIからのデータ取得
	public static async fetchData(
		symbol: string,
		period = "1y",
	): Promise<PriceData[]> {
		try {
			const result = await yahooFinance.chart(symbol, {
				period1: TechnicalAnalyzer.getPeriodStartDate(period),
				period2: new Date(),
				interval: "1d",
			});

			if (!result || !result.quotes || result.quotes.length === 0) {
				throw new DataFetchError(
					`No data found for symbol: ${symbol}`,
					"NO_DATA_FOUND",
				);
			}

			// Yahoo Finance chart API形式を内部形式に変換
			const rawData = result.quotes.map((item) => ({
				date: item.date,
				open: item.open ?? 0,
				high: item.high ?? 0,
				low: item.low ?? 0,
				close: item.close ?? 0,
				volume: item.volume ?? 0,
			}));

			return DataProcessor.processRawData(rawData);
		} catch (error: unknown) {
			if (error instanceof DataFetchError) {
				throw error;
			}
			throw new DataFetchError(
				`Failed to fetch data for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`,
				"FETCH_ERROR",
			);
		}
	}

	// すべてのテクニカル指標を計算
	private calculateAllIndicators(closePrices: number[]): TechnicalIndicators {
		// 移動平均線の計算
		const movingAverages = {
			ma25: this.safeCalculate(() =>
				MovingAverageCalculator.calculate(closePrices, 25),
			),
			ma50: this.safeCalculate(() =>
				MovingAverageCalculator.calculate(closePrices, 50),
			),
			ma200: this.safeCalculate(() =>
				MovingAverageCalculator.calculate(closePrices, 200),
			),
		};

		// RSIの計算
		const rsi = {
			rsi14: this.safeCalculate(() => RSICalculator.calculate(closePrices, 14)),
			rsi21: this.safeCalculate(() => RSICalculator.calculate(closePrices, 21)),
		};

		// MACDの計算
		const macdResult = this.safeCalculate(() =>
			MACDCalculator.calculate(
				closePrices,
				this.config.macd.fastPeriod,
				this.config.macd.slowPeriod,
				this.config.macd.signalPeriod,
			),
		) || { macd: Number.NaN, signal: Number.NaN, histogram: Number.NaN };

		return {
			movingAverages,
			rsi,
			macd: macdResult,
		};
	}

	// 現在価格情報の取得
	private getCurrentPriceInfo() {
		if (this.priceData.length === 0) {
			return {
				current: 0,
				change: 0,
				changePercent: 0,
			};
		}

		const current = this.priceData[this.priceData.length - 1].close;
		const previous =
			this.priceData.length > 1
				? this.priceData[this.priceData.length - 2].close
				: current;
		const change = current - previous;
		const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

		return {
			current: Calculator.round(current, this.config.precision.price),
			change: Calculator.round(change, this.config.precision.price),
			changePercent: Calculator.round(
				changePercent,
				this.config.precision.percentage,
			),
		};
	}

	// シグナル分析
	private analyzeSignals(
		closePrices: number[],
		indicators: TechnicalIndicators,
	): {
		trend: "upward" | "downward" | "sideways";
		momentum: "positive" | "negative" | "neutral";
		strength: "strong" | "moderate" | "weak";
	} {
		// トレンド判定（移動平均線ベース）
		const trend = this.analyzeTrend(closePrices, indicators);

		// モメンタム判定（RSI + MACDベース）
		const momentum = this.analyzeMomentum(closePrices, indicators);

		// 強度判定（複合指標）
		const strength = this.analyzeStrength(indicators);

		return { trend, momentum, strength };
	}

	// トレンド分析
	private analyzeTrend(
		closePrices: number[],
		indicators: TechnicalIndicators,
	): "upward" | "downward" | "sideways" {
		const currentPrice = closePrices[closePrices.length - 1];
		const { ma25, ma50, ma200 } = indicators.movingAverages;

		let upwardSignals = 0;
		let downwardSignals = 0;

		// 現在価格と移動平均線の比較
		if (ma25 !== undefined && !Number.isNaN(ma25) && currentPrice > ma25)
			upwardSignals++;
		else if (ma25 !== undefined && !Number.isNaN(ma25) && currentPrice < ma25)
			downwardSignals++;

		if (ma50 !== undefined && !Number.isNaN(ma50) && currentPrice > ma50)
			upwardSignals++;
		else if (ma50 !== undefined && !Number.isNaN(ma50) && currentPrice < ma50)
			downwardSignals++;

		if (ma200 !== undefined && !Number.isNaN(ma200) && currentPrice > ma200)
			upwardSignals++;
		else if (
			ma200 !== undefined &&
			!Number.isNaN(ma200) &&
			currentPrice < ma200
		)
			downwardSignals++;

		// 移動平均線同士の位置関係
		if (
			ma25 !== undefined &&
			ma50 !== undefined &&
			!Number.isNaN(ma25) &&
			!Number.isNaN(ma50) &&
			ma25 > ma50
		)
			upwardSignals++;
		else if (
			ma25 !== undefined &&
			ma50 !== undefined &&
			!Number.isNaN(ma25) &&
			!Number.isNaN(ma50) &&
			ma25 < ma50
		)
			downwardSignals++;

		if (
			ma50 !== undefined &&
			ma200 !== undefined &&
			!Number.isNaN(ma50) &&
			!Number.isNaN(ma200) &&
			ma50 > ma200
		)
			upwardSignals++;
		else if (
			ma50 !== undefined &&
			ma200 !== undefined &&
			!Number.isNaN(ma50) &&
			!Number.isNaN(ma200) &&
			ma50 < ma200
		)
			downwardSignals++;

		if (upwardSignals > downwardSignals + 1) return "upward";
		if (downwardSignals > upwardSignals + 1) return "downward";
		return "sideways";
	}

	// モメンタム分析
	private analyzeMomentum(
		closePrices: number[],
		indicators: TechnicalIndicators,
	): "positive" | "negative" | "neutral" {
		let positiveSignals = 0;
		let negativeSignals = 0;

		// RSI分析
		const { rsi14, rsi21 } = indicators.rsi;
		if (rsi14 !== undefined && !Number.isNaN(rsi14)) {
			if (rsi14 > 50) positiveSignals++;
			else negativeSignals++;
		}

		// MACD分析
		const { macd, signal, histogram } = indicators.macd;
		if (!Number.isNaN(macd) && !Number.isNaN(signal)) {
			if (macd > signal) positiveSignals++;
			else negativeSignals++;
		}

		if (!Number.isNaN(histogram)) {
			if (histogram > 0) positiveSignals++;
			else negativeSignals++;
		}

		if (positiveSignals > negativeSignals) return "positive";
		if (negativeSignals > positiveSignals) return "negative";
		return "neutral";
	}

	// 強度分析
	private analyzeStrength(
		indicators: TechnicalIndicators,
	): "strong" | "moderate" | "weak" {
		const { rsi14 } = indicators.rsi;
		const { histogram } = indicators.macd;

		let strengthScore = 0;

		// RSIの極端な値
		if (rsi14 !== undefined && !Number.isNaN(rsi14)) {
			if (rsi14 >= 70 || rsi14 <= 30) strengthScore += 2;
			else if (rsi14 >= 60 || rsi14 <= 40) strengthScore += 1;
		}

		// MACDヒストグラムの大きさ
		if (!Number.isNaN(histogram)) {
			const histAbs = Math.abs(histogram);
			if (histAbs > 1) strengthScore += 2;
			else if (histAbs > 0.5) strengthScore += 1;
		}

		if (strengthScore >= 3) return "strong";
		if (strengthScore >= 1) return "moderate";
		return "weak";
	}

	// 安全な計算実行（エラーハンドリング）
	private safeCalculate<T>(calculation: () => T): T | undefined {
		try {
			return calculation();
		} catch (error) {
			console.warn("Calculation failed:", error);
			return undefined;
		}
	}

	// 期間文字列から開始日を計算
	private static getPeriodStartDate(period: string): Date {
		const now = new Date();
		const oneDay = 24 * 60 * 60 * 1000;

		switch (period.toLowerCase()) {
			case "1d":
				return new Date(now.getTime() - oneDay);
			case "5d":
				return new Date(now.getTime() - 5 * oneDay);
			case "1mo":
				return new Date(now.getTime() - 30 * oneDay);
			case "3mo":
				return new Date(now.getTime() - 90 * oneDay);
			case "6mo":
				return new Date(now.getTime() - 180 * oneDay);
			case "1y":
				return new Date(now.getTime() - 365 * oneDay);
			case "2y":
				return new Date(now.getTime() - 730 * oneDay);
			case "5y":
				return new Date(now.getTime() - 1825 * oneDay);
			case "10y":
				return new Date(now.getTime() - 3650 * oneDay);
			default:
				return new Date(now.getTime() - 365 * oneDay); // デフォルト1年
		}
	}

	// 便利な静的メソッド：データ取得と分析を一度に実行
	public static async analyzeStock(
		symbol: string,
		period = "1y",
		config?: IndicatorConfig,
	): Promise<StockAnalysisResult> {
		const priceData = await TechnicalAnalyzer.fetchData(symbol, period);
		const analyzer = new TechnicalAnalyzer(priceData, config);
		return analyzer.analyze(symbol);
	}
}
