import type {
	ParameterValidationResult,
	ParameterWarning,
	TechnicalParametersConfig,
	ValidatedTechnicalParameters,
} from "../types";

// デフォルト設定値
export const DEFAULT_TECHNICAL_PARAMETERS: ValidatedTechnicalParameters = {
	movingAverages: {
		periods: [25, 50, 200],
	},
	rsi: {
		periods: [14, 21],
		overbought: 70,
		oversold: 30,
	},
	macd: {
		fastPeriod: 12,
		slowPeriod: 26,
		signalPeriod: 9,
	},
	bollingerBands: {
		period: 20,
		standardDeviations: 2,
	},
	stochastic: {
		kPeriod: 14,
		dPeriod: 3,
		overbought: 80,
		oversold: 20,
	},
	volumeAnalysis: {
		period: 20,
		spikeThreshold: 2.0,
	},
	vwap: {
		enableTrueVWAP: true,
		standardDeviations: 1,
	},
	mvwap: {
		period: 20,
		standardDeviations: 1,
	},
};

// パラメータ検証範囲設定
const VALIDATION_RULES = {
	periods: { min: 1, max: 365 },
	rsi: { min: 1, max: 100, thresholdMin: 0, thresholdMax: 100 },
	macd: { fastMin: 1, slowMin: 2, signalMin: 1, fastMax: 50, slowMax: 100, signalMax: 50 },
	bollingerBands: { periodMin: 2, periodMax: 100, sigmaMin: 0.1, sigmaMax: 5 },
	stochastic: { kMin: 1, kMax: 100, dMin: 1, dMax: 50, thresholdMin: 0, thresholdMax: 100 },
	volumeAnalysis: { periodMin: 1, periodMax: 100, spikeMin: 1.0, spikeMax: 10.0 },
	vwap: { sigmaMin: 0.1, sigmaMax: 5 },
	mvwap: { periodMin: 1, periodMax: 100, sigmaMin: 0.1, sigmaMax: 5 },
};

export class ParameterValidator {
	/**
	 * パラメータ検証とデフォルト値設定のメインメソッド
	 */
	public static validateAndSetDefaults(params?: TechnicalParametersConfig): ParameterValidationResult {
		if (!params) {
			return {
				validatedParams: DEFAULT_TECHNICAL_PARAMETERS,
				warnings: [],
				hasCustomSettings: false,
			};
		}

		const warnings: ParameterWarning[] = [];
		const validatedParams: ValidatedTechnicalParameters = JSON.parse(JSON.stringify(DEFAULT_TECHNICAL_PARAMETERS));
		let hasCustomSettings = false;

		// 移動平均線パラメータの検証
		if (params.movingAverages?.periods) {
			hasCustomSettings = true;
			const validated = ParameterValidator.validatePeriods(
				params.movingAverages.periods,
				VALIDATION_RULES.periods.min,
				VALIDATION_RULES.periods.max,
				"movingAverages.periods",
			);
			validatedParams.movingAverages.periods = validated.value;
			warnings.push(...validated.warnings);
		}

		// RSIパラメータの検証
		if (params.rsi) {
			if (params.rsi.periods) {
				hasCustomSettings = true;
				const validated = ParameterValidator.validatePeriods(
					params.rsi.periods,
					VALIDATION_RULES.rsi.min,
					VALIDATION_RULES.rsi.max,
					"rsi.periods",
				);
				validatedParams.rsi.periods = validated.value;
				warnings.push(...validated.warnings);
			}

			if (params.rsi.overbought !== undefined) {
				hasCustomSettings = true;
				const validated = ParameterValidator.validateThreshold(
					params.rsi.overbought,
					VALIDATION_RULES.rsi.thresholdMin,
					VALIDATION_RULES.rsi.thresholdMax,
					"rsi.overbought",
				);
				validatedParams.rsi.overbought = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.rsi.oversold !== undefined) {
				hasCustomSettings = true;
				const validated = ParameterValidator.validateThreshold(
					params.rsi.oversold,
					VALIDATION_RULES.rsi.thresholdMin,
					VALIDATION_RULES.rsi.thresholdMax,
					"rsi.oversold",
				);
				validatedParams.rsi.oversold = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			// RSI overbought > oversoldの検証
			if (validatedParams.rsi.overbought <= validatedParams.rsi.oversold) {
				warnings.push({
					parameter: "rsi.overbought/oversold",
					originalValue: `overbought:${validatedParams.rsi.overbought}, oversold:${validatedParams.rsi.oversold}`,
					correctedValue: `overbought:${DEFAULT_TECHNICAL_PARAMETERS.rsi.overbought}, oversold:${DEFAULT_TECHNICAL_PARAMETERS.rsi.oversold}`,
					reason: "overbought must be greater than oversold",
				});
				validatedParams.rsi.overbought = DEFAULT_TECHNICAL_PARAMETERS.rsi.overbought;
				validatedParams.rsi.oversold = DEFAULT_TECHNICAL_PARAMETERS.rsi.oversold;
			}
		}

		// MACDパラメータの検証
		if (params.macd) {
			hasCustomSettings = true;
			if (params.macd.fastPeriod !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.macd.fastPeriod,
					VALIDATION_RULES.macd.fastMin,
					VALIDATION_RULES.macd.fastMax,
					"macd.fastPeriod",
				);
				validatedParams.macd.fastPeriod = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.macd.slowPeriod !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.macd.slowPeriod,
					VALIDATION_RULES.macd.slowMin,
					VALIDATION_RULES.macd.slowMax,
					"macd.slowPeriod",
				);
				validatedParams.macd.slowPeriod = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.macd.signalPeriod !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.macd.signalPeriod,
					VALIDATION_RULES.macd.signalMin,
					VALIDATION_RULES.macd.signalMax,
					"macd.signalPeriod",
				);
				validatedParams.macd.signalPeriod = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			// MACD fast < slowの検証
			if (validatedParams.macd.fastPeriod >= validatedParams.macd.slowPeriod) {
				warnings.push({
					parameter: "macd.fastPeriod/slowPeriod",
					originalValue: `fast:${validatedParams.macd.fastPeriod}, slow:${validatedParams.macd.slowPeriod}`,
					correctedValue: `fast:${DEFAULT_TECHNICAL_PARAMETERS.macd.fastPeriod}, slow:${DEFAULT_TECHNICAL_PARAMETERS.macd.slowPeriod}`,
					reason: "fastPeriod must be less than slowPeriod",
				});
				validatedParams.macd.fastPeriod = DEFAULT_TECHNICAL_PARAMETERS.macd.fastPeriod;
				validatedParams.macd.slowPeriod = DEFAULT_TECHNICAL_PARAMETERS.macd.slowPeriod;
			}
		}

		// ボリンジャーバンドパラメータの検証
		if (params.bollingerBands) {
			hasCustomSettings = true;
			if (params.bollingerBands.period !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.bollingerBands.period,
					VALIDATION_RULES.bollingerBands.periodMin,
					VALIDATION_RULES.bollingerBands.periodMax,
					"bollingerBands.period",
				);
				validatedParams.bollingerBands.period = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.bollingerBands.standardDeviations !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.bollingerBands.standardDeviations,
					VALIDATION_RULES.bollingerBands.sigmaMin,
					VALIDATION_RULES.bollingerBands.sigmaMax,
					"bollingerBands.standardDeviations",
				);
				validatedParams.bollingerBands.standardDeviations = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}
		}

		// ストキャスティクスパラメータの検証
		if (params.stochastic) {
			hasCustomSettings = true;
			if (params.stochastic.kPeriod !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.stochastic.kPeriod,
					VALIDATION_RULES.stochastic.kMin,
					VALIDATION_RULES.stochastic.kMax,
					"stochastic.kPeriod",
				);
				validatedParams.stochastic.kPeriod = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.stochastic.dPeriod !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.stochastic.dPeriod,
					VALIDATION_RULES.stochastic.dMin,
					VALIDATION_RULES.stochastic.dMax,
					"stochastic.dPeriod",
				);
				validatedParams.stochastic.dPeriod = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.stochastic.overbought !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.stochastic.overbought,
					VALIDATION_RULES.stochastic.thresholdMin,
					VALIDATION_RULES.stochastic.thresholdMax,
					"stochastic.overbought",
				);
				validatedParams.stochastic.overbought = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.stochastic.oversold !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.stochastic.oversold,
					VALIDATION_RULES.stochastic.thresholdMin,
					VALIDATION_RULES.stochastic.thresholdMax,
					"stochastic.oversold",
				);
				validatedParams.stochastic.oversold = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			// ストキャスティクス overbought > oversoldの検証
			if (validatedParams.stochastic.overbought <= validatedParams.stochastic.oversold) {
				warnings.push({
					parameter: "stochastic.overbought/oversold",
					originalValue: `overbought:${validatedParams.stochastic.overbought}, oversold:${validatedParams.stochastic.oversold}`,
					correctedValue: `overbought:${DEFAULT_TECHNICAL_PARAMETERS.stochastic.overbought}, oversold:${DEFAULT_TECHNICAL_PARAMETERS.stochastic.oversold}`,
					reason: "overbought must be greater than oversold",
				});
				validatedParams.stochastic.overbought = DEFAULT_TECHNICAL_PARAMETERS.stochastic.overbought;
				validatedParams.stochastic.oversold = DEFAULT_TECHNICAL_PARAMETERS.stochastic.oversold;
			}
		}

		// 出来高分析パラメータの検証
		if (params.volumeAnalysis) {
			hasCustomSettings = true;
			if (params.volumeAnalysis.period !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.volumeAnalysis.period,
					VALIDATION_RULES.volumeAnalysis.periodMin,
					VALIDATION_RULES.volumeAnalysis.periodMax,
					"volumeAnalysis.period",
				);
				validatedParams.volumeAnalysis.period = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.volumeAnalysis.spikeThreshold !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.volumeAnalysis.spikeThreshold,
					VALIDATION_RULES.volumeAnalysis.spikeMin,
					VALIDATION_RULES.volumeAnalysis.spikeMax,
					"volumeAnalysis.spikeThreshold",
				);
				validatedParams.volumeAnalysis.spikeThreshold = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}
		}

		// VWAPパラメータの検証
		if (params.vwap) {
			hasCustomSettings = true;
			if (params.vwap.enableTrueVWAP !== undefined) {
				validatedParams.vwap.enableTrueVWAP = Boolean(params.vwap.enableTrueVWAP);
			}

			if (params.vwap.standardDeviations !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.vwap.standardDeviations,
					VALIDATION_RULES.vwap.sigmaMin,
					VALIDATION_RULES.vwap.sigmaMax,
					"vwap.standardDeviations",
				);
				validatedParams.vwap.standardDeviations = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}
		}

		// 移動VWAPパラメータの検証
		if (params.mvwap) {
			hasCustomSettings = true;
			if (params.mvwap.period !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.mvwap.period,
					VALIDATION_RULES.mvwap.periodMin,
					VALIDATION_RULES.mvwap.periodMax,
					"mvwap.period",
				);
				validatedParams.mvwap.period = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}

			if (params.mvwap.standardDeviations !== undefined) {
				const validated = ParameterValidator.validateThreshold(
					params.mvwap.standardDeviations,
					VALIDATION_RULES.mvwap.sigmaMin,
					VALIDATION_RULES.mvwap.sigmaMax,
					"mvwap.standardDeviations",
				);
				validatedParams.mvwap.standardDeviations = validated.value;
				if (validated.warning) warnings.push(validated.warning);
			}
		}

		return {
			validatedParams,
			warnings,
			hasCustomSettings,
		};
	}

	/**
	 * 期間配列の検証
	 */
	private static validatePeriods(
		periods: number[],
		min: number,
		max: number,
		parameterName: string,
	): { value: number[]; warnings: ParameterWarning[] } {
		if (!Array.isArray(periods) || periods.length === 0) {
			return {
				value: DEFAULT_TECHNICAL_PARAMETERS.movingAverages.periods,
				warnings: [
					{
						parameter: parameterName,
						originalValue: periods,
						correctedValue: DEFAULT_TECHNICAL_PARAMETERS.movingAverages.periods,
						reason: "periods must be a non-empty array",
					},
				],
			};
		}

		const warnings: ParameterWarning[] = [];
		const validatedPeriods: number[] = [];

		for (const period of periods) {
			if (!Number.isInteger(period) || period < min || period > max) {
				warnings.push({
					parameter: `${parameterName}[${period}]`,
					originalValue: period,
					correctedValue: "excluded",
					reason: `period must be an integer between ${min} and ${max}`,
				});
			} else {
				validatedPeriods.push(period);
			}
		}

		if (validatedPeriods.length === 0) {
			return {
				value: DEFAULT_TECHNICAL_PARAMETERS.movingAverages.periods,
				warnings: [
					...warnings,
					{
						parameter: parameterName,
						originalValue: periods,
						correctedValue: DEFAULT_TECHNICAL_PARAMETERS.movingAverages.periods,
						reason: "no valid periods found, using defaults",
					},
				],
			};
		}

		// 重複排除・ソート
		const uniquePeriods = [...new Set(validatedPeriods)].sort((a, b) => a - b);

		return {
			value: uniquePeriods,
			warnings,
		};
	}

	/**
	 * 個別閾値パラメータの検証
	 */
	private static validateThreshold(
		value: number,
		min: number,
		max: number,
		parameterName: string,
	): { value: number; warning?: ParameterWarning } {
		if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
			const defaultValue = ParameterValidator.getDefaultValueByParameter(parameterName);
			return {
				value: defaultValue,
				warning: {
					parameter: parameterName,
					originalValue: value,
					correctedValue: defaultValue,
					reason: `value must be a number between ${min} and ${max}`,
				},
			};
		}

		return { value };
	}

	/**
	 * パラメータ名からデフォルト値を取得
	 */
	private static getDefaultValueByParameter(parameterName: string): number {
		const paramParts = parameterName.split(".");
		if (paramParts.length !== 2) return 1;

		const [section, param] = paramParts;

		// 型安全なデフォルト値取得
		switch (section) {
			case "rsi":
				if (param === "overbought") return DEFAULT_TECHNICAL_PARAMETERS.rsi.overbought;
				if (param === "oversold") return DEFAULT_TECHNICAL_PARAMETERS.rsi.oversold;
				break;
			case "macd":
				if (param === "fastPeriod") return DEFAULT_TECHNICAL_PARAMETERS.macd.fastPeriod;
				if (param === "slowPeriod") return DEFAULT_TECHNICAL_PARAMETERS.macd.slowPeriod;
				if (param === "signalPeriod") return DEFAULT_TECHNICAL_PARAMETERS.macd.signalPeriod;
				break;
			case "bollingerBands":
				if (param === "period") return DEFAULT_TECHNICAL_PARAMETERS.bollingerBands.period;
				if (param === "standardDeviations") return DEFAULT_TECHNICAL_PARAMETERS.bollingerBands.standardDeviations;
				break;
			case "stochastic":
				if (param === "kPeriod") return DEFAULT_TECHNICAL_PARAMETERS.stochastic.kPeriod;
				if (param === "dPeriod") return DEFAULT_TECHNICAL_PARAMETERS.stochastic.dPeriod;
				if (param === "overbought") return DEFAULT_TECHNICAL_PARAMETERS.stochastic.overbought;
				if (param === "oversold") return DEFAULT_TECHNICAL_PARAMETERS.stochastic.oversold;
				break;
			case "volumeAnalysis":
				if (param === "period") return DEFAULT_TECHNICAL_PARAMETERS.volumeAnalysis.period;
				if (param === "spikeThreshold") return DEFAULT_TECHNICAL_PARAMETERS.volumeAnalysis.spikeThreshold;
				break;
			case "vwap":
				if (param === "standardDeviations") return DEFAULT_TECHNICAL_PARAMETERS.vwap.standardDeviations;
				break;
			case "mvwap":
				if (param === "period") return DEFAULT_TECHNICAL_PARAMETERS.mvwap.period;
				if (param === "standardDeviations") return DEFAULT_TECHNICAL_PARAMETERS.mvwap.standardDeviations;
				break;
		}

		return 1;
	}
}
