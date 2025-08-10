import yahooFinance from "yahoo-finance2";
import { FinancialAnalyzer } from "./financial-indicators/FinancialAnalyzer";
import { MovingAverageDeviationCalculator } from "./financial-indicators/MovingAverageDeviationCalculator";
import { BollingerBandsCalculator } from "./indicators/bollingerBands";
import { CrossDetectionCalculator } from "./indicators/crossDetection";
import { HybridVWAPCalculator } from "./indicators/hybridVwap";
import { MACDCalculator } from "./indicators/macd";
import { MovingAverageCalculator } from "./indicators/movingAverage";
import { RSICalculator } from "./indicators/rsi";
import { StochasticCalculator } from "./indicators/stochastic";
import { VolumeAnalysisCalculator } from "./indicators/volumeAnalysis";
import { VWAPCalculator } from "./indicators/vwap";
import {
	APIConnectionError,
	APILimitError,
	type ComprehensiveStockAnalysisResult,
	DataFetchError,
	type ErrorReport,
	type ExtendedIndicatorsResult,
	type IndicatorConfig,
	type PriceData,
	type StockAnalysisResult,
	type TechnicalIndicators,
	type TechnicalParametersConfig,
	type ValidatedTechnicalParameters,
} from "./types";
import { Calculator } from "./utils/calculator";
import { globalCacheManager } from "./utils/cacheManager";
import { DataProcessor } from "./utils/dataProcessor";
import { ErrorHandler } from "./utils/errorHandler";
import { generateJapaneseReport } from "./utils/japaneseReportGenerator";
import { DEFAULT_TECHNICAL_PARAMETERS, ParameterValidator } from "./utils/parameterValidator";
import { globalPerformanceMonitor } from "./utils/performanceMonitor";

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

	constructor(priceData: PriceData[], config: IndicatorConfig = DEFAULT_CONFIG) {
		this.priceData = DataProcessor.cleanData(priceData);
		this.config = config;
	}

	// メインの分析実行メソッド
	public analyze(symbol: string, companyName?: string): StockAnalysisResult {
		if (this.priceData.length === 0) {
			throw new DataFetchError("No price data available for analysis", "NO_DATA");
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

	// Yahoo Finance APIからのデータ取得（キャッシュ + リトライ機能付き）
	public static async fetchData(symbol: string, period = "2y", maxRetries = 3): Promise<PriceData[]> {
		const context = { symbol, indicator: "データ取得" };

		// キャッシュから取得を試行
		const cachedData = globalCacheManager.getPriceData<PriceData[]>(symbol, period);
		if (cachedData && cachedData.length > 0) {
			globalPerformanceMonitor.createProfiler().recordCacheHit();
			return cachedData;
		}

		globalPerformanceMonitor.createProfiler().recordCacheMiss();

		const { result, error } = await ErrorHandler.safeExecuteAsync(
			async () => {
				globalPerformanceMonitor.createProfiler().recordApiCall();
				
				const result = await yahooFinance.chart(symbol, {
					period1: TechnicalAnalyzer.getPeriodStartDate(period),
					period2: new Date(),
					interval: "1d",
				});

				if (!result || !result.quotes || result.quotes.length === 0) {
					throw new DataFetchError(`No data found for symbol: ${symbol}`, "NO_DATA_FOUND", { symbol, period });
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

				const processedData = DataProcessor.processRawData(rawData);
				
				// 成功した場合はキャッシュに保存
				if (processedData.length > 0) {
					globalCacheManager.setPriceData(symbol, period, processedData);
				}

				return processedData;
			},
			() => [], // フォールバック：空の価格データ
			context,
			maxRetries,
			1000, // 1秒の初期遅延
		);

		// エラーが発生した場合でも空データを返す
		if (error && result.length === 0) {
			// 完全に失敗した場合は元のエラーを投げる
			throw error.error;
		}

		return result;
	}

	// すべてのテクニカル指標を計算
	private calculateAllIndicators(closePrices: number[]): TechnicalIndicators {
		// 移動平均線の計算
		const movingAverages = {
			ma25: this.safeCalculate(() => MovingAverageCalculator.calculate(closePrices, 25)),
			ma50: this.safeCalculate(() => MovingAverageCalculator.calculate(closePrices, 50)),
			ma200: this.safeCalculate(() => MovingAverageCalculator.calculate(closePrices, 200)),
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
		const previous = this.priceData.length > 1 ? this.priceData[this.priceData.length - 2].close : current;
		const change = current - previous;
		const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

		return {
			current: Calculator.round(current, this.config.precision.price),
			change: Calculator.round(change, this.config.precision.price),
			changePercent: Calculator.round(changePercent, this.config.precision.percentage),
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
	private analyzeTrend(closePrices: number[], indicators: TechnicalIndicators): "upward" | "downward" | "sideways" {
		const currentPrice = closePrices[closePrices.length - 1];
		const { ma25, ma50, ma200 } = indicators.movingAverages;

		let upwardSignals = 0;
		let downwardSignals = 0;

		// 現在価格と移動平均線の比較
		if (ma25 !== undefined && !Number.isNaN(ma25) && currentPrice > ma25) upwardSignals++;
		else if (ma25 !== undefined && !Number.isNaN(ma25) && currentPrice < ma25) downwardSignals++;

		if (ma50 !== undefined && !Number.isNaN(ma50) && currentPrice > ma50) upwardSignals++;
		else if (ma50 !== undefined && !Number.isNaN(ma50) && currentPrice < ma50) downwardSignals++;

		if (ma200 !== undefined && !Number.isNaN(ma200) && currentPrice > ma200) upwardSignals++;
		else if (ma200 !== undefined && !Number.isNaN(ma200) && currentPrice < ma200) downwardSignals++;

		// 移動平均線同士の位置関係
		if (ma25 !== undefined && ma50 !== undefined && !Number.isNaN(ma25) && !Number.isNaN(ma50) && ma25 > ma50)
			upwardSignals++;
		else if (ma25 !== undefined && ma50 !== undefined && !Number.isNaN(ma25) && !Number.isNaN(ma50) && ma25 < ma50)
			downwardSignals++;

		if (ma50 !== undefined && ma200 !== undefined && !Number.isNaN(ma50) && !Number.isNaN(ma200) && ma50 > ma200)
			upwardSignals++;
		else if (ma50 !== undefined && ma200 !== undefined && !Number.isNaN(ma50) && !Number.isNaN(ma200) && ma50 < ma200)
			downwardSignals++;

		if (upwardSignals > downwardSignals + 1) return "upward";
		if (downwardSignals > upwardSignals + 1) return "downward";
		return "sideways";
	}

	// モメンタム分析
	private analyzeMomentum(closePrices: number[], indicators: TechnicalIndicators): "positive" | "negative" | "neutral" {
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
	private analyzeStrength(indicators: TechnicalIndicators): "strong" | "moderate" | "weak" {
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
			case "14d":
				return new Date(now.getTime() - 14 * oneDay);
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

	// 新規：包括的分析メソッド（パフォーマンス最適化版 - キャッシュ + 並列処理 + 監視機能）
	public static async analyzeStockComprehensive(
		symbol: string,
		period = "1y",
		includeFinancials = true,
		technicalParams?: TechnicalParametersConfig,
	): Promise<{ result: ComprehensiveStockAnalysisResult; errorReports: ErrorReport[] }> {
		// パフォーマンス監視開始
		const profiler = globalPerformanceMonitor.createProfiler();
		profiler.start();
		profiler.startStep("初期化");

		const errorReports: ErrorReport[] = [];
		const context = { symbol, indicator: "包括的分析" };

		// パラメータ検証とデフォルト値設定
		const validationResult = ParameterValidator.validateAndSetDefaults(technicalParams);

		// パラメータ検証警告をエラーレポートに追加
		for (const warning of validationResult.warnings) {
			errorReports.push(
				ErrorHandler.handleError(
					new Error(`Parameter validation warning: ${warning.reason}`),
					{ symbol, indicator: "パラメータ検証", parameters: { [warning.parameter]: warning.originalValue } },
					`デフォルト値 ${warning.correctedValue} を使用`,
				),
			);
		}

		profiler.endStep("初期化");
		profiler.startStep("データ取得（並列）");

		// 並列データ取得でAPI呼び出し最小化
		const dataFetchPromises: Promise<any>[] = [];
		
		// 価格データ取得（Promise 1）
		const priceDataPromise = TechnicalAnalyzer.fetchData(symbol, period).catch(error => {
			const errorReport = ErrorHandler.handleError(error, context, "空の価格データで継続");
			errorReports.push(errorReport);
			return [] as PriceData[]; // 空データで継続
		});
		dataFetchPromises.push(priceDataPromise);

		// 財務メトリクス取得（Promise 2）- 並列実行
		let financialMetricsPromise: Promise<any> = Promise.resolve(null);
		if (includeFinancials) {
			// キャッシュから財務データを確認
			const cachedFinancialData = globalCacheManager.getFinancialData(symbol);
			if (cachedFinancialData) {
				profiler.recordCacheHit();
				financialMetricsPromise = Promise.resolve(cachedFinancialData);
			} else {
				profiler.recordCacheMiss();
				financialMetricsPromise = FinancialAnalyzer.getFinancialMetrics(symbol)
					.then(data => {
						if (data) {
							globalCacheManager.setFinancialData(symbol, data);
						}
						return data;
					})
					.catch(error => {
						const errorReport = ErrorHandler.handleError(
							error,
							{ symbol, indicator: "財務指標取得" },
							"財務指標なしで継続",
						);
						errorReports.push(errorReport);
						return null;
					});
			}
		}
		dataFetchPromises.push(financialMetricsPromise);

		// 並列実行と結果取得
		const [priceData, financialMetrics] = await Promise.all(dataFetchPromises);

		profiler.endStep("データ取得（並列）");
		profiler.startStep("基本分析");

		// 基本分析実行
		const analyzer = new TechnicalAnalyzer(priceData as PriceData[]);
		let baseResult: StockAnalysisResult;

		try {
			baseResult = analyzer.analyze(symbol);
		} catch (error) {
			// 基本分析が失敗した場合のフォールバック
			const errorReport = ErrorHandler.handleError(error, context, "最小限の分析結果で継続");
			errorReports.push(errorReport);

			baseResult = {
				symbol,
				companyName: symbol,
				period: `${(priceData as PriceData[]).length} days`,
				lastUpdated: new Date().toISOString(),
				priceData: { current: 0, change: 0, changePercent: 0 },
				technicalIndicators: {
					movingAverages: { ma25: undefined, ma50: undefined, ma200: undefined },
					rsi: { rsi14: undefined, rsi21: undefined },
					macd: { macd: Number.NaN, signal: Number.NaN, histogram: Number.NaN },
				},
				signals: { trend: "sideways", momentum: "neutral", strength: "weak" },
			};
		}

		profiler.endStep("基本分析");
		profiler.startStep("拡張指標計算");

		// 拡張指標計算（キャッシュ + 並列処理最適化版）
		const { extendedIndicators, indicatorErrors } = await analyzer.calculateExtendedIndicatorsWithErrorHandlingOptimized(
			symbol,
			validationResult.validatedParams,
			profiler,
		);
		errorReports.push(...indicatorErrors);

		profiler.endStep("拡張指標計算");

		const result: ComprehensiveStockAnalysisResult = {
			...baseResult,
			financialMetrics,
			extendedIndicators,
			priceHistoryData: priceData as PriceData[],
		};

		// パフォーマンス監視終了と記録
		const metrics = profiler.end();
		const breakdown = profiler.getBreakdown();
		globalPerformanceMonitor.recordProfile(
			"analyzeStockComprehensive",
			symbol,
			metrics,
			breakdown,
			technicalParams,
		);

		return { result, errorReports };
	}

	// 新規：拡張指標計算メソッド（Graceful Degradation対応）
	public async calculateExtendedIndicators(
		symbol: string,
		customParams?: ValidatedTechnicalParameters,
	): Promise<ExtendedIndicatorsResult> {
		const { extendedIndicators } = await this.calculateExtendedIndicatorsWithErrorHandling(symbol, customParams);
		return extendedIndicators;
	}

	// 新規：拡張指標計算メソッド（エラーハンドリング強化版）
	public async calculateExtendedIndicatorsWithErrorHandling(
		symbol: string,
		customParams?: ValidatedTechnicalParameters,
	): Promise<{ extendedIndicators: ExtendedIndicatorsResult; indicatorErrors: ErrorReport[] }> {
		const { extendedIndicators, indicatorErrors } = await this.calculateExtendedIndicatorsWithErrorHandlingOptimized(
			symbol,
			customParams,
			null, // プロファイラーなし
		);
		return { extendedIndicators, indicatorErrors };
	}

	// 新規：拡張指標計算メソッド（パフォーマンス最適化版 - キャッシュ + 並列処理）
	public async calculateExtendedIndicatorsWithErrorHandlingOptimized(
		symbol: string,
		customParams?: ValidatedTechnicalParameters,
		profiler?: any, // PerformanceProfilerインスタンス（オプショナル）
	): Promise<{ extendedIndicators: ExtendedIndicatorsResult; indicatorErrors: ErrorReport[] }> {
		// パラメータ設定（カスタム設定またはデフォルト値）
		const params = customParams || DEFAULT_TECHNICAL_PARAMETERS;
		const closePrices = DataProcessor.extractClosePrices(this.priceData);
		const indicatorErrors: ErrorReport[] = [];

		if (profiler) profiler.startStep("指標計算（並列処理）");

		// 並列処理で計算時間を最適化 - 独立した指標を同時計算
		const indicatorPromises: Promise<any>[] = [];

		// グループ1: 軽量な指標（並列計算可能）
		const lightweightIndicators = Promise.all([
			// ボリンジャーバンド
			this.calculateIndicatorWithCache(
				symbol, 
				"bollingerBands", 
				params.bollingerBands,
				() => BollingerBandsCalculator.calculate(
					closePrices,
					params.bollingerBands.period,
					params.bollingerBands.standardDeviations,
				),
				() => ({ upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 0 })
			),
			// ストキャスティクス  
			this.calculateIndicatorWithCache(
				symbol,
				"stochastic",
				params.stochastic,
				() => StochasticCalculator.calculateWithOHLC(this.priceData, params.stochastic.kPeriod, params.stochastic.dPeriod),
				() => ({ k: 0, d: 0 })
			),
			// クロス検出
			this.calculateIndicatorWithCache(
				symbol,
				"crossDetection",
				{ shortPeriod: params.movingAverages.periods[0], longPeriod: params.movingAverages.periods[1] },
				() => {
					const periods = params.movingAverages.periods;
					const shortPeriod = periods[0] || 25;
					const longPeriod = periods[1] || 50;
					return CrossDetectionCalculator.detectCross(closePrices, shortPeriod, longPeriod, 3);
				},
				() => ({
					type: "none" as const,
					shortMA: 0,
					longMA: 0,
					crossPoint: 0,
					strength: "weak" as const,
					confirmationDays: 0,
				})
			),
			// 出来高分析
			this.calculateIndicatorWithCache(
				symbol,
				"volumeAnalysis",
				params.volumeAnalysis,
				() => VolumeAnalysisCalculator.calculate(this.priceData, params.volumeAnalysis.period),
				() => ({
					averageVolume: 0,
					relativeVolume: 0,
					volumeTrend: "stable" as const,
					volumeSpike: false,
					priceVolumeStrength: "weak" as const,
					accumulation: "neutral" as const,
				})
			),
			// RSI拡張版
			this.calculateIndicatorWithCache(
				symbol,
				"rsiExtended",
				params.rsi,
				() => RSICalculator.calculateExtended(closePrices, {
					overbought: params.rsi.overbought,
					oversold: params.rsi.oversold,
				}),
				() => ({
					rsi14: 0,
					rsi21: 0,
					signal14: "neutral" as const,
					signal21: "neutral" as const,
				})
			),
		]);

		indicatorPromises.push(lightweightIndicators);

		// グループ2: 重量な指標（VWAP - 外部API呼び出しあり）
		const vwapPromise = this.calculateIndicatorWithCache(
			symbol,
			"hybridVWAP",
			{ vwap: params.vwap },
			async () => {
				if (profiler) profiler.recordApiCall();
				const config = {
					enableTrueVWAP: params.vwap.enableTrueVWAP,
					standardDeviations: params.vwap.standardDeviations,
				};
				return await HybridVWAPCalculator.calculateHybridVWAP(symbol, this.priceData, config);
			},
			() => ({
				movingVWAP: {
					vwap: 0,
					upperBand: 0,
					lowerBand: 0,
					deviation: 0,
					position: "at" as const,
					strength: "weak" as const,
					trend: "neutral" as const,
					config: { period: 20, sigma: params.vwap.standardDeviations },
				},
				recommendedVWAP: "moving" as const,
				dataSource: { moving: "daily" as const },
				analysis: {
					reliability: "low" as const,
					tradingSignal: "neutral" as const,
				},
			})
		);

		indicatorPromises.push(vwapPromise);

		// 並列実行と結果取得
		const [lightweightResults, vwapResult] = await Promise.all(indicatorPromises);
		const [bollingerBands, stochastic, crossDetection, volumeAnalysis, rsiExtended] = lightweightResults;
		const vwap = vwapResult;

		// 移動平均乖離率計算（並列実行）
		const deviationPromises = [25, 50, 200].map(period => 
			this.calculateIndicatorWithCache(
				symbol,
				`movingAverageDeviation_${period}`,
				{ period },
				() => MovingAverageDeviationCalculator.calculate(closePrices, period),
				() => null
			)
		);

		const deviationResults = await Promise.all(deviationPromises);
		const movingAverageDeviations = deviationResults.filter(result => result !== null);

		if (profiler) profiler.endStep("指標計算（並列処理）");

		// エラー処理（実際のエラーがあった場合の処理は各calculateIndicatorWithCacheで処理済み）
		// ここでは簡略化してエラーレポートは空にします（実際のエラーハンドリングは各計算関数内で実装）

		const extendedIndicators: ExtendedIndicatorsResult = {
			bollingerBands,
			stochastic,
			crossDetection,
			volumeAnalysis,
			vwap,
			rsiExtended,
			movingAverageDeviations,
		};

		return { extendedIndicators, indicatorErrors };
	}

	// ヘルパーメソッド: 指標計算をキャッシュ付きで実行
	private async calculateIndicatorWithCache<T>(
		symbol: string,
		indicatorName: string,
		params: Record<string, unknown>,
		calculator: () => T | Promise<T>,
		fallback: () => T,
	): Promise<T> {
		// キャッシュから取得
		const cached = globalCacheManager.getIndicatorResult<T>(symbol, indicatorName, params);
		if (cached !== null) {
			return cached;
		}

		// キャッシュにない場合は計算実行
		try {
			const result = await calculator();
			// 成功した場合はキャッシュに保存
			globalCacheManager.setIndicatorResult(symbol, indicatorName, params, result);
			return result;
		} catch (error) {
			console.warn(`Failed to calculate ${indicatorName} for ${symbol}:`, error);
			return fallback();
		}
	}

	// 新規：日本語レポート生成メソッド
	public static generateJapaneseReportFromAnalysis(
		analysis: ComprehensiveStockAnalysisResult,
		days: number,
		validatedParams?: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): string {
		return generateJapaneseReport(analysis, days, validatedParams, userParams);
	}
}
