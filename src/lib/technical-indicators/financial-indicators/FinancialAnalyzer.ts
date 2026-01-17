/**
 * 財務指標分析クラス
 * Yahoo Finance APIを使用して企業の財務指標を取得・計算
 */

import yahooFinance from "../../yahooFinanceClient";
import type { FINANCIAL_MODULES, FinancialDataError, FinancialMetricsResult, QuoteSummaryResult } from "./types.js";

export class FinancialAnalyzer {
	/**
	 * 財務指標を取得
	 * @param symbol 銘柄コード
	 * @returns 財務指標結果
	 */
	static async getFinancialMetrics(symbol: string): Promise<FinancialMetricsResult> {
		try {
			// quoteSummary APIで必要なmodulesを一括取得
			const modules = ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "balanceSheetHistory"];

			const quoteSummary = await yahooFinance.quoteSummary(symbol, {
				modules: modules as (
					| "price"
					| "summaryDetail"
					| "defaultKeyStatistics"
					| "financialData"
					| "balanceSheetHistory"
				)[],
			});

			// 基本情報の取得
			const result: FinancialMetricsResult = {
				symbol,
				companyName: quoteSummary.price?.shortName || undefined,
				lastUpdated: new Date().toISOString(),
				dataSource: "yahoo-finance",
			};

			// 時価総額
			if (quoteSummary.price?.marketCap) {
				result.marketCap = quoteSummary.price.marketCap;
			}

			// PER（実績）
			if (quoteSummary.summaryDetail?.trailingPE) {
				result.trailingPE = quoteSummary.summaryDetail.trailingPE;
			}

			// PER（予想）- フェールバック実装
			result.forwardPE = quoteSummary.defaultKeyStatistics?.forwardPE ?? quoteSummary.summaryDetail?.forwardPE;

			// PBR
			if (quoteSummary.defaultKeyStatistics?.priceToBook) {
				result.priceToBook = quoteSummary.defaultKeyStatistics.priceToBook;
			}

			// ROE（%変換）
			if (quoteSummary.financialData?.returnOnEquity != null) {
				result.returnOnEquity = quoteSummary.financialData.returnOnEquity * 100;
			}

			// EPS成長率
			if (quoteSummary.financialData?.earningsGrowth) {
				result.earningsGrowth = quoteSummary.financialData.earningsGrowth;
			}

			// 配当利回り（%変換）- フェールバック実装
			const dividendYield =
				quoteSummary.summaryDetail?.dividendYield ?? quoteSummary.summaryDetail?.trailingAnnualDividendYield;
			if (dividendYield != null) {
				result.dividendYield = dividendYield * 100;
			}

			// 自己資本比率（計算）
			result.equityRatio = FinancialAnalyzer.calculateEquityRatio(quoteSummary);

			return result;
		} catch (error: unknown) {
			FinancialAnalyzer.handleQuoteSummaryError(error, symbol);
			throw error; // TypeScriptのflow analysisのため
		}
	}

	/**
	 * 自己資本比率を計算
	 * 計算式: 総株主資本 / 総資産 × 100
	 */
	private static calculateEquityRatio(quoteSummary: unknown): number | undefined {
		try {
			// Type guard for the quoteSummary object
			if (!quoteSummary || typeof quoteSummary !== "object") {
				return undefined;
			}

			// biome-ignore lint/suspicious/noExplicitAny: Yahoo Finance API型が複雑なため
			const summary = quoteSummary as Record<string, any>;
			const balanceSheet =
				// biome-ignore lint/suspicious/noExplicitAny: Yahoo Finance API型が複雑なため
				(summary.balanceSheetHistory as any)?.balanceSheetStatements?.[0];

			if (!balanceSheet?.totalStockholderEquity || !balanceSheet?.totalAssets) {
				return undefined;
			}

			// Yahoo Finance APIの値は数値または{raw: number, fmt: string}オブジェクト
			const extractNumber = (value: unknown): number | undefined => {
				if (typeof value === "number") {
					return value;
				}
				if (value && typeof value === "object" && "raw" in value) {
					const raw = (value as { raw: unknown }).raw;
					return typeof raw === "number" ? raw : undefined;
				}
				return undefined;
			};

			const equity = extractNumber(balanceSheet.totalStockholderEquity);
			const totalAssets = extractNumber(balanceSheet.totalAssets);

			// 有効な数値かチェック
			if (!equity || !totalAssets || equity <= 0 || totalAssets <= 0) {
				return undefined;
			}

			// 自己資本比率を%で計算
			return (equity / totalAssets) * 100;
		} catch (error) {
			// 計算エラーの場合はundefinedを返す
			return undefined;
		}
	}

	/**
	 * quoteSummary APIエラーのハンドリング
	 */
	private static handleQuoteSummaryError(error: unknown, symbol: string): never {
		let errorType: "api_error" | "data_missing" | "calculation_error" = "api_error";
		let message = `財務指標の取得に失敗しました: ${symbol}`;

		// エラーの種類を判定
		const errorMessage = error instanceof Error ? error.message : String(error);
		if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
			errorType = "data_missing";
			message = `銘柄が見つかりません: ${symbol}`;
		} else if (errorMessage.includes("Unauthorized") || errorMessage.includes("403")) {
			errorType = "api_error";
			message = `API認証エラー: ${symbol}`;
		} else if (errorMessage.includes("timeout") || errorMessage.includes("TIMEOUT")) {
			errorType = "api_error";
			message = `APIタイムアウト: ${symbol}`;
		} else if (errorMessage.includes("Rate limit")) {
			errorType = "api_error";
			message = `APIレート制限: ${symbol}`;
		}

		// カスタムエラーとして再throw
		const financialError = new Error(message) as FinancialDataError;
		financialError.name = "FinancialDataError";
		financialError.symbol = symbol;
		financialError.errorType = errorType;

		throw financialError;
	}

	/**
	 * 複数銘柄の財務指標を並行取得
	 * @param symbols 銘柄コード配列
	 * @returns 財務指標結果配列
	 */
	static async getMultipleFinancialMetrics(symbols: string[]): Promise<Array<FinancialMetricsResult | null>> {
		const promises = symbols.map(async (symbol) => {
			try {
				return await FinancialAnalyzer.getFinancialMetrics(symbol);
			} catch (error) {
				console.warn(`財務指標取得エラー [${symbol}]:`, error);
				return null;
			}
		});

		return await Promise.all(promises);
	}

	/**
	 * 財務指標の健全性をチェック
	 * @param metrics 財務指標結果
	 * @returns 有効な指標の数
	 */
	static validateMetrics(metrics: FinancialMetricsResult): {
		validCount: number;
		totalCount: number;
		missingFields: string[];
	} {
		const fields = [
			"marketCap",
			"trailingPE",
			"forwardPE",
			"priceToBook",
			"returnOnEquity",
			"earningsGrowth",
			"dividendYield",
			"equityRatio",
		] as const;

		let validCount = 0;
		const missingFields: string[] = [];

		for (const field of fields) {
			if (metrics[field] !== undefined && metrics[field] !== null) {
				validCount++;
			} else {
				missingFields.push(field);
			}
		}

		return {
			validCount,
			totalCount: fields.length,
			missingFields,
		};
	}
}
