import type {
	FinancialMetricsResult,
	MovingAverageDeviationResult,
	RSIExtendedResult,
} from "./financial-indicators/types";
// インポート
import type { BollingerBandsResult } from "./indicators/bollingerBands";
import type { CrossDetectionResult } from "./indicators/crossDetection";
import type { StochasticResult } from "./indicators/stochastic";
import type { VolumeAnalysisResult } from "./indicators/volumeAnalysis";
import type { VWAPResult } from "./indicators/vwap";

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

// 技術指標パラメータ設定用インターフェース（MCP Tool用）
export interface TechnicalParametersConfig {
	movingAverages?: {
		periods?: number[]; // デフォルト[25, 50, 200]
	};
	rsi?: {
		periods?: number[]; // デフォルト[14, 21]
		overbought?: number; // デフォルト70
		oversold?: number; // デフォルト30
	};
	macd?: {
		fastPeriod?: number; // デフォルト12
		slowPeriod?: number; // デフォルト26
		signalPeriod?: number; // デフォルト9
	};
	bollingerBands?: {
		period?: number; // デフォルト20
		standardDeviations?: number; // デフォルト2
	};
	stochastic?: {
		kPeriod?: number; // デフォルト14
		dPeriod?: number; // デフォルト3
		overbought?: number; // デフォルト80
		oversold?: number; // デフォルト20
	};
	volumeAnalysis?: {
		period?: number; // デフォルト20
		spikeThreshold?: number; // デフォルト2.0
	};
	vwap?: {
		enableTrueVWAP?: boolean; // デフォルトtrue（15分足ベース）
		standardDeviations?: number; // デフォルト1
	};
	mvwap?: {
		period?: number; // デフォルト20（移動期間）
		standardDeviations?: number; // デフォルト1
	};
}

// 検証済みパラメータ設定（内部処理用）
export interface ValidatedTechnicalParameters {
	movingAverages: {
		periods: number[];
	};
	rsi: {
		periods: number[];
		overbought: number;
		oversold: number;
	};
	macd: {
		fastPeriod: number;
		slowPeriod: number;
		signalPeriod: number;
	};
	bollingerBands: {
		period: number;
		standardDeviations: number;
	};
	stochastic: {
		kPeriod: number;
		dPeriod: number;
		overbought: number;
		oversold: number;
	};
	volumeAnalysis: {
		period: number;
		spikeThreshold: number;
	};
	vwap: {
		enableTrueVWAP: boolean;
		standardDeviations: number;
	};
	mvwap: {
		period: number;
		standardDeviations: number;
	};
}

// パラメータ警告情報
export interface ParameterWarning {
	parameter: string;
	originalValue: number | number[] | boolean | string;
	correctedValue: number | number[] | boolean | string;
	reason: string;
}

// パラメータ検証結果
export interface ParameterValidationResult {
	validatedParams: ValidatedTechnicalParameters;
	warnings: ParameterWarning[];
	hasCustomSettings: boolean;
}

// VWAP拡張結果（真のVWAPと移動VWAP）
export interface VWAPAnalysisResult {
	trueDailyVWAP?: VWAPResult; // 15分足ベースの真の1日VWAP
	movingVWAP: VWAPResult; // 従来の移動VWAP
	recommendedVWAP: "daily" | "moving"; // 推奨指標
	dataSource: {
		daily?: "15min" | "unavailable";
		moving: "daily";
	};
}

// MCP Tool引数の拡張型
export interface StockAnalysisRequest {
	symbol: string; // 既存（必須）
	days?: number; // 既存（オプション、デフォルト7）
	technicalParams?: TechnicalParametersConfig; // 新規追加
}

// 拡張指標結果型（spike_all_features.ts の全機能対応）
export interface ExtendedIndicatorsResult {
	// Phase2 拡張指標
	bollingerBands: BollingerBandsResult;
	stochastic: StochasticResult;
	crossDetection: CrossDetectionResult;
	volumeAnalysis: VolumeAnalysisResult;
	vwap: VWAPResult;

	// Phase3 財務拡張指標
	rsiExtended: RSIExtendedResult;
	movingAverageDeviations: MovingAverageDeviationResult[];
}

// パラメータ化対応版の拡張指標結果型（将来用）
export interface ParameterizedExtendedIndicatorsResult {
	// Phase2 拡張指標（設定情報付き）
	bollingerBands: BollingerBandsResult & { config: { period: number; sigma: number } };
	stochastic: StochasticResult & { config: { kPeriod: number; dPeriod: number; overbought: number; oversold: number } };
	crossDetection: CrossDetectionResult;
	volumeAnalysis: VolumeAnalysisResult & { config: { period: number; spikeThreshold: number } };
	vwap: VWAPAnalysisResult; // 拡張版VWAP

	// Phase3 財務拡張指標（設定情報付き）
	rsiExtended: RSIExtendedResult & { config: { periods: number[]; overbought: number; oversold: number } };
	movingAverageDeviations: (MovingAverageDeviationResult & { period: number })[];
}

// 包括的分析結果型
export interface ComprehensiveStockAnalysisResult extends StockAnalysisResult {
	// 財務指標
	financialMetrics: FinancialMetricsResult | null;

	// 拡張テクニカル指標
	extendedIndicators: ExtendedIndicatorsResult;

	// 価格推移データ（レポート生成用）
	priceHistoryData: PriceData[];
}
