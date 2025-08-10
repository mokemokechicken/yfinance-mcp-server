/**
 * 日本語レポート生成ユーティリティ
 * spike_all_features.ts のgetJapaneseSignal機能を活用
 */

import type { ComprehensiveStockAnalysisResult, PriceData, ValidatedTechnicalParameters, TechnicalParametersConfig } from "../types";
import { ConfigManager } from "./configManager";

// シグナルの日本語変換（spike_all_features.tsから移植）
function getJapaneseSignal(type: string, signal: string): string {
	const translations: { [key: string]: { [key: string]: string } } = {
		trend: {
			upward: "📈 上昇",
			downward: "📉 下降",
			sideways: "➡️ 横ばい",
			bullish: "📈 強気",
			bearish: "📉 弱気",
			neutral: "➡️ 中立",
		},
		momentum: {
			positive: "🟢 ポジティブ",
			negative: "🔴 ネガティブ",
			neutral: "⚪ ニュートラル",
			accelerating: "⚡ 加速中",
			decelerating: "🔻 減速中",
		},
		strength: {
			strong: "💪 強い",
			moderate: "👍 中程度",
			weak: "👎 弱い",
		},
		rsi_signal: {
			overbought: "🔴 買われすぎ",
			oversold: "🟢 売られすぎ",
			neutral: "⚪ 通常",
		},
		macd_signal: {
			bullish: "🟢 強気",
			bearish: "🔴 弱気",
			neutral: "⚪ 中立",
		},
		bb_signal: {
			buy: "🟢 買い",
			sell: "🔴 売り",
			neutral: "⚪ 中立",
		},
		volatility: {
			high: "🔥 高い",
			normal: "➡️ 通常",
			low: "❄️ 低い",
		},
		stoch_signal: {
			buy: "🟢 買い",
			sell: "🔴 売り",
			neutral: "⚪ 中立",
		},
		stoch_state: {
			overbought: "🔴 買われすぎ",
			oversold: "🟢 売られすぎ",
			neutral: "⚪ 通常",
		},
		cross_type: {
			golden_cross: "🟡 ゴールデンクロス",
			dead_cross: "💀 デッドクロス",
			none: "➡️ クロスなし",
		},
		volume_trend: {
			increasing: "📈 増加",
			decreasing: "📉 減少",
			stable: "➡️ 安定",
		},
		accumulation: {
			accumulating: "🟢 蓄積",
			distributing: "🔴 分散",
			neutral: "⚪ 中立",
		},
		position: {
			above: "📈 上位",
			below: "📉 下位",
			at: "➡️ 付近",
		},
		breakout: {
			bullish_breakout: "🚀 上昇ブレイク",
			bearish_breakout: "💥 下落ブレイク",
			none: "⚪ ブレイクなし",
		},
		// Phase3追加
		deviation_signal: {
			strong_above: "🔴 大幅上振れ",
			above: "🟠 上振れ",
			neutral: "🟢 正常範囲",
			below: "🟡 下振れ",
			strong_below: "🔵 大幅下振れ",
		},
		confidence: {
			high: "🔴 高",
			medium: "🟡 中",
			low: "🔵 低",
		},
		rsi_trend: {
			converging: "🔄 収束",
			diverging: "↗️ 発散",
			stable: "➡️ 安定",
		},
		recommendation: {
			strong_buy: "🟢 強い買い",
			buy: "💚 買い",
			hold: "🟡 保持",
			sell: "🔴 売り",
			strong_sell: "💀 強い売り",
		},
	};

	return translations[type]?.[signal] || signal;
}

// 通貨フォーマット
function formatCurrency(value: number): string {
	return `¥${value.toLocaleString()}`;
}

// パーセンテージフォーマット
function formatPercentage(value: number): string {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

// 価格推移データテーブル生成機能
function generatePriceHistoryTable(priceData: PriceData[], days: number): string {
	if (!priceData || priceData.length === 0) {
		return "価格データが利用できません。";
	}

	const recentData = priceData.slice(-days);
	const sections: string[] = [];

	sections.push("```");
	sections.push("日付        始値      高値      安値      終値      出来高");

	for (const day of recentData) {
		const date =
			day.date instanceof Date ? day.date.toISOString().split("T")[0] : new Date(day.date).toISOString().split("T")[0];
		const open = formatCurrency(day.open);
		const high = formatCurrency(day.high);
		const low = formatCurrency(day.low);
		const close = formatCurrency(day.close);
		const volume = day.volume.toLocaleString();

		sections.push(`${date}  ${open.padEnd(8)}  ${high.padEnd(8)}  ${low.padEnd(8)}  ${close.padEnd(8)}  ${volume}`);
	}

	sections.push("```");
	return sections.join("\n");
}

// 日本語レポート生成
export function generateJapaneseReport(
	analysis: ComprehensiveStockAnalysisResult, 
	days: number,
	validatedParams?: ValidatedTechnicalParameters,
	userParams?: TechnicalParametersConfig
): string {
	const sections: string[] = [];

	// 基本情報
	sections.push(`## 銘柄分析レポート: ${analysis.symbol}`);
	sections.push("");
	sections.push("### 基本情報");
	sections.push(`- 銘柄: ${analysis.symbol} (${analysis.companyName})`);
	sections.push(`- 分析期間: 直近${days}日間（内部計算用: 1年分データ使用）`);
	sections.push(`- 分析日時: ${new Date(analysis.lastUpdated).toLocaleString("ja-JP")}`);

	// 価格情報
	sections.push("");
	sections.push("### 価格情報");
	sections.push(
		`- 現在価格: ${formatCurrency(analysis.priceData.current)} (${formatCurrency(analysis.priceData.change)} / ${formatPercentage(analysis.priceData.changePercent)})`,
	);
	sections.push("");
	sections.push(`**価格推移データ（直近${days}日分）:**`);
	sections.push(generatePriceHistoryTable(analysis.priceHistoryData, days));

	// 財務指標
	if (analysis.financialMetrics) {
		sections.push("");
		sections.push("### 財務指標");
		const fm = analysis.financialMetrics;
		sections.push(`- 時価総額: ${fm.marketCap ? formatCurrency(fm.marketCap) : "N/A"}`);
		sections.push(`- PER（実績）: ${fm.trailingPE?.toFixed(2) || "N/A"}`);
		sections.push(`- PER（予想）: ${fm.forwardPE?.toFixed(2) || "N/A"}`);
		sections.push(`- PBR: ${fm.priceToBook?.toFixed(2) || "N/A"}`);
		sections.push(`- ROE: ${fm.returnOnEquity ? `${fm.returnOnEquity.toFixed(2)}%` : "N/A"}`);
		sections.push(`- EPS成長率: ${fm.earningsGrowth ? `${(fm.earningsGrowth * 100).toFixed(2)}%` : "N/A"}`);
		sections.push(`- 配当利回り: ${fm.dividendYield ? `${fm.dividendYield.toFixed(2)}%` : "N/A"}`);
		sections.push(`- 自己資本比率: ${fm.equityRatio ? `${fm.equityRatio.toFixed(1)}%` : "N/A"}`);
	}

	// カスタム設定情報（設定されている場合のみ表示）
	if (validatedParams && userParams) {
		const configSummary = ConfigManager.generateConfigSummary(validatedParams, userParams);
		if (configSummary.hasCustomizations) {
			sections.push("");
			sections.push("### ⚙️ カスタム設定");
			sections.push(`カスタマイズされた設定: ${configSummary.totalCustomParameters}項目`);
			sections.push("");
		}
	}

	// テクニカル指標
	sections.push("");
	sections.push("### テクニカル指標");
	sections.push("");

	// 移動平均線（改善版）
	const ma = analysis.technicalIndicators.movingAverages;
	const currentPrice = analysis.priceData.current;
	const maPeriods = validatedParams?.movingAverages?.periods || [25, 50, 200];
	const isMACustom = userParams?.movingAverages?.periods !== undefined;

	sections.push(isMACustom ? "**📊 移動平均線（カスタム設定）**" : "**📊 移動平均線**");
	
	// 動的な移動平均線表示
	const maValues = [ma.ma25, ma.ma50, ma.ma200];
	maPeriods.forEach((period, index) => {
		const value = maValues[index];
		const label = period <= 30 ? "短期" : period <= 100 ? "中期" : "長期";
		const position = value && currentPrice > value ? "📈" : value && currentPrice < value ? "📉" : "➡️";
		const relation = value && currentPrice > value ? "上位" : value && currentPrice < value ? "下位" : "同水準";
		
		sections.push(`├─ ${label}(${period}日): ${value ? formatCurrency(value) : "N/A"} ${position} (${relation})`);
	});
	sections.push(`└─ トレンド判定: ${getJapaneseSignal("trend", analysis.signals.trend)}`);
	sections.push("");

	// RSI拡張版（改善版）
	const rsiExt = analysis.extendedIndicators.rsiExtended;
	const rsiPeriods = validatedParams?.rsi?.periods || [14, 21];
	const isRSICustom = userParams?.rsi !== undefined;
	
	sections.push(isRSICustom ? "**📈 RSI（カスタム設定）**" : "**📈 RSI**");
	rsiPeriods.forEach((period, index) => {
		const value = index === 0 ? rsiExt.rsi14 : rsiExt.rsi21;
		const signal = index === 0 ? rsiExt.signal14 : rsiExt.signal21;
		const overbought = validatedParams?.rsi?.overbought || 70;
		const oversold = validatedParams?.rsi?.oversold || 30;
		
		let status = "⚡中立圏";
		if (value > overbought) status = "⚠️買われすぎ圏";
		else if (value < oversold) status = "🔵売られすぎ圏";
		
		sections.push(`├─ RSI(${period}日): ${value.toFixed(2)} ${status}`);
	});
	if (isRSICustom) {
		sections.push(`└─ 閾値: 買われすぎ>${validatedParams?.rsi?.overbought || 70}, 売られすぎ<${validatedParams?.rsi?.oversold || 30}`);
	}
	sections.push("");

	// 移動平均乖離率
	sections.push("");
	sections.push("**移動平均乖離率:**");
	for (const dev of analysis.extendedIndicators.movingAverageDeviations) {
		const sign = dev.deviation >= 0 ? "+" : "";
		sections.push(
			`- ${dev.period}日MA乖離: ${sign}${dev.deviation.toFixed(2)}% (MA: ${formatCurrency(dev.movingAverage)})`,
		);
	}

	// MACD（改善版）
	const macd = analysis.technicalIndicators.macd;
	const isMACDCustom = userParams?.macd !== undefined;
	const fastPeriod = validatedParams?.macd?.fastPeriod || 12;
	const slowPeriod = validatedParams?.macd?.slowPeriod || 26;
	const signalPeriod = validatedParams?.macd?.signalPeriod || 9;
	
	sections.push(isMACDCustom ? "**📊 MACD（カスタム設定）**" : "**📊 MACD**");
	sections.push(`├─ 設定: MACD(${fastPeriod},${slowPeriod},${signalPeriod})`);
	sections.push(`├─ MACD: ${macd.macd.toFixed(3)}`);
	sections.push(`├─ シグナル: ${macd.signal.toFixed(3)}`);
	sections.push(`└─ ヒストグラム: ${macd.histogram.toFixed(3)}`);
	sections.push("");

	// ボリンジャーバンド（改善版）
	const bb = analysis.extendedIndicators.bollingerBands;
	const isBBCustom = userParams?.bollingerBands !== undefined;
	const bbPeriod = validatedParams?.bollingerBands?.period || 20;
	const bbSigma = validatedParams?.bollingerBands?.standardDeviations || 2;
	
	sections.push(isBBCustom ? "**📈 ボリンジャーバンド（カスタム設定）**" : "**📈 ボリンジャーバンド**");
	if (bb.upper > 0 && bb.middle > 0 && bb.lower > 0) {
		sections.push(`├─ 設定: 期間${bbPeriod}日, ±${bbSigma}σ`);
		sections.push(`├─ 上部バンド: ${formatCurrency(bb.upper)}`);
		sections.push(`├─ 中央線(${bbPeriod}日MA): ${formatCurrency(bb.middle)}`);
		sections.push(`├─ 下部バンド: ${formatCurrency(bb.lower)}`);
		sections.push(`├─ バンド幅: ${(bb.bandwidth * 100).toFixed(2)}%`);
		sections.push(`└─ %B: ${(bb.percentB * 100).toFixed(1)}%`);
	} else {
		sections.push("└─ データ不足のため計算できませんでした");
	}
	sections.push("");

	// ストキャスティクス
	sections.push("");
	sections.push("**ストキャスティクス:**");
	const stoch = analysis.extendedIndicators.stochastic;
	sections.push(`- %K値: ${stoch.k.toFixed(2)}`);
	sections.push(`- %D値: ${stoch.d.toFixed(2)}`);

	// クロス検出
	sections.push("");
	sections.push("**ゴールデンクロス・デッドクロス検出:**");
	const cross = analysis.extendedIndicators.crossDetection;
	sections.push(`- クロスタイプ: ${getJapaneseSignal("cross_type", cross.type)}`);
	sections.push(`- 短期MA(25日): ${formatCurrency(cross.shortMA)}`);
	sections.push(`- 長期MA(50日): ${formatCurrency(cross.longMA)}`);
	sections.push(`- 強度: ${getJapaneseSignal("strength", cross.strength)}`);
	sections.push(`- 継続日数: ${cross.confirmationDays}日`);

	// 出来高分析
	sections.push("");
	sections.push("**出来高分析:**");
	const vol = analysis.extendedIndicators.volumeAnalysis;
	sections.push(`- 平均出来高: ${vol.averageVolume.toLocaleString()}`);
	sections.push(`- 相対出来高: ${vol.relativeVolume.toFixed(2)}倍`);
	sections.push(`- トレンド: ${getJapaneseSignal("volume_trend", vol.volumeTrend)}`);
	sections.push(`- 急増検出: ${vol.volumeSpike ? "🔴 あり" : "⚪ なし"}`);
	sections.push(`- 価格相関: ${getJapaneseSignal("strength", vol.priceVolumeStrength)}`);
	sections.push(`- 蓄積判定: ${getJapaneseSignal("accumulation", vol.accumulation)}`);

	// VWAP
	sections.push("");
	sections.push("**VWAP (出来高加重平均価格):**");
	const vwap = analysis.extendedIndicators.vwap;
	sections.push(`- VWAP: ${formatCurrency(vwap.vwap)}`);
	sections.push(`- 上部バンド: ${formatCurrency(vwap.upperBand)}`);
	sections.push(`- 下部バンド: ${formatCurrency(vwap.lowerBand)}`);
	sections.push(`- 価格位置: ${getJapaneseSignal("position", vwap.position)}`);
	sections.push(`- シグナル強度: ${getJapaneseSignal("strength", vwap.strength)}`);
	sections.push(`- トレンド: ${getJapaneseSignal("trend", vwap.trend)}`);

	// 統合シグナル分析
	sections.push("");
	sections.push("### 統合シグナル分析");
	sections.push(`- **トレンド:** ${getJapaneseSignal("trend", analysis.signals.trend)}`);
	sections.push(`- **モメンタム:** ${getJapaneseSignal("momentum", analysis.signals.momentum)}`);
	sections.push(`- **強度:** ${getJapaneseSignal("strength", analysis.signals.strength)}`);

	return sections.join("\n");
}
