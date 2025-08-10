import {
	APIConnectionError,
	APILimitError,
	CalculationError,
	DataFetchError,
	type ErrorContext,
	type ErrorReport,
	TechnicalIndicatorError,
	ValidationError,
} from "../types";

/**
 * エラーハンドリングユーティリティクラス
 * 構造化されたエラーレポーティングと回復戦略を提供
 */
export class ErrorHandler {
	private static errorReports: ErrorReport[] = [];
	private static maxErrorReports = 100; // メモリリーク防止

	/**
	 * エラーをログに記録し、ユーザーフレンドリーなメッセージを生成
	 */
	public static handleError(error: unknown, context: ErrorContext, fallbackUsed?: string): ErrorReport {
		const technicalError = ErrorHandler.normalizeError(error, context);

		const errorReport: ErrorReport = {
			error: technicalError,
			context: {
				...context,
				timestamp: new Date().toISOString(),
			},
			fallbackUsed,
			userMessage: ErrorHandler.generateUserFriendlyMessage(technicalError, context),
			technicalDetails: ErrorHandler.generateTechnicalDetails(technicalError, context),
		};

		// エラーレポートを記録
		ErrorHandler.recordError(errorReport);

		// 構造化ログ出力
		ErrorHandler.logError(errorReport);

		return errorReport;
	}

	/**
	 * 非同期関数の安全実行（リトライ機能付き）
	 */
	public static async safeExecuteAsync<T>(
		fn: () => Promise<T>,
		fallbackFn: () => T,
		context: ErrorContext,
		maxRetries = 3,
		retryDelay = 1000,
	): Promise<{ result: T; error?: ErrorReport }> {
		let lastError: unknown;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const result = await fn();
				return { result };
			} catch (error) {
				lastError = error;

				const retryContext = {
					...context,
					retry: { attempt, maxAttempts: maxRetries },
				};

				// 回復不可能なエラーの場合は即座にフォールバック
				const normalizedError = ErrorHandler.normalizeError(error, retryContext);
				if (!normalizedError.isRecoverable || attempt === maxRetries) {
					const fallbackResult = fallbackFn();
					const errorReport = ErrorHandler.handleError(
						error,
						retryContext,
						`フォールバック値: ${JSON.stringify(fallbackResult)}`,
					);
					return { result: fallbackResult, error: errorReport };
				}

				// リトライ前の待機
				if (attempt < maxRetries) {
					await ErrorHandler.sleep(retryDelay * attempt); // 指数バックオフ
				}
			}
		}

		// 理論的には到達しないが、型安全性のため
		const fallbackResult = fallbackFn();
		const errorReport = ErrorHandler.handleError(
			lastError,
			context,
			`最大リトライ後のフォールバック: ${JSON.stringify(fallbackResult)}`,
		);
		return { result: fallbackResult, error: errorReport };
	}

	/**
	 * 同期関数の安全実行
	 */
	public static safeExecute<T>(
		fn: () => T,
		fallbackFn: () => T,
		context: ErrorContext,
	): { result: T; error?: ErrorReport } {
		try {
			const result = fn();
			return { result };
		} catch (error) {
			const fallbackResult = fallbackFn();
			const errorReport = ErrorHandler.handleError(
				error,
				context,
				`フォールバック値: ${JSON.stringify(fallbackResult)}`,
			);
			return { result: fallbackResult, error: errorReport };
		}
	}

	/**
	 * エラーを正規化してTechnicalIndicatorErrorに変換
	 */
	private static normalizeError(error: unknown, context: ErrorContext): TechnicalIndicatorError {
		if (error instanceof TechnicalIndicatorError) {
			return error;
		}

		if (error instanceof Error) {
			// 既知のエラータイプを判定
			if (error.message.includes("network") || error.message.includes("timeout")) {
				return new APIConnectionError(error.message, context);
			}
			if (error.message.includes("rate limit") || error.message.includes("429")) {
				return new APILimitError(error.message, context);
			}
			if (error.message.includes("validation") || error.message.includes("invalid")) {
				return new ValidationError(error.message, "VALIDATION_ERROR", context);
			}
			if (error.message.includes("calculation") || error.message.includes("math")) {
				return new CalculationError(error.message, "CALCULATION_ERROR", context);
			}

			// 一般的なエラー
			return new TechnicalIndicatorError(
				error.message,
				"UNKNOWN_ERROR",
				{ originalError: error.name, ...context },
				true,
			);
		}

		// 文字列や他の型のエラー
		return new TechnicalIndicatorError(
			typeof error === "string" ? error : "不明なエラーが発生しました",
			"UNKNOWN_ERROR",
			{ originalError: error, ...context },
			true,
		);
	}

	/**
	 * ユーザーフレンドリーなエラーメッセージを生成
	 */
	private static generateUserFriendlyMessage(error: TechnicalIndicatorError, context: ErrorContext): string {
		const symbol = context.symbol || "不明な銘柄";
		const indicator = context.indicator || "指標";

		switch (error.name) {
			case "APIConnectionError":
				return `${symbol} のデータ取得でネットワークエラーが発生しました。ネットワーク接続を確認してください。`;
			case "APILimitError":
				return `${symbol} のデータ取得でAPI制限に達しました。しばらく時間をおいてから再試行してください。`;
			case "DataFetchError":
				return `${symbol} のデータ取得に失敗しました。銘柄コードが正しいか確認してください。`;
			case "ValidationError":
				return `${indicator} の設定パラメータに問題があります。デフォルト値で実行を継続します。`;
			case "CalculationError":
				return `${indicator} の計算中にエラーが発生しました。利用可能なデータが不足している可能性があります。`;
			default:
				return `${indicator} の処理中に予期しないエラーが発生しました。分析を継続します。`;
		}
	}

	/**
	 * 技術的な詳細情報を生成
	 */
	private static generateTechnicalDetails(error: TechnicalIndicatorError, context: ErrorContext): string {
		const details = [`エラータイプ: ${error.name}`, `エラーコード: ${error.code}`, `メッセージ: ${error.message}`];

		if (context.symbol) details.push(`銘柄: ${context.symbol}`);
		if (context.indicator) details.push(`指標: ${context.indicator}`);
		if (context.parameters) details.push(`パラメータ: ${JSON.stringify(context.parameters)}`);
		if (context.retry) details.push(`リトライ: ${context.retry.attempt}/${context.retry.maxAttempts}`);
		if (error.context) details.push(`コンテキスト: ${JSON.stringify(error.context)}`);

		return details.join(" | ");
	}

	/**
	 * エラーレポートをメモリに記録
	 */
	private static recordError(errorReport: ErrorReport): void {
		ErrorHandler.errorReports.push(errorReport);

		// メモリリーク防止：古いレポートを削除
		if (ErrorHandler.errorReports.length > ErrorHandler.maxErrorReports) {
			ErrorHandler.errorReports = ErrorHandler.errorReports.slice(-ErrorHandler.maxErrorReports);
		}
	}

	/**
	 * 構造化ログ出力
	 */
	private static logError(errorReport: ErrorReport): void {
		console.warn("🚨 Technical Indicator Error:", {
			error: {
				name: errorReport.error.name,
				code: errorReport.error.code,
				message: errorReport.error.message,
				isRecoverable: errorReport.error.isRecoverable,
			},
			context: errorReport.context,
			fallbackUsed: errorReport.fallbackUsed,
			userMessage: errorReport.userMessage,
		});
	}

	/**
	 * エラーサマリー取得（デバッグ用）
	 */
	public static getErrorSummary(): {
		total: number;
		byType: Record<string, number>;
		recent: ErrorReport[];
	} {
		const byType: Record<string, number> = {};

		for (const report of ErrorHandler.errorReports) {
			byType[report.error.name] = (byType[report.error.name] || 0) + 1;
		}

		return {
			total: ErrorHandler.errorReports.length,
			byType,
			recent: ErrorHandler.errorReports.slice(-5), // 最近の5件
		};
	}

	/**
	 * エラーレポート履歴をクリア
	 */
	public static clearErrorHistory(): void {
		ErrorHandler.errorReports = [];
	}

	/**
	 * 待機関数
	 */
	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * 複数のエラーレポートから統合メッセージを生成
	 */
	public static generateConsolidatedUserMessage(errorReports: ErrorReport[]): string {
		if (errorReports.length === 0) {
			return "";
		}

		if (errorReports.length === 1) {
			return errorReports[0].userMessage;
		}

		const errorCounts: Record<string, number> = {};
		const messages: string[] = [];

		for (const report of errorReports) {
			errorCounts[report.error.name] = (errorCounts[report.error.name] || 0) + 1;
		}

		if (errorCounts.DataFetchError || errorCounts.APIConnectionError || errorCounts.APILimitError) {
			messages.push("一部のデータ取得でエラーが発生しましたが、利用可能なデータで分析を継続しました。");
		}

		if (errorCounts.CalculationError) {
			messages.push(
				`${errorCounts.CalculationError}個の技術指標でエラーが発生しましたが、他の指標で分析を継続しました。`,
			);
		}

		if (errorCounts.ValidationError) {
			messages.push("一部のパラメータ設定に問題がありましたが、デフォルト値で実行しました。");
		}

		return messages.length > 0
			? `⚠️ 注意: ${messages.join(" ")}`
			: "一部の処理でエラーが発生しましたが、可能な限り分析を継続しました。";
	}
}
