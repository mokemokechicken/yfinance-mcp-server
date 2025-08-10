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
	
	// Phase3 財務指標
	FinancialAnalyzer,
	MovingAverageDeviationCalculator,
	
	// Phase4 パラメータ化機能
	ConfigManager,
	ParameterValidator,
	
	// 型定義
	type StockAnalysisResult,
	type BollingerBandsResult,
	type StochasticResult,
	type CrossDetectionResult,
	type VolumeAnalysisResult,
	type VWAPResult,
	type PriceData,
	type FinancialMetricsResult,
	type MovingAverageDeviationResult,
	type RSIExtendedResult,
	type TechnicalParametersConfig,
	type ValidatedTechnicalParameters,
	type ParameterValidationResult,
	type ConfigSummary,
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
		
		const priceData = await TechnicalAnalyzer.fetchData(stockSymbol, "3mo");
		const closePrices = priceData.map(d => d.close);
		
		console.log("\n📊 直近データ:");
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

		// === Phase3: 財務指標 ===
		await testFinancialMetrics(stockSymbol, closePrices);

		// === Phase4: パラメータ化機能 ===
		await testParameterizationFeatures();

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

	// RSI (拡張機能含む)
	console.log("\n🔹 RSI (相対力指数) - 拡張版:");
	try {
		const rsiExtended: RSIExtendedResult = RSICalculator.calculateExtended(closePrices);
		
		console.log(`  14日RSI: ${rsiExtended.rsi14.toFixed(2)}`);
		console.log(`  21日RSI: ${rsiExtended.rsi21.toFixed(2)}`);
		console.log(`  14日シグナル: ${getJapaneseSignal("rsi_signal", rsiExtended.signal14)}`);
		console.log(`  21日シグナル: ${getJapaneseSignal("rsi_signal", rsiExtended.signal21)}`);

		const rsiComparison = RSICalculator.compareMultipleRSI(closePrices, [14, 21]);
		console.log(`  RSI収束/発散: ${getJapaneseSignal("rsi_trend", rsiComparison.trend)}`);
		console.log(`  総合推奨: ${getJapaneseSignal("recommendation", rsiComparison.recommendation)}`);
	} catch (error: any) {
		console.log(`  ❌ RSIエラー: ${error.message}`);
	}

	// 移動平均乖離率
	console.log("\n🔹 移動平均乖離率:");
	try {
		const deviationPeriods = [25, 50, 200];
		const deviationResults: MovingAverageDeviationResult[] = [];
		
		for (const period of deviationPeriods) {
			try {
				const deviation = MovingAverageDeviationCalculator.calculate(closePrices, period);
				deviationResults.push(deviation);
				const sign = deviation.deviation >= 0 ? "+" : "";
				console.log(`  ${period}日MA乖離: ${sign}${deviation.deviation.toFixed(2)}% (MA: ¥${deviation.movingAverage.toLocaleString()})`);
			} catch (error: any) {
				console.log(`  ${period}日MA乖離: データ不足`);
			}
		}

		if (deviationResults.length >= 2) {
			const overallSignal = MovingAverageDeviationCalculator.getOverallSignal(deviationResults);
			console.log(`  総合シグナル: ${getJapaneseSignal("deviation_signal", overallSignal.signal)}`);
			console.log(`  信頼度: ${getJapaneseSignal("confidence", overallSignal.confidence)}`);
		}
	} catch (error: any) {
		console.log(`  ❌ 移動平均乖離率エラー: ${error.message}`);
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

// Phase3: 財務指標のテスト
async function testFinancialMetrics(symbol: string, _closePrices: number[]) {
	console.log("💰 **Phase3: 財務指標**");
	console.log("-".repeat(50));

	// 財務指標取得
	console.log("🔹 企業財務指標:");
	try {
		const financialMetrics: FinancialMetricsResult = await FinancialAnalyzer.getFinancialMetrics(symbol);
		
		console.log(`  銘柄: ${financialMetrics.symbol}${financialMetrics.companyName ? ` (${financialMetrics.companyName})` : ""}`);
		console.log(`  時価総額: ${financialMetrics.marketCap ? `¥${financialMetrics.marketCap.toLocaleString()}` : "N/A"}`);
		console.log(`  PER（実績）: ${financialMetrics.trailingPE?.toFixed(2) || "N/A"}`);
		console.log(`  PER（予想）: ${financialMetrics.forwardPE?.toFixed(2) || "N/A"}`);
		console.log(`  PBR: ${financialMetrics.priceToBook?.toFixed(2) || "N/A"}`);
		console.log(`  ROE: ${financialMetrics.returnOnEquity ? financialMetrics.returnOnEquity.toFixed(2) + "%" : "N/A"}`);
		console.log(`  EPS成長率: ${financialMetrics.earningsGrowth ? (financialMetrics.earningsGrowth * 100).toFixed(2) + "%" : "N/A"}`);
		console.log(`  配当利回り: ${financialMetrics.dividendYield ? financialMetrics.dividendYield.toFixed(2) + "%" : "N/A"}`);
		console.log(`  自己資本比率: ${financialMetrics.equityRatio ? financialMetrics.equityRatio.toFixed(1) + "%" : "N/A"}`);

		// 財務指標の健全性チェック
		const validation = FinancialAnalyzer.validateMetrics(financialMetrics);
		console.log(`  データ充足率: ${validation.validCount}/${validation.totalCount} (${((validation.validCount / validation.totalCount) * 100).toFixed(1)}%)`);
		
		if (validation.missingFields.length > 0) {
			console.log(`  欠損項目: ${validation.missingFields.join(", ")}`);
		}

	} catch (error: any) {
		console.log(`  ❌ 財務指標取得エラー: ${error.message}`);
	}

	console.log();
}

// Phase4: パラメータ化機能のテスト
async function testParameterizationFeatures() {
	console.log("⚙️ **Phase4: パラメータ化機能**");
	console.log("-".repeat(50));

	// デフォルトパラメータの表示
	console.log("🔹 デフォルト設定:");
	try {
		const defaultValidation: ParameterValidationResult = ParameterValidator.validateAndSetDefaults();
		const defaultConfig: ValidatedTechnicalParameters = defaultValidation.validatedParams;
		
		console.log(`  移動平均線: [${defaultConfig.movingAverages.periods.join(", ")}]日`);
		console.log(`  RSI: 期間[${defaultConfig.rsi.periods.join(", ")}]日, 買われすぎ${defaultConfig.rsi.overbought}, 売られすぎ${defaultConfig.rsi.oversold}`);
		console.log(`  MACD: 短期${defaultConfig.macd.fastPeriod}日, 長期${defaultConfig.macd.slowPeriod}日, シグナル${defaultConfig.macd.signalPeriod}日`);
		console.log(`  ボリンジャーバンド: 期間${defaultConfig.bollingerBands.period}日, 標準偏差±${defaultConfig.bollingerBands.standardDeviations}σ`);
		console.log(`  ストキャスティクス: %K=${defaultConfig.stochastic.kPeriod}日, %D=${defaultConfig.stochastic.dPeriod}日, 買われすぎ${defaultConfig.stochastic.overbought}, 売られすぎ${defaultConfig.stochastic.oversold}`);
		console.log(`  出来高分析: 期間${defaultConfig.volumeAnalysis.period}日, 急増閾値${defaultConfig.volumeAnalysis.spikeThreshold}倍`);
		console.log(`  VWAP: 真の1日VWAP=${defaultConfig.vwap.enableTrueVWAP ? "有効" : "無効"}, 標準偏差±${defaultConfig.vwap.standardDeviations}σ`);
	} catch (error: any) {
		console.log(`  ❌ デフォルト設定取得エラー: ${error.message}`);
	}

	// カスタムパラメータのテスト
	console.log("\n🔹 カスタム設定テスト:");
	try {
		const customParams: TechnicalParametersConfig = {
			movingAverages: { periods: [10, 30, 100] },
			rsi: { periods: [9, 25], overbought: 75, oversold: 25 },
			macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 7 },
			bollingerBands: { period: 15, standardDeviations: 2.5 },
			stochastic: { kPeriod: 21, dPeriod: 5, overbought: 85, oversold: 15 },
			volumeAnalysis: { period: 30, spikeThreshold: 3.0 },
			vwap: { enableTrueVWAP: false, standardDeviations: 1.5 },
		};

		const customValidation: ParameterValidationResult = ParameterValidator.validateAndSetDefaults(customParams);
		const validatedConfig: ValidatedTechnicalParameters = customValidation.validatedParams;

		console.log(`  カスタム設定検証: ${customValidation.hasCustomSettings ? "✅ カスタム設定あり" : "⚠️ デフォルト設定"}`);
		console.log(`  警告数: ${customValidation.warnings.length}件`);

		if (customValidation.warnings.length > 0) {
			console.log("  ⚠️ 検証警告:");
			customValidation.warnings.forEach((warning) => {
				console.log(`    - ${warning.parameter}: ${warning.originalValue} → ${warning.correctedValue} (${warning.reason})`);
			});
		}

		console.log("\n  🔧 適用後のカスタム設定:");
		console.log(`  移動平均線: [${validatedConfig.movingAverages.periods.join(", ")}]日`);
		console.log(`  RSI: 期間[${validatedConfig.rsi.periods.join(", ")}]日, 買われすぎ${validatedConfig.rsi.overbought}, 売られすぎ${validatedConfig.rsi.oversold}`);
		console.log(`  MACD: 短期${validatedConfig.macd.fastPeriod}日, 長期${validatedConfig.macd.slowPeriod}日, シグナル${validatedConfig.macd.signalPeriod}日`);
		console.log(`  ボリンジャーバンド: 期間${validatedConfig.bollingerBands.period}日, 標準偏差±${validatedConfig.bollingerBands.standardDeviations}σ`);
		console.log(`  ストキャスティクス: %K=${validatedConfig.stochastic.kPeriod}日, %D=${validatedConfig.stochastic.dPeriod}日, 買われすぎ${validatedConfig.stochastic.overbought}, 売られすぎ${validatedConfig.stochastic.oversold}`);
		console.log(`  出来高分析: 期間${validatedConfig.volumeAnalysis.period}日, 急増閾値${validatedConfig.volumeAnalysis.spikeThreshold}倍`);
		console.log(`  VWAP: 真の1日VWAP=${validatedConfig.vwap.enableTrueVWAP ? "有効" : "無効"}, 標準偏差±${validatedConfig.vwap.standardDeviations}σ`);

		// 設定サマリーの生成テスト
		console.log("\n🔹 設定サマリー:");
		const configSummary: ConfigSummary = ConfigManager.generateConfigSummary(validatedConfig, customParams);
		console.log(`  カスタマイゼーション: ${configSummary.hasCustomizations ? "✅ あり" : "❌ なし"}`);
		console.log(`  総カスタムパラメータ数: ${configSummary.totalCustomParameters}個`);
		
		configSummary.sections.forEach((section) => {
			const status = section.isCustomized ? "🔧" : "⚙️";
			const display = ConfigManager.generateConfigDisplayString(section);
			console.log(`  ${status} ${display}`);
		});

	} catch (error: any) {
		console.log(`  ❌ カスタム設定テストエラー: ${error.message}`);
	}

	// 不正パラメータのテスト
	console.log("\n🔹 不正パラメータ検証テスト:");
	try {
		const invalidParams: TechnicalParametersConfig = {
			movingAverages: { periods: [-5, 500, 0] },
			rsi: { periods: [0, 150], overbought: 50, oversold: 80 }, // 逆転した値
			macd: { fastPeriod: 30, slowPeriod: 10, signalPeriod: 100 }, // fast > slowの不正な設定
			bollingerBands: { period: -1, standardDeviations: 10 },
			stochastic: { kPeriod: 200, dPeriod: -3, overbought: 40, oversold: 90 }, // 逆転した値
			volumeAnalysis: { period: 0, spikeThreshold: -1.5 },
			vwap: { enableTrueVWAP: true, standardDeviations: 0 },
		};

		const invalidValidation: ParameterValidationResult = ParameterValidator.validateAndSetDefaults(invalidParams);
		console.log(`  不正パラメータ検証: 警告数${invalidValidation.warnings.length}件`);
		
		if (invalidValidation.warnings.length > 0) {
			console.log("  🚫 検出された問題:");
			invalidValidation.warnings.slice(0, 8).forEach((warning) => { // 最大8件まで表示
				console.log(`    - ${warning.parameter}: ${JSON.stringify(warning.originalValue)} → ${JSON.stringify(warning.correctedValue)}`);
				console.log(`      理由: ${warning.reason}`);
			});
			if (invalidValidation.warnings.length > 8) {
				console.log(`    ... 他${invalidValidation.warnings.length - 8}件の警告`);
			}
		}

	} catch (error: any) {
		console.log(`  ❌ 不正パラメータテストエラー: ${error.message}`);
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
	
	console.log("\n**Phase3 財務指標:**");
	console.log("  💰 企業財務指標 (時価総額・PER・PBR・ROE等)");
	console.log("  📊 移動平均乖離率 (25日・50日・200日)");
	console.log("  📈 RSI拡張 (14日・21日比較分析)");
	console.log("  🔍 Yahoo Finance API統合");
	
	console.log("\n**Phase4 パラメータ化機能:**");
	console.log("  ⚙️ テクニカル指標パラメータのカスタマイズ");
	console.log("  🔧 設定値の検証とバリデーション");
	console.log("  📋 デフォルト値との統合管理");
	console.log("  🛡️ 不正値の自動補正機能");
	console.log("  📊 設定サマリーと可視化");
	
	console.log("\n**統合機能:**");
	console.log("  🎯 総合的な売買シグナル判定");
	console.log("  📊 トレンド・モメンタム・強度分析");
	console.log("  📋 包括的なテクニカル分析レポート");
	console.log("  💼 企業の財務健全性分析");
	
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
	testParameterizationFeatures,
	testIntegratedAnalysis,
	testWithDummyData,
};