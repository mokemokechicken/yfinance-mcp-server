#!/usr/bin/env tsx

import {
	// 基本指標
	TechnicalAnalyzer,
	MovingAverageCalculator,
	RSICalculator,
	MACDCalculator,
	
	// Phase2 拡張指標
	BollingerBandsCalculator,
	StochasticCalculator,
	CrossDetectionCalculator,
	VolumeAnalysisCalculator,
	VWAPCalculator,
	
	// 型定義
	type StockAnalysisResult,
	type BollingerBandsResult,
	type StochasticResult,
	type CrossDetectionResult,
	type VolumeAnalysisResult,
	type VWAPResult,
	type PriceData,
} from "../src/lib/technical-indicators";

// 統合テクニカル指標テスト
async function testAllTechnicalIndicators(symbol?: string) {
	const stockSymbol = symbol || "6301.T"; // デフォルトはコマツ
	
	console.log("=".repeat(70));
	console.log("🚀 統合テクニカル指標テスト - 全機能デモンストレーション");
	console.log("=".repeat(70));

	try {
		// 実データでのテスト
		console.log(`📊 ${stockSymbol}の実データ分析...`);
		const startTime = Date.now();
		
		const priceData = await TechnicalAnalyzer.fetchData(stockSymbol, "14d");
		const closePrices = priceData.map(d => d.close);
		
		console.log("\n📊 直近14日のRawデータ:");
		console.log("Date\t\tOpen\tHigh\tLow\tClose\tVolume");
		console.log("-".repeat(80));
		priceData.forEach(data => {
			console.log(`${data.date.toLocaleDateString("ja-JP")}\t${data.open.toFixed(2)}\t${data.high.toFixed(2)}\t${data.low.toFixed(2)}\t${data.close.toFixed(2)}\t${data.volume.toLocaleString()}`);
		});
		
		const dataTime = Date.now();
		console.log(`✅ データ取得完了 (${priceData.length}日分) - ${dataTime - startTime}ms\n`);

		// === Phase1: 基本テクニカル指標 ===
		await testBasicIndicators(priceData, closePrices);

		// === Phase2: 拡張テクニカル指標 ===
		await testAdvancedIndicators(priceData, closePrices);

		// === 統合分析結果 ===
		await testIntegratedAnalysis(stockSymbol);

	} catch (error: any) {
		console.error("❌ 実データテストでエラー:", error.message);
		console.log("📝 ダミーデータでデモを継続...\n");
		
		// ダミーデータでのデモ
		await testWithDummyData();
	}
}

// Phase1: 基本指標のテスト
async function testBasicIndicators(priceData: PriceData[], closePrices: number[]) {
	console.log("📈 **Phase1: 基本テクニカル指標**");
	console.log("-".repeat(50));

	// 移動平均線
	console.log("🔹 移動平均線:");
	try {
		const ma25 = MovingAverageCalculator.calculate(closePrices, 25);
		const ma50 = MovingAverageCalculator.calculate(closePrices, 50);
		const ma200 = MovingAverageCalculator.calculate(closePrices, 200);
		
		console.log(`  25日MA: ¥${ma25.toLocaleString()}`);
		console.log(`  50日MA: ¥${ma50.toLocaleString()}`);
		console.log(`  200日MA: ¥${ma200.toLocaleString()}`);

		const trend = MovingAverageCalculator.getTrend(closePrices, 25, 5);
		console.log(`  トレンド判定: ${getJapaneseSignal("trend", trend)}`);
	} catch (error: any) {
		console.log(`  ❌ 移動平均線エラー: ${error.message}`);
	}

	// RSI
	console.log("\n🔹 RSI (相対力指数):");
	try {
		const rsi14 = RSICalculator.calculate(closePrices, 14);
		const rsi21 = RSICalculator.calculate(closePrices, 21);
		
		console.log(`  14日RSI: ${rsi14.toFixed(2)}`);
		console.log(`  21日RSI: ${rsi21.toFixed(2)}`);

		const rsiSignal = RSICalculator.getSignal(rsi14);
		const rsiMomentum = RSICalculator.getMomentum(closePrices, 14);
		console.log(`  シグナル: ${getJapaneseSignal("rsi_signal", rsiSignal)}`);
		console.log(`  モメンタム: ${getJapaneseSignal("momentum", rsiMomentum)}`);
	} catch (error: any) {
		console.log(`  ❌ RSIエラー: ${error.message}`);
	}

	// MACD
	console.log("\n🔹 MACD:");
	try {
		const macdResult = MACDCalculator.calculate(closePrices, 12, 26, 9);
		
		console.log(`  MACD: ${macdResult.macd.toFixed(3)}`);
		console.log(`  Signal: ${macdResult.signal.toFixed(3)}`);
		console.log(`  Histogram: ${macdResult.histogram.toFixed(3)}`);

		const macdSignal = MACDCalculator.getSignal(macdResult);
		console.log(`  シグナル: ${getJapaneseSignal("macd_signal", macdSignal)}`);
	} catch (error: any) {
		console.log(`  ❌ MACDエラー: ${error.message}`);
	}

	console.log();
}

// Phase2: 拡張指標のテスト
async function testAdvancedIndicators(priceData: PriceData[], closePrices: number[]) {
	console.log("🚀 **Phase2: 拡張テクニカル指標**");
	console.log("-".repeat(50));

	// ボリンジャーバンド
	console.log("🔹 ボリンジャーバンド:");
	try {
		const bbResult: BollingerBandsResult = BollingerBandsCalculator.calculate(closePrices, 20, 2);
		
		console.log(`  上部バンド: ¥${bbResult.upper.toLocaleString()}`);
		console.log(`  中央線: ¥${bbResult.middle.toLocaleString()}`);
		console.log(`  下部バンド: ¥${bbResult.lower.toLocaleString()}`);
		console.log(`  バンド幅: ${(bbResult.bandwidth * 100).toFixed(2)}%`);
		console.log(`  %B: ${(bbResult.percentB * 100).toFixed(1)}%`);

		const currentPrice = closePrices[closePrices.length - 1];
		const bbSignal = BollingerBandsCalculator.getSignal(bbResult, currentPrice);
		const volatility = BollingerBandsCalculator.getVolatilityState(bbResult.bandwidth);
		console.log(`  シグナル: ${getJapaneseSignal("bb_signal", bbSignal)}`);
		console.log(`  ボラティリティ: ${getJapaneseSignal("volatility", volatility)}`);
	} catch (error: any) {
		console.log(`  ❌ ボリンジャーバンドエラー: ${error.message}`);
	}

	// ストキャスティクス
	console.log("\n🔹 ストキャスティクス:");
	try {
		const stochResult: StochasticResult = StochasticCalculator.calculateWithOHLC(priceData, 14, 3);
		
		console.log(`  %K値: ${stochResult.k.toFixed(2)}`);
		console.log(`  %D値: ${stochResult.d.toFixed(2)}`);

		const stochSignal = StochasticCalculator.getSignal(stochResult);
		const stochState = StochasticCalculator.getOverboughtOversoldState(stochResult);
		console.log(`  シグナル: ${getJapaneseSignal("stoch_signal", stochSignal)}`);
		console.log(`  状態: ${getJapaneseSignal("stoch_state", stochState)}`);
	} catch (error: any) {
		console.log(`  ❌ ストキャスティクスエラー: ${error.message}`);
	}

	// ゴールデンクロス・デッドクロス検出
	console.log("\n🔹 クロス検出:");
	try {
		const crossResult: CrossDetectionResult = CrossDetectionCalculator.detectCross(closePrices, 25, 50, 3);
		
		console.log(`  クロスタイプ: ${getJapaneseSignal("cross_type", crossResult.type)}`);
		console.log(`  短期MA(25日): ¥${crossResult.shortMA.toLocaleString()}`);
		console.log(`  長期MA(50日): ¥${crossResult.longMA.toLocaleString()}`);
		console.log(`  強度: ${getJapaneseSignal("strength", crossResult.strength)}`);
		console.log(`  継続日数: ${crossResult.confirmationDays}日`);
	} catch (error: any) {
		console.log(`  ❌ クロス検出エラー: ${error.message}`);
	}

	// 出来高分析
	console.log("\n🔹 出来高分析:");
	try {
		const volumeResult: VolumeAnalysisResult = VolumeAnalysisCalculator.calculate(priceData, 20);
		
		console.log(`  平均出来高: ${volumeResult.averageVolume.toLocaleString()}`);
		console.log(`  相対出来高: ${volumeResult.relativeVolume.toFixed(2)}倍`);
		console.log(`  トレンド: ${getJapaneseSignal("volume_trend", volumeResult.volumeTrend)}`);
		console.log(`  急増検出: ${volumeResult.volumeSpike ? "🔴 あり" : "⚪ なし"}`);
		console.log(`  価格相関: ${getJapaneseSignal("strength", volumeResult.priceVolumeStrength)}`);
		console.log(`  蓄積判定: ${getJapaneseSignal("accumulation", volumeResult.accumulation)}`);

		const cmf = VolumeAnalysisCalculator.calculateChaikinMoneyFlow(priceData, 20);
		console.log(`  チャイキンMF: ${cmf.toFixed(4)}`);
	} catch (error: any) {
		console.log(`  ❌ 出来高分析エラー: ${error.message}`);
	}

	// VWAP
	console.log("\n🔹 VWAP (出来高加重平均価格):");
	try {
		const vwapResult: VWAPResult = VWAPCalculator.calculate(priceData, 1);
		
		console.log(`  VWAP: ¥${vwapResult.vwap.toLocaleString()}`);
		console.log(`  上部バンド: ¥${vwapResult.upperBand.toLocaleString()}`);
		console.log(`  下部バンド: ¥${vwapResult.lowerBand.toLocaleString()}`);
		console.log(`  価格位置: ${getJapaneseSignal("position", vwapResult.position)}`);
		console.log(`  シグナル強度: ${getJapaneseSignal("strength", vwapResult.strength)}`);
		console.log(`  トレンド: ${getJapaneseSignal("trend", vwapResult.trend)}`);

		const breakout = VWAPCalculator.detectBreakout(priceData, 1.5);
		console.log(`  ブレイクアウト: ${getJapaneseSignal("breakout", breakout)}`);
	} catch (error: any) {
		console.log(`  ❌ VWAPエラー: ${error.message}`);
	}

	console.log();
}

// 統合分析のテスト
async function testIntegratedAnalysis(symbol?: string) {
	const stockSymbol = symbol || "6301.T"; // デフォルトはコマツ
	
	console.log("🎯 **統合分析結果**");
	console.log("-".repeat(50));

	try {
		const result: StockAnalysisResult = await TechnicalAnalyzer.analyzeStock(stockSymbol, "1y");
		
		console.log("📊 総合分析レポート:");
		console.log(`銘柄: ${result.symbol} (${result.companyName})`);
		console.log(`分析期間: ${result.period}`);
		console.log(`更新日時: ${new Date(result.lastUpdated).toLocaleString("ja-JP")}`);
		
		console.log("\n💰 価格情報:");
		console.log(`現在価格: ¥${result.priceData.current.toLocaleString()}`);
		console.log(`前日比: ${result.priceData.change >= 0 ? "+" : ""}¥${result.priceData.change} (${result.priceData.changePercent >= 0 ? "+" : ""}${result.priceData.changePercent}%)`);
		
		console.log("\n🎯 売買シグナル:");
		console.log(`トレンド: ${getJapaneseSignal("trend", result.signals.trend)}`);
		console.log(`モメンタム: ${getJapaneseSignal("momentum", result.signals.momentum)}`);
		console.log(`強度: ${getJapaneseSignal("strength", result.signals.strength)}`);

		console.log("\n📋 主要テクニカル指標:");
		const { technicalIndicators } = result;
		console.log(`  25日MA: ¥${technicalIndicators.movingAverages.ma25?.toLocaleString() || "N/A"}`);
		console.log(`  50日MA: ¥${technicalIndicators.movingAverages.ma50?.toLocaleString() || "N/A"}`);
		console.log(`  14日RSI: ${technicalIndicators.rsi.rsi14?.toFixed(2) || "N/A"}`);
		console.log(`  MACD: ${technicalIndicators.macd.macd.toFixed(3)} / Signal: ${technicalIndicators.macd.signal.toFixed(3)}`);

	} catch (error: any) {
		console.log(`❌ 統合分析エラー: ${error.message}`);
	}

	console.log();
}

// ダミーデータでのテスト
async function testWithDummyData() {
	console.log("🧪 **ダミーデータデモ**");
	console.log("-".repeat(50));
	
	// より現実的なダミーデータを生成
	const dummyPrices = Array.from({ length: 100 }, (_, i) => {
		const base = 5000;
		const trend = i * 3; // 上昇トレンド
		const volatility = Math.sin(i / 8) * 80 + (Math.random() - 0.5) * 60;
		return base + trend + volatility;
	});

	const dummyPriceData: PriceData[] = dummyPrices.map((close, i) => ({
		date: new Date(Date.now() - (dummyPrices.length - i) * 24 * 60 * 60 * 1000),
		open: close - Math.random() * 30 + 15,
		high: close + Math.random() * 40 + 10,
		low: close - Math.random() * 40 - 10,
		close,
		volume: Math.floor(Math.random() * 2000000) + 800000,
	}));

	console.log(`生成データ: ${dummyPriceData.length}日分`);
	console.log(`価格範囲: ¥${Math.min(...dummyPrices).toFixed(0)} - ¥${Math.max(...dummyPrices).toFixed(0)}`);

	// 各指標をテスト
	const testResults = [
		{ 
			name: "移動平均線", 
			test: () => MovingAverageCalculator.calculate(dummyPrices, 25).toFixed(2) 
		},
		{ 
			name: "RSI", 
			test: () => RSICalculator.calculate(dummyPrices, 14).toFixed(2) 
		},
		{ 
			name: "MACD", 
			test: () => {
				const macd = MACDCalculator.calculate(dummyPrices, 12, 26, 9);
				return `${macd.macd.toFixed(3)}/${macd.signal.toFixed(3)}`;
			}
		},
		{ 
			name: "ボリンジャーバンド", 
			test: () => {
				const bb = BollingerBandsCalculator.calculate(dummyPrices, 20, 2);
				return `${bb.middle.toFixed(0)}±${((bb.upper - bb.lower) / 2).toFixed(0)}`;
			}
		},
		{ 
			name: "ストキャスティクス", 
			test: () => {
				const stoch = StochasticCalculator.calculateWithOHLC(dummyPriceData, 14, 3);
				return `%K=${stoch.k.toFixed(1)}, %D=${stoch.d.toFixed(1)}`;
			}
		},
		{ 
			name: "VWAP", 
			test: () => {
				const vwap = VWAPCalculator.calculate(dummyPriceData, 1);
				return `¥${vwap.vwap.toFixed(0)} (${vwap.position})`;
			}
		}
	];

	testResults.forEach(({ name, test }) => {
		try {
			const result = test();
			console.log(`✅ ${name}: ${result}`);
		} catch (error: any) {
			console.log(`❌ ${name}: ${error.message}`);
		}
	});

	console.log();
}

// シグナルの日本語変換
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
	};

	return translations[type]?.[signal] || signal;
}

// 機能一覧の表示
function displayFeatureSummary() {
	console.log("📋 **実装機能一覧**");
	console.log("=".repeat(70));
	
	console.log("**Phase1 基本指標:**");
	console.log("  📈 移動平均線 (25日/50日/200日)");
	console.log("  📊 RSI (14日/21日)");
	console.log("  ⚡ MACD (12-26-9設定)");
	
	console.log("\n**Phase2 拡張指標:**");
	console.log("  📈 ボリンジャーバンド (20日±2σ)");
	console.log("  📊 ストキャスティクス (14-3設定)");
	console.log("  🔄 ゴールデンクロス・デッドクロス検出");
	console.log("  📊 出来高分析 (相対出来高・蓄積判定)");
	console.log("  💰 VWAP (出来高加重平均価格)");
	
	console.log("\n**統合機能:**");
	console.log("  🎯 総合的な売買シグナル判定");
	console.log("  📊 トレンド・モメンタム・強度分析");
	console.log("  📋 包括的なテクニカル分析レポート");
	
	console.log("\n**技術仕様:**");
	console.log("  🛠️ TypeScript + Yahoo Finance API");
	console.log("  📦 モジュラー設計・拡張可能");
	console.log("  🚀 エラーハンドリング完備");
	console.log("  ⚡ 高性能な計算エンジン");
	
	console.log();
}

// メイン実行
async function main() {
	const stockSymbol = process.argv[2]; // コマンドライン引数から銘柄コードを取得
	
	displayFeatureSummary();
	
	console.log("🎬 統合テクニカル指標テスト開始\n");
	if (stockSymbol) {
		console.log(`📊 指定された銘柄: ${stockSymbol}\n`);
	} else {
		console.log("📊 デフォルト銘柄: 6301.T (コマツ)\n");
	}
	
	const startTime = Date.now();

	await testAllTechnicalIndicators(stockSymbol);

	const endTime = Date.now();
	console.log("=".repeat(70));
	console.log(`🎉 全テスト完了！ (実行時間: ${endTime - startTime}ms)`);
	console.log("✨ Yahoo Finance MCP Server - Technical Indicators Library");
	console.log("📊 プロ仕様のテクニカル分析が利用可能です");
	console.log("=".repeat(70));
}

// スクリプト実行
main().catch(console.error);

export {
	testAllTechnicalIndicators,
	testBasicIndicators,
	testAdvancedIndicators,
	testIntegratedAnalysis,
	testWithDummyData,
};