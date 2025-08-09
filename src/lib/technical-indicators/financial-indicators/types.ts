/**
 * 財務指標拡張機能 - 型定義
 */

// 財務指標結果型
export interface FinancialMetricsResult {
	symbol: string;
	companyName?: string;
	marketCap?: number; // 時価総額
	trailingPE?: number; // PER（実績）
	forwardPE?: number; // PER（予想）
	priceToBook?: number; // PBR
	returnOnEquity?: number; // ROE
	earningsGrowth?: number; // EPS成長率
	dividendYield?: number; // 配当利回り（%変換済み）
	equityRatio?: number; // 自己資本比率（計算）
	lastUpdated: string;
	dataSource: "yahoo-finance";
}

// 移動平均乖離率結果型
export interface MovingAverageDeviationResult {
	period: number; // 期間（25, 50, 200）
	currentPrice: number;
	movingAverage: number;
	deviation: number; // 乖離率（%）
	deviationDirection: "positive" | "negative";
}

// RSI拡張結果型
export interface RSIExtendedResult {
	rsi14: number; // 14日RSI
	rsi21: number; // 21日RSI
	signal14: "overbought" | "oversold" | "neutral";
	signal21: "overbought" | "oversold" | "neutral";
}

// Yahoo Finance API quoteSummary レスポンス型
export interface QuoteSummaryResult {
	price?: {
		marketCap?: number;
		shortName?: string;
	};
	summaryDetail?: {
		trailingPE?: number;
		dividendYield?: number;
	};
	defaultKeyStatistics?: {
		forwardPE?: number;
		priceToBook?: number;
	};
	financialData?: {
		returnOnEquity?: number;
		earningsGrowth?: number;
	};
	balanceSheetHistory?: {
		balanceSheetStatements?: Array<{
			totalStockholderEquity?: number;
			totalAssets?: number;
		}>;
	};
}

// 財務指標取得で使用するmodules
export const FINANCIAL_MODULES = [
	"price",
	"summaryDetail",
	"defaultKeyStatistics",
	"financialData",
	"balanceSheetHistory",
] as const;

export type FinancialModule = (typeof FINANCIAL_MODULES)[number];

// エラー型定義
export class FinancialDataError extends Error {
	constructor(
		message: string,
		public symbol: string,
		public errorType: "api_error" | "data_missing" | "calculation_error",
	) {
		super(message);
		this.name = "FinancialDataError";
	}
}

// 移動平均乖離率シグナル型
export type DeviationSignal =
	| "strong_above" // 大きく上振れ（+10%以上）
	| "above" // 上振れ（+5%以上）
	| "neutral" // 正常範囲（±5%以内）
	| "below" // 下振れ（-5%以下）
	| "strong_below"; // 大きく下振れ（-10%以下）

// RSI判定レベル
export interface RSILevels {
	overbought: number; // 買われすぎ（デフォルト70）
	oversold: number; // 売られすぎ（デフォルト30）
}

// 財務指標計算オプション
export interface FinancialCalculationOptions {
	// 移動平均乖離率の計算期間
	deviationPeriods?: number[];
	// RSI計算期間
	rsiPeriods?: number[];
	// RSI判定レベル
	rsiLevels?: RSILevels;
	// APIタイムアウト（ミリ秒）
	apiTimeout?: number;
}

// デフォルト設定
export const DEFAULT_FINANCIAL_OPTIONS: Required<FinancialCalculationOptions> = {
	deviationPeriods: [25, 50, 200],
	rsiPeriods: [14, 21],
	rsiLevels: {
		overbought: 70,
		oversold: 30,
	},
	apiTimeout: 5000,
};
