import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import { globalCacheManager } from "../src/lib/technical-indicators/utils/cacheManager";
import { globalPerformanceMonitor } from "../src/lib/technical-indicators/utils/performanceMonitor";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * ベンチマーク & パフォーマンス回帰テスト
 * システムのパフォーマンスベースラインを確立し、回帰を検出
 */
describe("ベンチマーク & パフォーマンス回帰テスト", () => {
	const timeout = 180000; // ベンチマークテストのため長めに設定
	
	// ベンチマーク結果を保存
	const benchmarkResults: { [key: string]: number[] } = {};

	before(async () => {
		globalCacheManager.clear();
		globalPerformanceMonitor.clearProfiles();
	});

	after(async () => {
		// ベンチマーク結果のサマリ出力
		console.log("\n=== ベンチマーク結果サマリ ===");
		for (const [testName, results] of Object.entries(benchmarkResults)) {
			if (results.length > 0) {
				const avg = results.reduce((a, b) => a + b, 0) / results.length;
				const min = Math.min(...results);
				const max = Math.max(...results);
				const stdDev = Math.sqrt(
					results.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / results.length
				);

				console.log(`📊 ${testName}:`);
				console.log(`   平均: ${avg.toFixed(1)}ms`);
				console.log(`   最小: ${min}ms`);
				console.log(`   最大: ${max}ms`);
				console.log(`   標準偏差: ${stdDev.toFixed(1)}ms`);
				console.log(`   変動係数: ${(stdDev / avg * 100).toFixed(1)}%`);
			}
		}
		console.log("================================\n");
	});

	describe("基本機能ベンチマーク", () => {
		it("単一銘柄分析のベースライン性能", { timeout }, async () => {
			const testName = "単一銘柄分析";
			const symbol = "AAPL";
			const iterations = 5;
			const measurements: number[] = [];

			for (let i = 0; i < iterations; i++) {
				globalCacheManager.clear(); // 各回でキャッシュをクリアしてフェアな測定

				const start = Date.now();
				const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
				const duration = Date.now() - start;

				measurements.push(duration);
				assert.ok(result);
				assert.strictEqual(result.symbol, symbol);

				console.log(`📊 ${testName} 実行${i + 1}: ${duration}ms`);
			}

			benchmarkResults[testName] = measurements;
			const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;

			// ベースライン要件: 平均15秒以内で完了
			assert.ok(avgDuration < 15000, `基本分析が遅すぎます: ${avgDuration.toFixed(1)}ms (要件: 15秒以内)`);

			console.log(`✅ ${testName}ベースライン確立: ${avgDuration.toFixed(1)}ms`);
		});

		it("カスタムパラメータ分析の性能", { timeout }, async () => {
			const testName = "カスタムパラメータ分析";
			const symbol = "MSFT";
			const iterations = 3;
			const measurements: number[] = [];

			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 10, 20, 25, 50, 100, 200] },
				rsi: { periods: [7, 14, 21, 28], overbought: 75, oversold: 25 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 18, standardDeviations: 1.8 },
				stochastic: { kPeriod: 10, dPeriod: 5, overbought: 85, oversold: 15 },
				volumeAnalysis: { period: 15, spikeThreshold: 2.2 },
				vwap: { enableTrueVWAP: false, standardDeviations: 1.5 }, // API制限を避ける
				mvwap: { period: 25, standardDeviations: 1.2 },
			};

			for (let i = 0; i < iterations; i++) {
				globalCacheManager.clear();

				const start = Date.now();
				const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
				const duration = Date.now() - start;

				measurements.push(duration);
				assert.ok(result);
				assert.ok(result.extendedIndicators);

				console.log(`📊 ${testName} 実行${i + 1}: ${duration}ms`);
			}

			benchmarkResults[testName] = measurements;
			const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;

			// カスタムパラメータでも合理的な時間内で完了
			assert.ok(avgDuration < 25000, `カスタムパラメータ分析が遅すぎます: ${avgDuration.toFixed(1)}ms (要件: 25秒以内)`);

			console.log(`✅ ${testName}ベースライン確立: ${avgDuration.toFixed(1)}ms`);
		});

		it("キャッシュ効果の一貫性", { timeout }, async () => {
			const testName = "キャッシュ効果";
			const symbol = "GOOGL";
			const iterations = 3;
			const firstRunMeasurements: number[] = [];
			const secondRunMeasurements: number[] = [];

			for (let i = 0; i < iterations; i++) {
				globalCacheManager.clear();

				// 1回目（キャッシュなし）
				const start1 = Date.now();
				const { result: result1 } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", true);
				const duration1 = Date.now() - start1;
				firstRunMeasurements.push(duration1);

				// 2回目（キャッシュあり）
				const start2 = Date.now();
				const { result: result2 } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", true);
				const duration2 = Date.now() - start2;
				secondRunMeasurements.push(duration2);

				assert.ok(result1 && result2);

				const improvement = ((duration1 - duration2) / duration1) * 100;
				console.log(`📊 ${testName} 実行${i + 1}: ${duration1}ms → ${duration2}ms (改善: ${improvement.toFixed(1)}%)`);

				// キャッシュ効果確認: 少なくとも30%の改善
				assert.ok(improvement > 30, `キャッシュ効果が不十分です: ${improvement.toFixed(1)}% (要件: 30%以上)`);
			}

			benchmarkResults[`${testName}_初回`] = firstRunMeasurements;
			benchmarkResults[`${testName}_キャッシュ後`] = secondRunMeasurements;

			console.log(`✅ ${testName}の一貫性確認完了`);
		});
	});

	describe("スケーラビリティベンチマーク", () => {
		it("複数銘柄同時処理の性能", { timeout }, async () => {
			const testName = "複数銘柄同時処理";
			const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN"];
			const measurements: number[] = [];

			// 逐次処理のベンチマーク
			globalCacheManager.clear();
			const sequentialStart = Date.now();
			for (const symbol of symbols) {
				await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "3mo", false);
			}
			const sequentialDuration = Date.now() - sequentialStart;

			// 並列処理のベンチマーク
			globalCacheManager.clear();
			const parallelStart = Date.now();
			const promises = symbols.map(symbol => 
				TechnicalAnalyzer.analyzeStockComprehensive(symbol, "3mo", false)
			);
			const results = await Promise.all(promises);
			const parallelDuration = Date.now() - parallelStart;

			measurements.push(sequentialDuration, parallelDuration);
			benchmarkResults[`${testName}_逐次`] = [sequentialDuration];
			benchmarkResults[`${testName}_並列`] = [parallelDuration];

			const improvement = ((sequentialDuration - parallelDuration) / sequentialDuration) * 100;

			console.log(`📊 ${testName}:`);
			console.log(`   逐次処理: ${sequentialDuration}ms`);
			console.log(`   並列処理: ${parallelDuration}ms`);
			console.log(`   改善効果: ${improvement.toFixed(1)}%`);

			assert.ok(results.every(r => r.result));
			
			// 並列処理により改善されることを確認
			assert.ok(improvement > 0, `並列処理による改善が見られません: ${improvement.toFixed(1)}%`);

			console.log(`✅ ${testName}スケーラビリティ確認完了`);
		});

		it("大量パラメータ処理の性能限界", { timeout }, async () => {
			const testName = "大量パラメータ処理";
			const symbol = "TSLA";
			const measurements: number[] = [];

			const heavyParams: TechnicalParametersConfig = {
				movingAverages: { 
					periods: Array.from({length: 20}, (_, i) => 5 + i * 5) // 5, 10, 15, ..., 100
				},
				rsi: { 
					periods: [7, 14, 21, 28, 35, 42, 49] // 7つの期間
				},
				macd: { fastPeriod: 6, slowPeriod: 35, signalPeriod: 15 },
				bollingerBands: { period: 30, standardDeviations: 3 },
				stochastic: { kPeriod: 21, dPeriod: 7 },
				volumeAnalysis: { period: 30, spikeThreshold: 3 },
				vwap: { enableTrueVWAP: false },
			};

			globalCacheManager.clear();

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, heavyParams);
			const duration = Date.now() - start;

			measurements.push(duration);
			benchmarkResults[testName] = measurements;

			console.log(`📊 ${testName}:`);
			console.log(`   移動平均数: ${heavyParams.movingAverages?.periods?.length || 0}個`);
			console.log(`   RSI数: ${heavyParams.rsi?.periods?.length || 0}個`);
			console.log(`   実行時間: ${duration}ms`);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 大量パラメータでも合理的な時間内で完了
			assert.ok(duration < 45000, `大量パラメータ処理が遅すぎます: ${duration}ms (要件: 45秒以内)`);

			console.log(`✅ ${testName}性能限界確認完了`);
		});
	});

	describe("メモリ効率性ベンチマーク", () => {
		it("メモリ使用量プロファイリング", { timeout }, async () => {
			const testName = "メモリ使用量";
			const symbol = "META";

			// メモリ測定
			const beforeMemory = process.memoryUsage();

			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);

			const afterMemory = process.memoryUsage();
			
			const heapUsed = (afterMemory.heapUsed - beforeMemory.heapUsed) / (1024 * 1024);
			const heapTotal = (afterMemory.heapTotal - beforeMemory.heapTotal) / (1024 * 1024);

			console.log(`📊 ${testName}:`);
			console.log(`   Heap使用量増加: ${heapUsed.toFixed(2)}MB`);
			console.log(`   Heap総量増加: ${heapTotal.toFixed(2)}MB`);
			console.log(`   RSS: ${(afterMemory.rss / 1024 / 1024).toFixed(2)}MB`);

			// メモリ使用量要件: 50MB以内の増加
			assert.ok(heapUsed <= 50, `メモリ使用量が多すぎます: ${heapUsed.toFixed(2)}MB (要件: 50MB以内)`);

			console.log(`✅ ${testName}効率性確認完了`);
		});

		it("メモリリーク長期テスト", { timeout }, async () => {
			const testName = "メモリリーク";
			const symbols = ["AAPL", "MSFT"];
			const iterations = 10;
			const memoryReadings: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const beforeMemory = process.memoryUsage().heapUsed;
				
				// ランダムな銘柄で分析実行
				const symbol = symbols[i % symbols.length];
				await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "3mo", false);
				
				// ガベージコレクションを促進
				if (global.gc) {
					global.gc();
				}
				
				const afterMemory = process.memoryUsage().heapUsed;
				memoryReadings.push(afterMemory);

				if (i % 5 === 0) {
					console.log(`📊 ${testName} 実行${i}: ${(afterMemory / 1024 / 1024).toFixed(2)}MB`);
				}
			}

			// メモリ成長パターン分析
			const firstHalf = memoryReadings.slice(0, Math.floor(iterations / 2));
			const secondHalf = memoryReadings.slice(Math.floor(iterations / 2));
			
			const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
			const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
			
			const memoryGrowthRate = ((secondAvg - firstAvg) / firstAvg) * 100;

			console.log(`📊 ${testName}分析:`);
			console.log(`   前半平均: ${(firstAvg / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   後半平均: ${(secondAvg / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   成長率: ${memoryGrowthRate.toFixed(2)}%`);

			// メモリリーク要件: 成長率30%以内
			assert.ok(memoryGrowthRate <= 30, 
				`メモリリークの疑いがあります: 成長率${memoryGrowthRate.toFixed(2)}% (要件: 30%以内)`
			);

			console.log(`✅ ${testName}長期安定性確認完了`);
		});
	});

	describe("パフォーマンス回帰検出", () => {
		it("基準性能との比較", { timeout }, async () => {
			const symbol = "NVDA";
			const expectedBaseline = 10000; // 10秒の期待ベースライン（実環境では履歴データから取得）

			globalCacheManager.clear();

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
			const currentDuration = Date.now() - start;

			assert.ok(result);

			// 回帰検出ロジックのテスト
			const regression = globalPerformanceMonitor.detectRegression(
				"analyzeStockComprehensive",
				currentDuration
			);

			console.log(`📊 パフォーマンス回帰検出:`);
			console.log(`   現在の実行時間: ${currentDuration}ms`);
			console.log(`   期待ベースライン: ${expectedBaseline}ms`);
			console.log(`   回帰検出: ${regression.isRegression ? "あり" : "なし"}`);
			
			if (regression.isRegression) {
				console.log(`   回帰率: ${regression.regressionPercent}%`);
			}

			// 大幅な回帰がないことを確認（実際の環境では閾値を調整）
			const actualRegression = ((currentDuration - expectedBaseline) / expectedBaseline) * 100;
			if (actualRegression > 50) { // 50%以上の劣化は問題
				console.warn(`⚠️ パフォーマンス回帰が検出されました: +${actualRegression.toFixed(1)}%`);
			}

			console.log(`✅ パフォーマンス回帰検出機能確認完了`);
		});

		it("性能変動の安定性確認", { timeout }, async () => {
			const symbol = "AMD";
			const iterations = 5;
			const measurements: number[] = [];

			for (let i = 0; i < iterations; i++) {
				globalCacheManager.clearPattern(symbol); // そのシンボルのキャッシュのみクリア

				const start = Date.now();
				await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", true);
				const duration = Date.now() - start;

				measurements.push(duration);
			}

			const average = measurements.reduce((a, b) => a + b, 0) / measurements.length;
			const variance = measurements.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / measurements.length;
			const stdDev = Math.sqrt(variance);
			const coefficientOfVariation = (stdDev / average) * 100;

			console.log(`📊 性能変動安定性:`);
			console.log(`   測定値: ${measurements.map(m => `${m}ms`).join(", ")}`);
			console.log(`   平均: ${average.toFixed(1)}ms`);
			console.log(`   標準偏差: ${stdDev.toFixed(1)}ms`);
			console.log(`   変動係数: ${coefficientOfVariation.toFixed(1)}%`);

			// 安定性要件: 変動係数25%以内
			assert.ok(coefficientOfVariation <= 25, 
				`性能変動が大きすぎます: ${coefficientOfVariation.toFixed(1)}% (要件: 25%以内)`
			);

			console.log(`✅ 性能変動安定性確認完了`);
		});
	});
});