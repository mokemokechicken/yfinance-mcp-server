#!/usr/bin/env tsx

import {
	BollingerBandsCalculator,
	StochasticCalculator,
	CrossDetectionCalculator,
	VolumeAnalysisCalculator,
	VWAPCalculator,
	TechnicalAnalyzer,
	type BollingerBandsResult,
	type StochasticResult,
	type CrossDetectionResult,
	type VolumeAnalysisResult,
	type VWAPResult,
	type PriceData,
} from "../src/lib/technical-indicators";

// Phase2拡張機能のテスト
async function testPhase2Features() {
	console.log("=".repeat(60));
	console.log("🚀 Phase2 拡張機能テスト - 新しいテクニカル指標");
	console.log("=".repeat(60));

	try {
		console.log("📊 コマツ(6301.T)の実データを取得中...");
		const priceData = await TechnicalAnalyzer.fetchData("6301.T", "6mo");
		const closePrices = priceData.map(d => d.close);

		console.log(`✅ データ取得完了 (${priceData.length}日分)\n`);

		await testBollingerBands(closePrices);
		await testStochastic(priceData);
		await testCrossDetection(closePrices);
		await testVolumeAnalysis(priceData);
		await testVWAP(priceData);

	} catch (error: any) {
		console.error("❌ 実データテストでエラーが発生:", error.message);
		console.log("📝 ダミーデータでテストを継続します...\n");
		
		// ダミーデータでテスト
		await testWithDummyData();
	}
}

// ボリンジャーバンドのテスト
async function testBollingerBands(prices: number[]) {
	console.log("📈 **ボリンジャーバンドテスト**");
	
	try {
		const bbResult: BollingerBandsResult = BollingerBandsCalculator.calculate(prices, 20, 2);
		
		console.log(`上部バンド: ¥${bbResult.upper.toLocaleString()}`);
		console.log(`中央線(MA): ¥${bbResult.middle.toLocaleString()}`);
		console.log(`下部バンド: ¥${bbResult.lower.toLocaleString()}`);
		console.log(`バンド幅: ${(bbResult.bandwidth * 100).toFixed(2)}%`);
		console.log(`%B: ${(bbResult.percentB * 100).toFixed(1)}%`);

		// スクイーズとエクスパンションの検出
		const squeeze = BollingerBandsCalculator.detectSqueeze(prices, 20, 5);
		const expansion = BollingerBandsCalculator.detectExpansion(prices, 20, 5);
		console.log(`スクイーズ検出: ${squeeze ? "🔴 収束中" : "⚪ 正常"}`);
		console.log(`エクスパンション検出: ${expansion ? "🟢 拡張中" : "⚪ 正常"}\n`);

	} catch (error: any) {
		console.log(`❌ ボリンジャーバンドテストエラー: ${error.message}\n`);
	}
}

// ストキャスティクスのテスト
async function testStochastic(priceData: PriceData[]) {
	console.log("📊 **ストキャスティクステスト**");

	try {
		const stochResult: StochasticResult = StochasticCalculator.calculateWithOHLC(priceData, 14, 3);
		
		console.log(`%K値: ${stochResult.k.toFixed(2)}`);
		console.log(`%D値: ${stochResult.d.toFixed(2)}`);

		const signal = StochasticCalculator.getSignal(stochResult);
		const state = StochasticCalculator.getOverboughtOversoldState(stochResult);
		const cross = StochasticCalculator.detectCross(priceData, 14, 3);

		console.log(`シグナル: ${getJapaneseSignal("stochastic", signal)}`);
		console.log(`状態: ${getJapaneseSignal("state", state)}`);
		console.log(`クロス: ${getJapaneseSignal("cross", cross)}\n`);

	} catch (error: any) {
		console.log(`❌ ストキャスティクステストエラー: ${error.message}\n`);
	}
}

// ゴールデンクロス・デッドクロス検出のテスト
async function testCrossDetection(prices: number[]) {
	console.log("⚡ **クロス検出テスト**");

	try {
		const crossResult: CrossDetectionResult = CrossDetectionCalculator.detectCross(prices, 25, 75, 3);
		
		console.log(`クロスタイプ: ${getJapaneseSignal("cross_type", crossResult.type)}`);
		console.log(`短期MA(25日): ¥${crossResult.shortMA.toLocaleString()}`);
		console.log(`長期MA(75日): ¥${crossResult.longMA.toLocaleString()}`);
		console.log(`強度: ${getJapaneseSignal("strength", crossResult.strength)}`);
		console.log(`継続日数: ${crossResult.confirmationDays}日`);

		// 複数時間軸分析
		const multiFrame = CrossDetectionCalculator.getMultiTimeframeAnalysis(prices);
		console.log(`総合判断: ${getJapaneseSignal("consensus", multiFrame.consensus)}\n`);

	} catch (error: any) {
		console.log(`❌ クロス検出テストエラー: ${error.message}\n`);
	}
}

// 出来高分析のテスト
async function testVolumeAnalysis(priceData: PriceData[]) {
	console.log("📊 **出来高分析テスト**");

	try {
		const volumeResult: VolumeAnalysisResult = VolumeAnalysisCalculator.calculate(priceData, 20);
		
		console.log(`平均出来高: ${volumeResult.averageVolume.toLocaleString()}`);
		console.log(`相対出来高: ${volumeResult.relativeVolume.toFixed(2)}倍`);
		console.log(`出来高トレンド: ${getJapaneseSignal("volume_trend", volumeResult.volumeTrend)}`);
		console.log(`出来高急増: ${volumeResult.volumeSpike ? "🔴 検出" : "⚪ 正常"}`);
		console.log(`価格-出来高相関: ${getJapaneseSignal("strength", volumeResult.priceVolumeStrength)}`);
		console.log(`蓄積・分散: ${getJapaneseSignal("accumulation", volumeResult.accumulation)}`);

		// チャイキンマネーフロー
		const cmf = VolumeAnalysisCalculator.calculateChaikinMoneyFlow(priceData, 20);
		console.log(`チャイキンMF: ${cmf.toFixed(4)}\n`);

	} catch (error: any) {
		console.log(`❌ 出来高分析テストエラー: ${error.message}\n`);
	}
}

// VWAPのテスト
async function testVWAP(priceData: PriceData[]) {
	console.log("💰 **VWAPテスト**");

	try {
		const vwapResult: VWAPResult = VWAPCalculator.calculate(priceData, 1);
		
		console.log(`VWAP: ¥${vwapResult.vwap.toLocaleString()}`);
		console.log(`上部バンド: ¥${vwapResult.upperBand.toLocaleString()}`);
		console.log(`下部バンド: ¥${vwapResult.lowerBand.toLocaleString()}`);
		console.log(`標準偏差: ${vwapResult.deviation.toFixed(4)}`);
		console.log(`価格位置: ${getJapaneseSignal("position", vwapResult.position)}`);
		console.log(`シグナル強度: ${getJapaneseSignal("strength", vwapResult.strength)}`);
		console.log(`トレンド: ${getJapaneseSignal("trend", vwapResult.trend)}`);

		// ブレイクアウト検出
		const breakout = VWAPCalculator.detectBreakout(priceData, 1.5);
		console.log(`ブレイクアウト: ${getJapaneseSignal("breakout", breakout)}`);

		// 平均回帰シグナル
		const reversion = VWAPCalculator.getReversionSignal(priceData, 2.0);
		console.log(`平均回帰シグナル: ${getJapaneseSignal("reversion", reversion)}\n`);

	} catch (error: any) {
		console.log(`❌ VWAPテストエラー: ${error.message}\n`);
	}
}

// ダミーデータでのテスト
async function testWithDummyData() {
	console.log("🧪 **ダミーデータテスト**");
	
	// より長期間のダミーデータを生成
	const dummyPrices = Array.from({ length: 100 }, (_, i) => {
		const base = 4500;
		const trend = i * 2; // 上昇トレンド
		const volatility = Math.sin(i / 10) * 50 + Math.random() * 30;
		return base + trend + volatility;
	});

	const dummyPriceData: PriceData[] = dummyPrices.map((close, i) => ({
		date: new Date(Date.now() - (dummyPrices.length - i) * 24 * 60 * 60 * 1000),
		open: close - Math.random() * 20 + 10,
		high: close + Math.random() * 30,
		low: close - Math.random() * 30,
		close,
		volume: Math.floor(Math.random() * 1000000) + 500000,
	}));

	console.log(`生成データ: ${dummyPriceData.length}日分\n`);

	// 各指標を簡単にテスト
	try {
		const bb = BollingerBandsCalculator.calculate(dummyPrices, 20, 2);
		console.log(`✅ ボリンジャーバンド: ${bb.middle.toFixed(2)}`);
	} catch (error: any) {
		console.log(`❌ ボリンジャーバンドエラー: ${error.message}`);
	}

	try {
		const stoch = StochasticCalculator.calculateWithOHLC(dummyPriceData, 14, 3);
		console.log(`✅ ストキャスティクス: %K=${stoch.k.toFixed(2)}, %D=${stoch.d.toFixed(2)}`);
	} catch (error: any) {
		console.log(`❌ ストキャスティクスエラー: ${error.message}`);
	}

	try {
		const cross = CrossDetectionCalculator.detectCross(dummyPrices, 25, 50, 3);
		console.log(`✅ クロス検出: ${cross.type} (${cross.strength})`);
	} catch (error: any) {
		console.log(`❌ クロス検出エラー: ${error.message}`);
	}

	try {
		const volume = VolumeAnalysisCalculator.calculate(dummyPriceData, 20);
		console.log(`✅ 出来高分析: 相対出来高=${volume.relativeVolume.toFixed(2)}`);
	} catch (error: any) {
		console.log(`❌ 出来高分析エラー: ${error.message}`);
	}

	try {
		const vwap = VWAPCalculator.calculate(dummyPriceData, 1);
		console.log(`✅ VWAP: ¥${vwap.vwap.toFixed(2)} (${vwap.position})`);
	} catch (error: any) {
		console.log(`❌ VWAPエラー: ${error.message}`);
	}
}

// シグナルの日本語変換
function getJapaneseSignal(type: string, signal: string): string {
	const translations: { [key: string]: { [key: string]: string } } = {
		stochastic: {
			buy: "🟢 買いシグナル",
			sell: "🔴 売りシグナル",
			neutral: "⚪ ニュートラル",
		},
		state: {
			overbought: "🔴 買われすぎ",
			oversold: "🟢 売られすぎ",
			neutral: "⚪ 通常範囲",
		},
		cross: {
			golden_cross: "🟡 ゴールデンクロス",
			dead_cross: "💀 デッドクロス",
			none: "➡️ クロスなし",
		},
		cross_type: {
			golden_cross: "🟡 ゴールデンクロス",
			dead_cross: "💀 デッドクロス",
			none: "➡️ クロスなし",
		},
		strength: {
			strong: "💪 強い",
			moderate: "👍 中程度",
			weak: "👎 弱い",
		},
		consensus: {
			bullish: "📈 強気",
			bearish: "📉 弱気",
			mixed: "⚡ 混在",
			neutral: "➡️ 中立",
		},
		volume_trend: {
			increasing: "📈 増加中",
			decreasing: "📉 減少中",
			stable: "➡️ 安定",
		},
		accumulation: {
			accumulating: "🟢 蓄積中",
			distributing: "🔴 分散中",
			neutral: "⚪ 中立",
		},
		position: {
			above: "📈 VWAP上",
			below: "📉 VWAP下",
			at: "➡️ VWAP付近",
		},
		trend: {
			bullish: "📈 強気トレンド",
			bearish: "📉 弱気トレンド",
			neutral: "➡️ 中立",
		},
		breakout: {
			bullish_breakout: "🚀 上昇ブレイクアウト",
			bearish_breakout: "💥 下落ブレイクアウト",
			none: "⚪ ブレイクアウトなし",
		},
		reversion: {
			buy_reversion: "🟢 買い平均回帰",
			sell_reversion: "🔴 売り平均回帰",
			none: "⚪ 平均回帰なし",
		},
	};

	return translations[type]?.[signal] || signal;
}

// パフォーマンステスト
async function performanceTest() {
	console.log("\n" + "=".repeat(60));
	console.log("⚡ **パフォーマンステスト**");
	console.log("=".repeat(60));

	const testSymbols = ["6301.T", "7203.T"]; // コマツ、トヨタ

	for (const symbol of testSymbols) {
		console.log(`📊 ${symbol}のPhase2指標テスト中...`);
		try {
			const startTime = Date.now();
			
			const priceData = await TechnicalAnalyzer.fetchData(symbol, "3mo");
			const prices = priceData.map(d => d.close);
			
			// 全指標を並列で計算
			await Promise.all([
				BollingerBandsCalculator.calculate(prices),
				StochasticCalculator.calculateWithOHLC(priceData),
				CrossDetectionCalculator.detectCross(prices, 25, 75),
				VolumeAnalysisCalculator.calculate(priceData),
				VWAPCalculator.calculate(priceData),
			]);
			
			const endTime = Date.now();
			console.log(`✅ ${symbol}: ${endTime - startTime}ms`);
		} catch (error: any) {
			console.log(`❌ ${symbol}: ${error.message}`);
		}
	}
}

// メイン実行
async function main() {
	console.log("🎯 Phase2拡張機能テストスタート\n");

	// 1. メイン機能テスト
	await testPhase2Features();

	// 2. パフォーマンステスト
	await performanceTest();

	console.log("\n🎉 Phase2拡張機能テスト完了！");
	console.log("📋 実装された新機能:");
	console.log("  ✅ ボリンジャーバンド");
	console.log("  ✅ ストキャスティクス");
	console.log("  ✅ ゴールデンクロス・デッドクロス検出");
	console.log("  ✅ 出来高分析指標");
	console.log("  ✅ VWAP（出来高加重平均価格）");
}

// スクリプト実行（ES Module対応）
main().catch(console.error);

export {
	testPhase2Features,
	testBollingerBands,
	testStochastic,
	testCrossDetection,
	testVolumeAnalysis,
	testVWAP,
	performanceTest,
};