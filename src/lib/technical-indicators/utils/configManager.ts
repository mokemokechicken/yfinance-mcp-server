import type {
	TechnicalParametersConfig,
	ValidatedTechnicalParameters,
} from "../types";
import { DEFAULT_TECHNICAL_PARAMETERS } from "./parameterValidator";

// 設定サマリー情報
export interface ConfigSummary {
	sections: ConfigSection[];
	hasCustomizations: boolean;
	totalCustomParameters: number;
}

// 設定セクション情報
export interface ConfigSection {
	name: string;
	displayName: string;
	isCustomized: boolean;
	parameters: ConfigParameter[];
}

// 設定パラメータ情報
export interface ConfigParameter {
	name: string;
	displayName: string;
	value: string;
	isCustom: boolean;
	defaultValue: string;
}

export class ConfigManager {
	/**
	 * ユーザー設定とデフォルト値を統合
	 */
	public static mergeWithDefaults(
		userParams?: TechnicalParametersConfig,
		defaults: ValidatedTechnicalParameters = DEFAULT_TECHNICAL_PARAMETERS,
	): ValidatedTechnicalParameters {
		if (!userParams) {
			return JSON.parse(JSON.stringify(defaults));
		}

		const merged: ValidatedTechnicalParameters = JSON.parse(JSON.stringify(defaults));

		// 移動平均線
		if (userParams.movingAverages?.periods) {
			merged.movingAverages.periods = [...userParams.movingAverages.periods];
		}

		// RSI
		if (userParams.rsi) {
			if (userParams.rsi.periods) {
				merged.rsi.periods = [...userParams.rsi.periods];
			}
			if (userParams.rsi.overbought !== undefined) {
				merged.rsi.overbought = userParams.rsi.overbought;
			}
			if (userParams.rsi.oversold !== undefined) {
				merged.rsi.oversold = userParams.rsi.oversold;
			}
		}

		// MACD
		if (userParams.macd) {
			if (userParams.macd.fastPeriod !== undefined) {
				merged.macd.fastPeriod = userParams.macd.fastPeriod;
			}
			if (userParams.macd.slowPeriod !== undefined) {
				merged.macd.slowPeriod = userParams.macd.slowPeriod;
			}
			if (userParams.macd.signalPeriod !== undefined) {
				merged.macd.signalPeriod = userParams.macd.signalPeriod;
			}
		}

		// ボリンジャーバンド
		if (userParams.bollingerBands) {
			if (userParams.bollingerBands.period !== undefined) {
				merged.bollingerBands.period = userParams.bollingerBands.period;
			}
			if (userParams.bollingerBands.standardDeviations !== undefined) {
				merged.bollingerBands.standardDeviations = userParams.bollingerBands.standardDeviations;
			}
		}

		// ストキャスティクス
		if (userParams.stochastic) {
			if (userParams.stochastic.kPeriod !== undefined) {
				merged.stochastic.kPeriod = userParams.stochastic.kPeriod;
			}
			if (userParams.stochastic.dPeriod !== undefined) {
				merged.stochastic.dPeriod = userParams.stochastic.dPeriod;
			}
			if (userParams.stochastic.overbought !== undefined) {
				merged.stochastic.overbought = userParams.stochastic.overbought;
			}
			if (userParams.stochastic.oversold !== undefined) {
				merged.stochastic.oversold = userParams.stochastic.oversold;
			}
		}

		// 出来高分析
		if (userParams.volumeAnalysis) {
			if (userParams.volumeAnalysis.period !== undefined) {
				merged.volumeAnalysis.period = userParams.volumeAnalysis.period;
			}
			if (userParams.volumeAnalysis.spikeThreshold !== undefined) {
				merged.volumeAnalysis.spikeThreshold = userParams.volumeAnalysis.spikeThreshold;
			}
		}

		// VWAP
		if (userParams.vwap) {
			if (userParams.vwap.enableTrueVWAP !== undefined) {
				merged.vwap.enableTrueVWAP = userParams.vwap.enableTrueVWAP;
			}
			if (userParams.vwap.standardDeviations !== undefined) {
				merged.vwap.standardDeviations = userParams.vwap.standardDeviations;
			}
		}

		// 移動VWAP
		if (userParams.mvwap) {
			if (userParams.mvwap.period !== undefined) {
				merged.mvwap.period = userParams.mvwap.period;
			}
			if (userParams.mvwap.standardDeviations !== undefined) {
				merged.mvwap.standardDeviations = userParams.mvwap.standardDeviations;
			}
		}

		return merged;
	}

	/**
	 * 設定情報のサマリーを生成
	 */
	public static generateConfigSummary(
		validatedConfig: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSummary {
		const sections: ConfigSection[] = [];
		let totalCustomParameters = 0;

		// 移動平均線セクション
		const maSection = ConfigManager.createMovingAveragesSection(validatedConfig, userParams);
		sections.push(maSection);
		totalCustomParameters += maSection.parameters.filter((p) => p.isCustom).length;

		// RSIセクション
		const rsiSection = ConfigManager.createRSISection(validatedConfig, userParams);
		sections.push(rsiSection);
		totalCustomParameters += rsiSection.parameters.filter((p) => p.isCustom).length;

		// MACDセクション
		const macdSection = ConfigManager.createMACDSection(validatedConfig, userParams);
		sections.push(macdSection);
		totalCustomParameters += macdSection.parameters.filter((p) => p.isCustom).length;

		// ボリンジャーバンドセクション
		const bbSection = ConfigManager.createBollingerBandsSection(validatedConfig, userParams);
		sections.push(bbSection);
		totalCustomParameters += bbSection.parameters.filter((p) => p.isCustom).length;

		// ストキャスティクスセクション
		const stochSection = ConfigManager.createStochasticSection(validatedConfig, userParams);
		sections.push(stochSection);
		totalCustomParameters += stochSection.parameters.filter((p) => p.isCustom).length;

		// 出来高分析セクション
		const volumeSection = ConfigManager.createVolumeAnalysisSection(validatedConfig, userParams);
		sections.push(volumeSection);
		totalCustomParameters += volumeSection.parameters.filter((p) => p.isCustom).length;

		// VWAPセクション
		const vwapSection = ConfigManager.createVWAPSection(validatedConfig, userParams);
		sections.push(vwapSection);
		totalCustomParameters += vwapSection.parameters.filter((p) => p.isCustom).length;

		// 移動VWAPセクション
		const mvwapSection = ConfigManager.createMVWAPSection(validatedConfig, userParams);
		sections.push(mvwapSection);
		totalCustomParameters += mvwapSection.parameters.filter((p) => p.isCustom).length;

		const hasCustomizations = totalCustomParameters > 0;

		return {
			sections,
			hasCustomizations,
			totalCustomParameters,
		};
	}

	/**
	 * 移動平均線セクションの作成
	 */
	private static createMovingAveragesSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const isCustomized = userParams?.movingAverages?.periods !== undefined;
		const parameters: ConfigParameter[] = [
			{
				name: "periods",
				displayName: "期間",
				value: `[${config.movingAverages.periods.join(", ")}]日`,
				isCustom: isCustomized,
				defaultValue: `[${DEFAULT_TECHNICAL_PARAMETERS.movingAverages.periods.join(", ")}]日`,
			},
		];

		return {
			name: "movingAverages",
			displayName: "移動平均線",
			isCustomized,
			parameters,
		};
	}

	/**
	 * RSIセクションの作成
	 */
	private static createRSISection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const periodsCustom = userParams?.rsi?.periods !== undefined;
		const overboughtCustom = userParams?.rsi?.overbought !== undefined;
		const oversoldCustom = userParams?.rsi?.oversold !== undefined;
		const isCustomized = periodsCustom || overboughtCustom || oversoldCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "periods",
				displayName: "期間",
				value: `[${config.rsi.periods.join(", ")}]日`,
				isCustom: periodsCustom,
				defaultValue: `[${DEFAULT_TECHNICAL_PARAMETERS.rsi.periods.join(", ")}]日`,
			},
			{
				name: "overbought",
				displayName: "買われすぎ",
				value: `${config.rsi.overbought}`,
				isCustom: overboughtCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.rsi.overbought}`,
			},
			{
				name: "oversold",
				displayName: "売られすぎ",
				value: `${config.rsi.oversold}`,
				isCustom: oversoldCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.rsi.oversold}`,
			},
		];

		return {
			name: "rsi",
			displayName: "RSI",
			isCustomized,
			parameters,
		};
	}

	/**
	 * MACDセクションの作成
	 */
	private static createMACDSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const fastCustom = userParams?.macd?.fastPeriod !== undefined;
		const slowCustom = userParams?.macd?.slowPeriod !== undefined;
		const signalCustom = userParams?.macd?.signalPeriod !== undefined;
		const isCustomized = fastCustom || slowCustom || signalCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "fastPeriod",
				displayName: "短期EMA",
				value: `${config.macd.fastPeriod}日`,
				isCustom: fastCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.macd.fastPeriod}日`,
			},
			{
				name: "slowPeriod",
				displayName: "長期EMA",
				value: `${config.macd.slowPeriod}日`,
				isCustom: slowCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.macd.slowPeriod}日`,
			},
			{
				name: "signalPeriod",
				displayName: "シグナル",
				value: `${config.macd.signalPeriod}日`,
				isCustom: signalCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.macd.signalPeriod}日`,
			},
		];

		return {
			name: "macd",
			displayName: "MACD",
			isCustomized,
			parameters,
		};
	}

	/**
	 * ボリンジャーバンドセクションの作成
	 */
	private static createBollingerBandsSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const periodCustom = userParams?.bollingerBands?.period !== undefined;
		const sigmaCustom = userParams?.bollingerBands?.standardDeviations !== undefined;
		const isCustomized = periodCustom || sigmaCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "period",
				displayName: "期間",
				value: `${config.bollingerBands.period}日`,
				isCustom: periodCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.bollingerBands.period}日`,
			},
			{
				name: "standardDeviations",
				displayName: "標準偏差",
				value: `±${config.bollingerBands.standardDeviations}σ`,
				isCustom: sigmaCustom,
				defaultValue: `±${DEFAULT_TECHNICAL_PARAMETERS.bollingerBands.standardDeviations}σ`,
			},
		];

		return {
			name: "bollingerBands",
			displayName: "ボリンジャーバンド",
			isCustomized,
			parameters,
		};
	}

	/**
	 * ストキャスティクスセクションの作成
	 */
	private static createStochasticSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const kCustom = userParams?.stochastic?.kPeriod !== undefined;
		const dCustom = userParams?.stochastic?.dPeriod !== undefined;
		const overboughtCustom = userParams?.stochastic?.overbought !== undefined;
		const oversoldCustom = userParams?.stochastic?.oversold !== undefined;
		const isCustomized = kCustom || dCustom || overboughtCustom || oversoldCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "kPeriod",
				displayName: "%K期間",
				value: `${config.stochastic.kPeriod}日`,
				isCustom: kCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.stochastic.kPeriod}日`,
			},
			{
				name: "dPeriod",
				displayName: "%D期間",
				value: `${config.stochastic.dPeriod}日`,
				isCustom: dCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.stochastic.dPeriod}日`,
			},
			{
				name: "overbought",
				displayName: "買われすぎ",
				value: `${config.stochastic.overbought}`,
				isCustom: overboughtCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.stochastic.overbought}`,
			},
			{
				name: "oversold",
				displayName: "売られすぎ",
				value: `${config.stochastic.oversold}`,
				isCustom: oversoldCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.stochastic.oversold}`,
			},
		];

		return {
			name: "stochastic",
			displayName: "ストキャスティクス",
			isCustomized,
			parameters,
		};
	}

	/**
	 * 出来高分析セクションの作成
	 */
	private static createVolumeAnalysisSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const periodCustom = userParams?.volumeAnalysis?.period !== undefined;
		const thresholdCustom = userParams?.volumeAnalysis?.spikeThreshold !== undefined;
		const isCustomized = periodCustom || thresholdCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "period",
				displayName: "期間",
				value: `${config.volumeAnalysis.period}日`,
				isCustom: periodCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.volumeAnalysis.period}日`,
			},
			{
				name: "spikeThreshold",
				displayName: "急増閾値",
				value: `${config.volumeAnalysis.spikeThreshold}倍`,
				isCustom: thresholdCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.volumeAnalysis.spikeThreshold}倍`,
			},
		];

		return {
			name: "volumeAnalysis",
			displayName: "出来高分析",
			isCustomized,
			parameters,
		};
	}

	/**
	 * VWAPセクションの作成
	 */
	private static createVWAPSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const enableCustom = userParams?.vwap?.enableTrueVWAP !== undefined;
		const sigmaCustom = userParams?.vwap?.standardDeviations !== undefined;
		const isCustomized = enableCustom || sigmaCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "enableTrueVWAP",
				displayName: "真の1日VWAP",
				value: config.vwap.enableTrueVWAP ? "有効" : "無効",
				isCustom: enableCustom,
				defaultValue: DEFAULT_TECHNICAL_PARAMETERS.vwap.enableTrueVWAP ? "有効" : "無効",
			},
			{
				name: "standardDeviations",
				displayName: "標準偏差",
				value: `±${config.vwap.standardDeviations}σ`,
				isCustom: sigmaCustom,
				defaultValue: `±${DEFAULT_TECHNICAL_PARAMETERS.vwap.standardDeviations}σ`,
			},
		];

		return {
			name: "vwap",
			displayName: "VWAP",
			isCustomized,
			parameters,
		};
	}

	/**
	 * 移動VWAPセクションの作成
	 */
	private static createMVWAPSection(
		config: ValidatedTechnicalParameters,
		userParams?: TechnicalParametersConfig,
	): ConfigSection {
		const periodCustom = userParams?.mvwap?.period !== undefined;
		const sigmaCustom = userParams?.mvwap?.standardDeviations !== undefined;
		const isCustomized = periodCustom || sigmaCustom;

		const parameters: ConfigParameter[] = [
			{
				name: "period",
				displayName: "期間",
				value: `${config.mvwap.period}日`,
				isCustom: periodCustom,
				defaultValue: `${DEFAULT_TECHNICAL_PARAMETERS.mvwap.period}日`,
			},
			{
				name: "standardDeviations",
				displayName: "標準偏差",
				value: `±${config.mvwap.standardDeviations}σ`,
				isCustom: sigmaCustom,
				defaultValue: `±${DEFAULT_TECHNICAL_PARAMETERS.mvwap.standardDeviations}σ`,
			},
		];

		return {
			name: "mvwap",
			displayName: "移動VWAP",
			isCustomized,
			parameters,
		};
	}

	/**
	 * 設定の簡潔な表示文字列を生成
	 */
	public static generateConfigDisplayString(section: ConfigSection): string {
		if (!section.isCustomized) {
			return section.displayName;
		}

		const customParams = section.parameters
			.filter((p) => p.isCustom)
			.map((p) => p.value)
			.join(", ");

		return `${section.displayName}（カスタム: ${customParams}）`;
	}
}