import { CalculationError } from "../types";

/**
 * テクニカル指標計算用の共通バリデーション関数
 */
export class ValidationUtils {
	/**
	 * 価格配列のバリデーション
	 */
	public static validatePricesArray(prices: number[]): void {
		if (!Array.isArray(prices)) {
			throw new CalculationError("Prices must be an array", "INVALID_PRICES");
		}

		if (prices.length === 0) {
			throw new CalculationError("Prices array cannot be empty", "INVALID_PRICES");
		}

		// 全ての値が有限数であることを確認
		const invalidIndex = prices.findIndex((price) => !Number.isFinite(price));
		if (invalidIndex !== -1) {
			throw new CalculationError(
				`Invalid price at index ${invalidIndex}: ${prices[invalidIndex]}. Prices must contain only finite numbers`,
				"INVALID_PRICES",
			);
		}
	}

	/**
	 * 期間パラメータのバリデーション
	 */
	public static validatePeriod(period: number, paramName = "period"): void {
		if (!Number.isInteger(period) || period <= 0) {
			throw new CalculationError(`${paramName} must be a positive integer, got: ${period}`, "INVALID_PARAMETER");
		}
	}

	/**
	 * データ長の十分性をチェック
	 */
	public static validateDataLength(dataLength: number, requiredLength: number, dataType = "data"): void {
		if (dataLength < requiredLength) {
			throw new CalculationError(
				`Insufficient ${dataType}: need ${requiredLength}, got ${dataLength}`,
				"INSUFFICIENT_DATA",
			);
		}
	}

	/**
	 * 複数の期間パラメータの関係性バリデーション
	 */
	public static validatePeriodRelationship(fastPeriod: number, slowPeriod: number): void {
		ValidationUtils.validatePeriod(fastPeriod, "fastPeriod");
		ValidationUtils.validatePeriod(slowPeriod, "slowPeriod");

		if (slowPeriod <= fastPeriod) {
			throw new CalculationError(
				`Slow period (${slowPeriod}) must be greater than fast period (${fastPeriod})`,
				"INVALID_PARAMETER",
			);
		}
	}
}
