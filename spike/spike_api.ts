#!/usr/bin/env tsx

import { TechnicalAnalyzer, StockAnalysisResult } from '../src/lib/technical-indicators';

// コマツ(6301.T)のテクニカル分析を実行
async function testKomatsuAnalysis() {
	console.log('='.repeat(60));
	console.log('📊 Technical Indicators Library - コマツ(6301.T)分析テスト');
	console.log('='.repeat(60));

	try {
		console.log('🔄 データ取得中...');
		const startTime = Date.now();

		// コマツのデータを取得して分析
		const result: StockAnalysisResult = await TechnicalAnalyzer.analyzeStock('6301.T', '1y');

		const endTime = Date.now();
		console.log(`✅ 分析完了 (${endTime - startTime}ms)\n`);

		// 結果の表示
		displayAnalysisResult(result);

	} catch (error: any) {
		console.error('❌ エラーが発生しました:', error.message);
		console.error('詳細:', error);
	}
}

// 分析結果の表示
function displayAnalysisResult(result: StockAnalysisResult) {
	console.log('📈 **分析結果**');
	console.log(`銘柄: ${result.symbol} (${result.companyName})`);
	console.log(`期間: ${result.period}`);
	console.log(`更新日時: ${new Date(result.lastUpdated).toLocaleString('ja-JP')}\n`);

	// 価格情報
	console.log('💰 **価格情報**');
	console.log(`現在価格: ¥${result.priceData.current.toLocaleString()}`);
	console.log(`前日比: ${result.priceData.change >= 0 ? '+' : ''}¥${result.priceData.change} (${result.priceData.changePercent >= 0 ? '+' : ''}${result.priceData.changePercent}%)\n`);

	// テクニカル指標
	console.log('📊 **テクニカル指標**');
	
	// 移動平均線
	console.log('移動平均線:');
	const { movingAverages } = result.technicalIndicators;
	console.log(`  25日MA: ¥${!isNaN(movingAverages.ma25) ? movingAverages.ma25.toLocaleString() : 'N/A'}`);
	console.log(`  50日MA: ¥${!isNaN(movingAverages.ma50) ? movingAverages.ma50.toLocaleString() : 'N/A'}`);
	console.log(`  200日MA: ¥${!isNaN(movingAverages.ma200) ? movingAverages.ma200.toLocaleString() : 'N/A'}`);

	// RSI
	console.log('\nRSI:');
	const { rsi } = result.technicalIndicators;
	console.log(`  14日RSI: ${!isNaN(rsi.rsi14) ? rsi.rsi14.toFixed(2) : 'N/A'}`);
	console.log(`  21日RSI: ${!isNaN(rsi.rsi21) ? rsi.rsi21.toFixed(2) : 'N/A'}`);

	// MACD
	console.log('\nMACD:');
	const { macd } = result.technicalIndicators;
	console.log(`  MACD: ${!isNaN(macd.macd) ? macd.macd.toFixed(3) : 'N/A'}`);
	console.log(`  Signal: ${!isNaN(macd.signal) ? macd.signal.toFixed(3) : 'N/A'}`);
	console.log(`  Histogram: ${!isNaN(macd.histogram) ? macd.histogram.toFixed(3) : 'N/A'}`);

	// シグナル
	console.log('\n🎯 **売買シグナル**');
	console.log(`トレンド: ${getJapaneseSignal('trend', result.signals.trend)}`);
	console.log(`モメンタム: ${getJapaneseSignal('momentum', result.signals.momentum)}`);
	console.log(`強度: ${getJapaneseSignal('strength', result.signals.strength)}\n`);

	// JSON形式での出力
	console.log('📄 **JSON出力 (AI用)**');
	console.log(JSON.stringify(result, null, 2));
}

// シグナルを日本語に変換
function getJapaneseSignal(type: string, signal: string): string {
	const translations: { [key: string]: { [key: string]: string } } = {
		trend: {
			upward: '📈 上昇トレンド',
			downward: '📉 下降トレンド',
			sideways: '➡️ 横ばい'
		},
		momentum: {
			positive: '🟢 ポジティブ',
			negative: '🔴 ネガティブ',
			neutral: '⚪ ニュートラル'
		},
		strength: {
			strong: '💪 強い',
			moderate: '👍 中程度',
			weak: '👎 弱い'
		}
	};

	return translations[type]?.[signal] || signal;
}

// 追加テスト: 個別指標の単体テスト
async function testIndividualIndicators() {
	console.log('\n' + '='.repeat(60));
	console.log('🔧 個別指標のテスト');
	console.log('='.repeat(60));

	try {
		// テスト用のダミーデータ
		const testPrices = [100, 102, 101, 105, 107, 106, 110, 108, 112, 115, 113, 118, 120, 119, 122];
		
		console.log('テストデータ:', testPrices.join(', '));

		// MovingAverageCalculatorのテスト
		console.log('\n📈 移動平均線テスト:');
		try {
			const { MovingAverageCalculator } = await import('../src/lib/technical-indicators');
			const ma5 = MovingAverageCalculator.calculate(testPrices, 5);
			const ma10 = MovingAverageCalculator.calculate(testPrices, 10);
			console.log(`5日MA: ${ma5}`);
			console.log(`10日MA: ${ma10}`);
		} catch (error: any) {
			console.log(`❌ 移動平均線テストエラー: ${error.message}`);
		}

		// RSICalculatorのテスト
		console.log('\n📊 RSIテスト:');
		try {
			const { RSICalculator } = await import('../src/lib/technical-indicators');
			const rsi14 = RSICalculator.calculate(testPrices, 14);
			console.log(`14日RSI: ${rsi14}`);
		} catch (error: any) {
			console.log(`❌ RSIテストエラー: ${error.message}`);
		}

		// MACDCalculatorのテスト
		console.log('\n⚡ MACDテスト:');
		try {
			const { MACDCalculator } = await import('../src/lib/technical-indicators');
			const macdResult = MACDCalculator.calculate(testPrices, 5, 10, 3); // 短期間で計算
			console.log(`MACD: ${macdResult.macd}`);
			console.log(`Signal: ${macdResult.signal}`);
			console.log(`Histogram: ${macdResult.histogram}`);
		} catch (error: any) {
			console.log(`❌ MACDテストエラー: ${error.message}`);
		}

	} catch (error: any) {
		console.error('❌ 個別テストエラー:', error.message);
	}
}

// エラーケースのテスト
async function testErrorCases() {
	console.log('\n' + '='.repeat(60));
	console.log('🚨 エラーケーステスト');
	console.log('='.repeat(60));

	// 不正なシンボルのテスト
	console.log('1. 不正なシンボルのテスト:');
	try {
		await TechnicalAnalyzer.analyzeStock('INVALID_SYMBOL', '1mo');
		console.log('❌ エラーが発生しませんでした');
	} catch (error: any) {
		console.log(`✅ 期待通りエラーが発生: ${error.message}`);
	}

	// 空のデータ配列のテスト
	console.log('\n2. 空のデータ配列のテスト:');
	try {
		const { TechnicalAnalyzer } = await import('../src/lib/technical-indicators');
		const analyzer = new TechnicalAnalyzer([]);
		analyzer.analyze('TEST');
		console.log('❌ エラーが発生しませんでした');
	} catch (error: any) {
		console.log(`✅ 期待通りエラーが発生: ${error.message}`);
	}
}

// パフォーマンステスト
async function testPerformance() {
	console.log('\n' + '='.repeat(60));
	console.log('⚡ パフォーマンステスト');
	console.log('='.repeat(60));

	const testSymbols = ['6301.T', '7203.T', '8058.T']; // コマツ、トヨタ、三菱商事

	for (const symbol of testSymbols) {
		console.log(`📊 ${symbol}の分析中...`);
		try {
			const startTime = Date.now();
			await TechnicalAnalyzer.analyzeStock(symbol, '6mo');
			const endTime = Date.now();
			console.log(`✅ ${symbol}: ${endTime - startTime}ms`);
		} catch (error: any) {
			console.log(`❌ ${symbol}: ${error.message}`);
		}
	}
}

// メイン実行
async function main() {
	console.log('🚀 Technical Indicators Library テストスタート\n');

	// 1. メイン機能テスト
	await testKomatsuAnalysis();

	// 2. 個別指標テスト
	await testIndividualIndicators();

	// 3. エラーケーステスト
	await testErrorCases();

	// 4. パフォーマンステスト
	await testPerformance();

	console.log('\n🎉 全テスト完了！');
}

// スクリプト実行（ES Module対応）
main().catch(console.error);

export { testKomatsuAnalysis, testIndividualIndicators, testErrorCases, testPerformance };