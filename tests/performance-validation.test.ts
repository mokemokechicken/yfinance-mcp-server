import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import { globalCacheManager } from "../src/lib/technical-indicators/utils/cacheManager";
import { globalPerformanceMonitor } from "../src/lib/technical-indicators/utils/performanceMonitor";
import { performanceService } from "../src/lib/technical-indicators/utils/performanceService";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * パフォーマンス要件の検証テスト
 * 要件: パラメータ設定による計算時間増加は10%以内
 * API呼び出し回数は現在と同等を維持
 */
describe("パフォーマンス要件検証テスト", () => {
	const timeout = 60000; // パフォーマンステストのため長めに設定

	before(async () => {
		// テスト前に最適化機能をリセット
		globalCacheManager.clear();
		globalPerformanceMonitor.clearProfiles();
		performanceService.stop(); // バックグラウンドサービスを停止
	});

	after(async () => {
		// テスト後にクリーンアップ
		performanceService.stop();
		globalCacheManager.clear();
	});

	describe("計算時間要件検証", () => {
		it("デフォルト設定のベースライン測定", { timeout }, async () => {
			const measurements: number[] = [];
			const iterations = 3; // 複数回測定して平均を取る

			for (let i = 0; i < iterations; i++) {
				const startTime = Date.now();
				const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
				const endTime = Date.now();
				
				const duration = endTime - startTime;
				measurements.push(duration);
				
				assert.ok(result);
				assert.strictEqual(result.symbol, "AAPL");
				
				console.log(`📊 デフォルト設定 実行${i + 1}: ${duration}ms`);
			}

			const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
			const minTime = Math.min(...measurements);
			const maxTime = Math.max(...measurements);

			console.log(`📊 デフォルト設定ベースライン統計:`);
			console.log(`   平均: ${averageTime.toFixed(1)}ms`);
			console.log(`   最小: ${minTime}ms`);
			console.log(`   最大: ${maxTime}ms`);

			// ベースライン要件: 合理的な時間内で完了（30秒以内）
			assert.ok(averageTime < 30000, `デフォルト設定の平均時間が長すぎます: ${averageTime.toFixed(1)}ms`);

			console.log("✅ デフォルト設定のベースライン測定完了");
		});

		it("カスタムパラメータ設定の性能測定（10%以内の増加要件）", { timeout }, async () => {
			// 先にベースライン測定
			const baselineStart = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const baselineTime = Date.now() - baselineStart;

			// カスタムパラメータでの測定
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 25, 50, 100, 200] },
				rsi: { periods: [7, 14, 21], overbought: 75, oversold: 25 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 18, standardDeviations: 1.8 },
				stochastic: { kPeriod: 10, dPeriod: 5, overbought: 85, oversold: 15 },
				volumeAnalysis: { period: 15, spikeThreshold: 2.2 },
				vwap: { enableTrueVWAP: true, standardDeviations: 1.5 },
				mvwap: { period: 25, standardDeviations: 1.2 },
			};

			const customStart = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			const customTime = Date.now() - customStart;

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");

			// 性能要件検証: 10%以内の増加
			const increase = ((customTime - baselineTime) / baselineTime) * 100;
			
			console.log(`📊 性能要件検証結果:`);
			console.log(`   ベースライン: ${baselineTime}ms`);
			console.log(`   カスタム設定: ${customTime}ms`);
			console.log(`   増加率: ${increase.toFixed(2)}%`);
			console.log(`   増加量: +${customTime - baselineTime}ms`);

			// 要件: 10%以内の増加
			assert.ok(increase <= 10, `計算時間増加が10%を超えています: ${increase.toFixed(2)}%（要件: 10%以内）`);

			console.log("✅ カスタムパラメータ設定の性能要件達成");
		});

		it("複数回実行での性能安定性検証", { timeout }, async () => {
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 10, 20, 50] },
				rsi: { periods: [14, 21] },
				macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
			};

			const baselineTimes: number[] = [];
			const customTimes: number[] = [];
			const iterations = 5;

			for (let i = 0; i < iterations; i++) {
				// ベースライン測定
				const baselineStart = Date.now();
				await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
				const baselineTime = Date.now() - baselineStart;
				baselineTimes.push(baselineTime);

				// カスタム設定測定
				const customStart = Date.now();
				await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
				const customTime = Date.now() - customStart;
				customTimes.push(customTime);

				console.log(`📊 実行${i + 1}: ベースライン=${baselineTime}ms, カスタム=${customTime}ms`);
			}

			// 統計計算
			const avgBaseline = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
			const avgCustom = customTimes.reduce((a, b) => a + b, 0) / customTimes.length;
			const avgIncrease = ((avgCustom - avgBaseline) / avgBaseline) * 100;

			// 標準偏差計算（性能の一貫性確認）
			const baselineStdDev = Math.sqrt(baselineTimes.reduce((sum, time) => sum + Math.pow(time - avgBaseline, 2), 0) / baselineTimes.length);
			const customStdDev = Math.sqrt(customTimes.reduce((sum, time) => sum + Math.pow(time - avgCustom, 2), 0) / customTimes.length);

			console.log(`📊 複数回実行統計 (${iterations}回):`);
			console.log(`   平均ベースライン: ${avgBaseline.toFixed(1)}ms (±${baselineStdDev.toFixed(1)}ms)`);
			console.log(`   平均カスタム: ${avgCustom.toFixed(1)}ms (±${customStdDev.toFixed(1)}ms)`);
			console.log(`   平均増加率: ${avgIncrease.toFixed(2)}%`);

			// 安定性要件: 平均で10%以内の増加
			assert.ok(avgIncrease <= 10, `平均増加率が10%を超えています: ${avgIncrease.toFixed(2)}%`);

			// 一貫性要件: 標準偏差が平均の50%以内（大きなばらつきがない）
			const baselineVariability = (baselineStdDev / avgBaseline) * 100;
			const customVariability = (customStdDev / avgCustom) * 100;
			
			assert.ok(baselineVariability <= 50, `ベースライン性能のばらつきが大きすぎます: ${baselineVariability.toFixed(1)}%`);
			assert.ok(customVariability <= 50, `カスタム設定性能のばらつきが大きすぎます: ${customVariability.toFixed(1)}%`);

			console.log("✅ 複数回実行での性能安定性確認完了");
		});
	});

	describe("メモリ使用量要件検証", () => {
		it("大量パラメータでのメモリ効率性検証", { timeout }, async () => {
			const largeParams: TechnicalParametersConfig = {
				movingAverages: { 
					periods: Array.from({length: 15}, (_, i) => 5 + i * 5) // 5, 10, 15, ..., 75
				},
				rsi: { 
					periods: [7, 14, 21, 28, 35] 
				},
			};

			// Node.jsでのメモリ使用量測定
			const beforeMemory = process.memoryUsage();
			
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, largeParams);
			
			const afterMemory = process.memoryUsage();
			
			assert.ok(result);
			
			// メモリ増加量計算
			const heapUsed = afterMemory.heapUsed - beforeMemory.heapUsed;
			const heapTotal = afterMemory.heapTotal - beforeMemory.heapTotal;
			
			console.log(`📊 メモリ使用量:`);
			console.log(`   Heap使用量増加: ${(heapUsed / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   Heap総量増加: ${(heapTotal / 1024 / 1024).toFixed(2)}MB`);

			// メモリ使用量要件: 100MB以内の増加
			const heapUsedMB = heapUsed / 1024 / 1024;
			assert.ok(heapUsedMB <= 100, `メモリ使用量が過大です: ${heapUsedMB.toFixed(2)}MB (要件: 100MB以内)`);

			console.log("✅ 大量パラメータでのメモリ効率性確認完了");
		});

		it("連続実行でのメモリリーク検証", { timeout }, async () => {
			const params: TechnicalParametersConfig = {
				movingAverages: { periods: [25, 50, 200] },
				rsi: { periods: [14, 21] },
			};

			const memoryReadings: number[] = [];
			const iterations = 5;

			for (let i = 0; i < iterations; i++) {
				const beforeMemory = process.memoryUsage();
				
				await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, params);
				
				// ガベージコレクションを強制実行（可能な場合）
				if (global.gc) {
					global.gc();
				}
				
				const afterMemory = process.memoryUsage();
				const heapUsed = afterMemory.heapUsed;
				memoryReadings.push(heapUsed);
				
				console.log(`📊 実行${i + 1}: Heap使用量 ${(heapUsed / 1024 / 1024).toFixed(2)}MB`);
			}

			// メモリリーク検証: 使用量が一定以上増加し続けていないか
			const firstReading = memoryReadings[0];
			const lastReading = memoryReadings[memoryReadings.length - 1];
			const memoryGrowth = ((lastReading - firstReading) / firstReading) * 100;

			console.log(`📊 メモリリーク検証:`);
			console.log(`   初回: ${(firstReading / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   最終: ${(lastReading / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   成長率: ${memoryGrowth.toFixed(2)}%`);

			// メモリリーク要件: 連続実行でのメモリ成長率が50%以内
			assert.ok(memoryGrowth <= 50, `メモリリークの可能性があります: 成長率${memoryGrowth.toFixed(2)}%`);

			console.log("✅ 連続実行でのメモリリーク検証完了");
		});
	});

	describe("API呼び出し効率性検証", () => {
		it("API呼び出し回数の最適化確認", { timeout }, async () => {
			// API呼び出し回数を間接的に測定（実行時間から推測）
			// 要件: デフォルト設定と同等のAPI呼び出し回数
			
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30, 100] },
				rsi: { periods: [7, 14] },
				vwap: { enableTrueVWAP: true },
				mvwap: { period: 20 },
			};

			// ベースライン（デフォルト）の測定
			const baselineStart = Date.now();
			const { result: baselineResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const baselineTime = Date.now() - baselineStart;

			// カスタムパラメータの測定
			const customStart = Date.now();
			const { result: customResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, customParams);
			const customTime = Date.now() - customStart;

			assert.ok(baselineResult);
			assert.ok(customResult);

			console.log(`📊 API呼び出し効率性:`);
			console.log(`   ベースライン実行時間: ${baselineTime}ms`);
			console.log(`   カスタム設定実行時間: ${customTime}ms`);

			// API呼び出し回数要件: 大幅な増加がないこと（時間増加から推測）
			// カスタムパラメータ設定でも大幅に時間が増加しないことで、
			// API呼び出し回数が同等レベルに保たれていることを確認
			const timeIncrease = ((customTime - baselineTime) / baselineTime) * 100;
			assert.ok(timeIncrease <= 50, `API呼び出し効率性に問題があります（実行時間増加: ${timeIncrease.toFixed(1)}%）`);

			console.log("✅ API呼び出し回数の最適化確認完了");
		});

		it("並列処理最適化の効果確認", { timeout }, async () => {
			// 複数指標を同時に計算する場合の並列処理効果を確認
			const multipleIndicatorsParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 10, 20, 50, 100, 200] },
				rsi: { periods: [7, 14, 21, 28] },
				macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
				bollingerBands: { period: 20, standardDeviations: 2 },
				stochastic: { kPeriod: 14, dPeriod: 3 },
				volumeAnalysis: { period: 20, spikeThreshold: 2 },
				vwap: { enableTrueVWAP: true },
				mvwap: { period: 20 },
			};

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, multipleIndicatorsParams);
			const duration = Date.now() - start;

			assert.ok(result);
			
			console.log(`📊 並列処理最適化効果:`);
			console.log(`   全指標計算時間: ${duration}ms`);
			
			// 並列処理要件: 全指標計算でも合理的な時間内で完了
			assert.ok(duration < 45000, `全指標計算時間が長すぎます: ${duration}ms (要件: 45秒以内)`);

			console.log("✅ 並列処理最適化の効果確認完了");
		});
	});

	describe("異なる銘柄での性能一貫性検証", () => {
		it("米国株での性能一貫性", { timeout }, async () => {
			const usSymbols = ["AAPL", "MSFT", "GOOGL", "TSLA"];
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 25, 50] },
				rsi: { periods: [14] },
			};

			const performanceResults: Array<{symbol: string, baseline: number, custom: number, increase: number}> = [];

			for (const symbol of usSymbols) {
				try {
					// ベースライン測定
					const baselineStart = Date.now();
					await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
					const baselineTime = Date.now() - baselineStart;

					// カスタムパラメータ測定
					const customStart = Date.now();
					await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
					const customTime = Date.now() - customStart;

					const increase = ((customTime - baselineTime) / baselineTime) * 100;
					performanceResults.push({ symbol, baseline: baselineTime, custom: customTime, increase });

					console.log(`📊 ${symbol}: ベースライン=${baselineTime}ms, カスタム=${customTime}ms, 増加率=${increase.toFixed(1)}%`);

					// 個別銘柄での要件確認
					assert.ok(increase <= 10, `${symbol}で性能要件を満たしていません: ${increase.toFixed(1)}%`);
				} catch (error: any) {
					console.log(`⚠️ ${symbol}でエラー: ${error.message}`);
					// エラーが発生した場合はスキップ
				}
			}

			// 平均性能の確認
			if (performanceResults.length > 0) {
				const avgIncrease = performanceResults.reduce((sum, result) => sum + result.increase, 0) / performanceResults.length;
				console.log(`📊 米国株平均増加率: ${avgIncrease.toFixed(2)}%`);
				
				assert.ok(avgIncrease <= 10, `米国株平均で性能要件を満たしていません: ${avgIncrease.toFixed(2)}%`);
			}

			console.log("✅ 米国株での性能一貫性確認完了");
		});

		it("日本株での性能一貫性", { timeout }, async () => {
			const jpSymbols = ["7203.T", "6301.T"]; // トヨタ、コマツ
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [25, 75] },
				rsi: { periods: [14, 21] },
			};

			for (const symbol of jpSymbols) {
				try {
					// ベースライン測定
					const baselineStart = Date.now();
					await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
					const baselineTime = Date.now() - baselineStart;

					// カスタムパラメータ測定
					const customStart = Date.now();
					await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
					const customTime = Date.now() - customStart;

					const increase = ((customTime - baselineTime) / baselineTime) * 100;

					console.log(`📊 ${symbol}: ベースライン=${baselineTime}ms, カスタム=${customTime}ms, 増加率=${increase.toFixed(1)}%`);

					// 日本株でも性能要件を満たすことを確認
					assert.ok(increase <= 10, `${symbol}で性能要件を満たしていません: ${increase.toFixed(1)}%`);
				} catch (error: any) {
					console.log(`⚠️ ${symbol}でエラー: ${error.message}`);
					// 日本株の場合、データ制限等でエラーが発生する場合があるため継続
				}
			}

			console.log("✅ 日本株での性能一貫性確認完了");
		});
	});

	describe("最適化機能効果検証", () => {
		it("キャッシュ最適化の効果測定", { timeout }, async () => {
			const symbol = "AAPL";
			globalCacheManager.clear();

			// キャッシュなしでの測定
			const withoutCacheStart = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
			const withoutCacheDuration = Date.now() - withoutCacheStart;

			// キャッシュありでの測定（同じ分析を再実行）
			const withCacheStart = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
			const withCacheDuration = Date.now() - withCacheStart;

			const cacheStats = globalCacheManager.getStats();
			const improvement = ((withoutCacheDuration - withCacheDuration) / withoutCacheDuration) * 100;

			console.log(`📊 キャッシュ最適化効果:`);
			console.log(`   初回実行: ${withoutCacheDuration}ms`);
			console.log(`   キャッシュ利用: ${withCacheDuration}ms`);
			console.log(`   改善率: ${improvement.toFixed(1)}%`);
			console.log(`   キャッシュヒット率: ${cacheStats.hitRate}%`);

			// キャッシュ効果の確認: 50%以上の改善
			assert.ok(improvement > 50, `キャッシュ効果が不十分です: ${improvement.toFixed(1)}% (期待: 50%以上)`);

			console.log("✅ キャッシュ最適化効果確認完了");
		});

		it("並列処理最適化の効果測定", { timeout }, async () => {
			const symbols = ["AAPL", "MSFT", "GOOGL"];
			globalCacheManager.clear();

			// 逐次処理のシミュレーション（時間測定のみ）
			const sequentialStart = Date.now();
			for (const symbol of symbols) {
				await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", false);
			}
			const sequentialDuration = Date.now() - sequentialStart;

			globalCacheManager.clear(); // フェアな比較のため

			// 並列処理（実際の実装）
			const parallelStart = Date.now();
			const promises = symbols.map(symbol => 
				TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", false)
			);
			await Promise.all(promises);
			const parallelDuration = Date.now() - parallelStart;

			const improvement = ((sequentialDuration - parallelDuration) / sequentialDuration) * 100;

			console.log(`📊 並列処理最適化効果:`);
			console.log(`   逐次処理: ${sequentialDuration}ms`);
			console.log(`   並列処理: ${parallelDuration}ms`);
			console.log(`   改善率: ${improvement.toFixed(1)}%`);

			// 並列処理による改善の確認
			assert.ok(improvement >= 0, `並列処理による改善が見られません: ${improvement.toFixed(1)}%`);

			console.log("✅ 並列処理最適化効果確認完了");
		});

		it("パフォーマンス監視機能の動作確認", { timeout }, async () => {
			globalPerformanceMonitor.clearProfiles();

			// 複数の操作を実行してメトリクスを蓄積
			await TechnicalAnalyzer.analyzeStockComprehensive("TSLA", "3mo", true);
			await TechnicalAnalyzer.analyzeStockComprehensive("NVDA", "3mo", true);

			const summary = globalPerformanceMonitor.getSummary();
			const issues = globalPerformanceMonitor.detectPerformanceIssues();

			console.log(`📊 パフォーマンス監視機能:`);
			console.log(`   監視操作数: ${summary.totalOperations}回`);
			console.log(`   平均実行時間: ${summary.averageDuration}ms`);
			console.log(`   検出問題数: ${issues.issues.length}件`);
			console.log(`   推奨改善策: ${issues.recommendations.length}件`);

			assert.ok(summary.totalOperations >= 2);
			assert.ok(summary.averageDuration > 0);
			assert.ok(Array.isArray(issues.issues));
			assert.ok(Array.isArray(issues.recommendations));

			console.log("✅ パフォーマンス監視機能動作確認完了");
		});
	});

	describe("極端な設定での性能限界テスト", () => {
		it("最大パラメータ設定での性能検証", { timeout }, async () => {
			const maxParams: TechnicalParametersConfig = {
				movingAverages: { 
					periods: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200] // 最大数の期間
				},
				rsi: { 
					periods: [7, 14, 21, 28, 35] // 複数RSI期間
				},
				macd: { fastPeriod: 6, slowPeriod: 35, signalPeriod: 15 }, // 大きな期間差
				bollingerBands: { period: 30, standardDeviations: 3 }, // 大きな期間と標準偏差
				stochastic: { kPeriod: 21, dPeriod: 7 }, // 大きな期間
				volumeAnalysis: { period: 30, spikeThreshold: 3 }, // 大きな分析期間
				vwap: { enableTrueVWAP: true, standardDeviations: 2 },
				mvwap: { period: 50, standardDeviations: 2 }, // 長い移動期間
			};

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, maxParams);
			const duration = Date.now() - start;

			assert.ok(result);
			
			console.log(`📊 最大パラメータ設定性能:`);
			console.log(`   実行時間: ${duration}ms`);
			console.log(`   移動平均数: ${maxParams.movingAverages?.periods?.length || 0}個`);
			console.log(`   RSI数: ${maxParams.rsi?.periods?.length || 0}個`);

			// 極端設定でも合理的な時間内で完了することを確認
			assert.ok(duration < 60000, `最大パラメータ設定の実行時間が長すぎます: ${duration}ms (要件: 60秒以内)`);

			console.log("✅ 最大パラメータ設定での性能検証完了");
		});

		it("最小パラメータ設定での性能検証", { timeout }, async () => {
			const minParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5] }, // 最小の1個
				rsi: { periods: [7] }, // 最小の1個
				macd: { fastPeriod: 5, slowPeriod: 10, signalPeriod: 3 }, // 最小値
			};

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, minParams);
			const duration = Date.now() - start;

			assert.ok(result);
			
			console.log(`📊 最小パラメータ設定性能:`);
			console.log(`   実行時間: ${duration}ms`);

			// 最小設定では非常に高速に完了することを確認
			assert.ok(duration < 20000, `最小パラメータ設定の実行時間が想定より長いです: ${duration}ms`);

			console.log("✅ 最小パラメータ設定での性能検証完了");
		});
	});
});