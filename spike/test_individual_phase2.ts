#!/usr/bin/env tsx

import {
	BollingerBandsCalculator,
	StochasticCalculator,
	CrossDetectionCalculator,
	VolumeAnalysisCalculator,
	VWAPCalculator,
	type PriceData,
} from "../src/lib/technical-indicators";

// 個別指標のテスト用ダミーデータ
function generateTestData(days: number): PriceData[] {
	const basePrice = 5000;
	const data: PriceData[] = [];
	
	for (let i = 0; i < days; i++) {
		const trend = i * 5; // 上昇トレンド
		const noise = Math.sin(i / 10) * 100 + (Math.random() - 0.5) * 50;
		const close = basePrice + trend + noise;
		
		data.push({
			date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
			open: close - Math.random() * 20 + 10,
			high: close + Math.random() * 30 + 10,
			low: close - Math.random() * 30 - 10,
			close,
			volume: Math.floor(Math.random() * 2000000) + 1000000,
		});
	}
	
	return data;
}

async function testIndividualIndicators() {
	console.log("🧪 個別指標の詳細テスト\n");

	// 十分なデータを生成
	const testData = generateTestData(250);
	const prices = testData.map(d => d.close);

	console.log(`テストデータ: ${testData.length}日分`);
	console.log(`価格範囲: ¥${Math.min(...prices).toFixed(0)} - ¥${Math.max(...prices).toFixed(0)}\n`);

	// 1. ボリンジャーバンド詳細テスト
	console.log("📈 **ボリンジャーバンド詳細テスト**");
	const bbResult = BollingerBandsCalculator.calculate(prices, 20, 2);
	console.log(`上部バンド: ¥${bbResult.upper.toLocaleString()}`);
	console.log(`中央線: ¥${bbResult.middle.toLocaleString()}`);
	console.log(`下部バンド: ¥${bbResult.lower.toLocaleString()}`);
	console.log(`バンド幅: ${(bbResult.bandwidth * 100).toFixed(2)}%`);
	console.log(`%B値: ${(bbResult.percentB * 100).toFixed(1)}%`);

	const bounceSignal = BollingerBandsCalculator.getBounceSignal(prices, 20, 3);
	console.log(`バウンス戦略: ${bounceSignal}`);

	const volatility = BollingerBandsCalculator.getVolatilityState(bbResult.bandwidth);
	console.log(`ボラティリティ: ${volatility}\n`);

	// 2. ストキャスティクス詳細テスト
	console.log("📊 **ストキャスティクス詳細テスト**");
	const stochResult = StochasticCalculator.calculateWithOHLC(testData, 14, 3);
	console.log(`%K値: ${stochResult.k.toFixed(2)}`);
	console.log(`%D値: ${stochResult.d.toFixed(2)}`);

	const stochSignal = StochasticCalculator.getSignal(stochResult);
	const stochState = StochasticCalculator.getOverboughtOversoldState(stochResult);
	const stochCross = StochasticCalculator.detectCross(testData, 14, 3);
	const stochMomentum = StochasticCalculator.getMomentum(testData, 14, 3);

	console.log(`シグナル: ${stochSignal}`);
	console.log(`状態: ${stochState}`);
	console.log(`クロス: ${stochCross}`);
	console.log(`モメンタム: ${stochMomentum}\n`);

	// 3. クロス検出詳細テスト
	console.log("⚡ **クロス検出詳細テスト**");
	const crossResult = CrossDetectionCalculator.detectCross(prices, 10, 30, 3);
	console.log(`クロスタイプ: ${crossResult.type}`);
	console.log(`短期MA: ¥${crossResult.shortMA.toLocaleString()}`);
	console.log(`長期MA: ¥${crossResult.longMA.toLocaleString()}`);
	console.log(`強度: ${crossResult.strength}`);
	console.log(`継続日数: ${crossResult.confirmationDays}日`);

	const trendSignal = CrossDetectionCalculator.getTrendFollowSignal(crossResult, 2);
	console.log(`トレンドフォローシグナル: ${trendSignal}`);

	const multiFrame = CrossDetectionCalculator.getMultiTimeframeAnalysis(prices);
	console.log(`多時間軸判断: ${multiFrame.consensus}\n`);

	// 4. 出来高分析詳細テスト
	console.log("📊 **出来高分析詳細テスト**");
	const volumeResult = VolumeAnalysisCalculator.calculate(testData, 20);
	console.log(`平均出来高: ${volumeResult.averageVolume.toLocaleString()}`);
	console.log(`相対出来高: ${volumeResult.relativeVolume.toFixed(2)}倍`);
	console.log(`トレンド: ${volumeResult.volumeTrend}`);
	console.log(`急増検出: ${volumeResult.volumeSpike ? "🔴 あり" : "⚪ なし"}`);
	console.log(`価格相関: ${volumeResult.priceVolumeStrength}`);
	console.log(`蓄積判定: ${volumeResult.accumulation}`);

	const cmf = VolumeAnalysisCalculator.calculateChaikinMoneyFlow(testData, 20);
	console.log(`チャイキンMF: ${cmf.toFixed(4)}`);

	const volumeProfile = VolumeAnalysisCalculator.calculateVolumeProfile(testData, 5);
	console.log(`出来高プロファイル上位3価格帯:`);
	volumeProfile.slice(0, 3).forEach((level, i) => {
		console.log(`  ${i + 1}. ¥${level.priceLevel.toLocaleString()}: ${level.percentage.toFixed(1)}%`);
	});
	console.log();

	// 5. VWAP詳細テスト
	console.log("💰 **VWAP詳細テスト**");
	const vwapResult = VWAPCalculator.calculate(testData, 2);
	console.log(`VWAP: ¥${vwapResult.vwap.toLocaleString()}`);
	console.log(`上部バンド: ¥${vwapResult.upperBand.toLocaleString()}`);
	console.log(`下部バンド: ¥${vwapResult.lowerBand.toLocaleString()}`);
	console.log(`標準偏差: ${vwapResult.deviation.toFixed(4)}`);
	console.log(`価格位置: ${vwapResult.position}`);
	console.log(`強度: ${vwapResult.strength}`);
	console.log(`トレンド: ${vwapResult.trend}`);

	const breakout = VWAPCalculator.detectBreakout(testData, 1.5);
	console.log(`ブレイクアウト: ${breakout}`);

	const reversion = VWAPCalculator.getReversionSignal(testData, 2.0);
	console.log(`平均回帰: ${reversion}`);

	const supportResistance = VWAPCalculator.getSupportResistanceLevel(testData, vwapResult.vwap);
	console.log(`サポレジ: ${supportResistance}`);

	const efficiency = VWAPCalculator.calculateVWAPEfficiency(testData);
	console.log(`VWAP効率性: ${efficiency.toFixed(4)}\n`);

	// 6. 配列計算のテスト
	console.log("📊 **配列計算テスト**");
	const bbArray = BollingerBandsCalculator.calculateArray(prices, 20, 2);
	console.log(`ボリンジャーバンド配列長: ${bbArray.upper.length}`);

	const stochArray = StochasticCalculator.calculateArray(testData, 14, 3);
	console.log(`ストキャスティクス配列長: ${stochArray.k.length}`);

	const vwapArray = VWAPCalculator.calculateArray(testData);
	console.log(`VWAP配列長: ${vwapArray.length}`);

	const movingVWAP = VWAPCalculator.calculateMovingVWAP(testData, 20);
	console.log(`移動VWAP配列長: ${movingVWAP.length}`);

	const relativeVolume = VolumeAnalysisCalculator.calculateRelativeVolumeArray(testData, 20);
	console.log(`相対出来高配列長: ${relativeVolume.length}\n`);

	console.log("🎉 個別指標詳細テスト完了！");
}

// メイン実行
testIndividualIndicators().catch(console.error);