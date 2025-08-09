// 価格データの型
export interface PriceData {
	date: Date;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

// テクニカル指標の結果型
export interface TechnicalIndicators {
	movingAverages: {
		ma25: number | undefined;
		ma50: number | undefined;
		ma200: number | undefined;
	};
	rsi: {
		rsi14: number | undefined;
		rsi21: number | undefined;
	};
	macd: {
		macd: number;
		signal: number;
		histogram: number;
	};
}

// 最終出力型
export interface StockAnalysisResult {
	symbol: string;
	companyName: string;
	period: string;
	lastUpdated: string;
	priceData: {
		current: number;
		change: number;
		changePercent: number;
	};
	technicalIndicators: TechnicalIndicators;
	signals: {
		trend: "upward" | "downward" | "sideways";
		momentum: "positive" | "negative" | "neutral";
		strength: "strong" | "moderate" | "weak";
	};
}

// エラー関連の型
export class TechnicalIndicatorError extends Error {
	constructor(
		message: string,
		public code: string,
	) {
		super(message);
	}
}

export class DataFetchError extends TechnicalIndicatorError {}
export class CalculationError extends TechnicalIndicatorError {}
export class ValidationError extends TechnicalIndicatorError {}

// 設定用の型
export interface IndicatorConfig {
	movingAverages: {
		periods: number[];
	};
	rsi: {
		periods: number[];
	};
	macd: {
		fastPeriod: number;
		slowPeriod: number;
		signalPeriod: number;
	};
	precision: {
		price: number;
		indicator: number;
		percentage: number;
	};
}

// 拡張指標結果型（spike_all_features.ts の全機能対応）
export interface ExtendedIndicatorsResult {
	// Phase2 拡張指標
	bollingerBands: import("./indicators/bollingerBands").BollingerBandsResult;
	stochastic: import("./indicators/stochastic").StochasticResult;
	crossDetection: import("./indicators/crossDetection").CrossDetectionResult;
	volumeAnalysis: import("./indicators/volumeAnalysis").VolumeAnalysisResult;
	vwap: import("./indicators/vwap").VWAPResult;

	// Phase3 財務拡張指標
	rsiExtended: import("./financial-indicators/types").RSIExtendedResult;
	movingAverageDeviations: import("./financial-indicators/types").MovingAverageDeviationResult[];
}

// 包括的分析結果型
export interface ComprehensiveStockAnalysisResult extends StockAnalysisResult {
	// 財務指標
	financialMetrics:
		| import("./financial-indicators/types").FinancialMetricsResult
		| null;

	// 拡張テクニカル指標
	extendedIndicators: ExtendedIndicatorsResult;
}
