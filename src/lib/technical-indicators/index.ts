// メインエクスポート
export { TechnicalAnalyzer } from "./technicalAnalyzer";

// 型定義エクスポート
export type {
	PriceData,
	TechnicalIndicators,
	StockAnalysisResult,
	IndicatorConfig,
} from "./types";

// 個別指標計算機エクスポート
export { MovingAverageCalculator } from "./indicators/movingAverage";
export { RSICalculator } from "./indicators/rsi";
export { MACDCalculator } from "./indicators/macd";
export type { MACDResult } from "./indicators/macd";

// Phase2 拡張指標エクスポート
export { BollingerBandsCalculator } from "./indicators/bollingerBands";
export type { BollingerBandsResult } from "./indicators/bollingerBands";
export { StochasticCalculator } from "./indicators/stochastic";
export type { StochasticResult } from "./indicators/stochastic";
export { CrossDetectionCalculator } from "./indicators/crossDetection";
export type { CrossDetectionResult } from "./indicators/crossDetection";
export { VolumeAnalysisCalculator } from "./indicators/volumeAnalysis";
export type { VolumeAnalysisResult } from "./indicators/volumeAnalysis";
export { VWAPCalculator } from "./indicators/vwap";
export type { VWAPResult } from "./indicators/vwap";

// 財務指標ライブラリエクスポート（Phase3）
export { FinancialAnalyzer } from "./financial-indicators/FinancialAnalyzer";
export { MovingAverageDeviationCalculator } from "./financial-indicators/MovingAverageDeviationCalculator";
export type {
	FinancialMetricsResult,
	MovingAverageDeviationResult,
	RSIExtendedResult,
	DeviationSignal,
	RSILevels,
	FinancialCalculationOptions,
} from "./financial-indicators/types";
export { FinancialDataError } from "./financial-indicators/types";

// ユーティリティエクスポート
export { Calculator } from "./utils/calculator";
export { DataProcessor } from "./utils/dataProcessor";
export { ValidationUtils } from "./utils/validation";

// エラークラスエクスポート
export {
	TechnicalIndicatorError,
	DataFetchError,
	CalculationError,
	ValidationError,
} from "./types";
