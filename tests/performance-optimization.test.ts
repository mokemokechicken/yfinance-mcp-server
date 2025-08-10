import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import { globalCacheManager } from "../src/lib/technical-indicators/utils/cacheManager";
import { globalPerformanceMonitor } from "../src/lib/technical-indicators/utils/performanceMonitor";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * パフォーマンス最適化機能のテスト
 * - キャッシュ機能の効果測定
 * - 並列処理の効果測定
 * - メモリ使用量最適化の確認
 * - パフォーマンス監視機能のテスト
 */
describe("パフォーマンス最適化機能テスト", () => {
	const timeout = 120000; // パフォーマンステストのため長めに設定

	before(async () => {
		// テスト前にキャッシュをクリア
		globalCacheManager.clear();
		globalPerformanceMonitor.clearProfiles();
	});

	after(async () => {
		// テスト後にクリーンアップ
		globalCacheManager.clear();
	});

	describe("キャッシュ機能テスト", () => {
		it("価格データキャッシュの効果測定", { timeout }, async () => {
			const symbol = "AAPL";
			const period = "1y";

			// 1回目: キャッシュなし（実際のAPI呼び出し）
			const start1 = Date.now();
			const data1 = await TechnicalAnalyzer.fetchData(symbol, period);
			const duration1 = Date.now() - start1;

			// 2回目: キャッシュあり（キャッシュから取得）
			const start2 = Date.now();
			const data2 = await TechnicalAnalyzer.fetchData(symbol, period);
			const duration2 = Date.now() - start2;

			console.log(`📊 キャッシュ効果測定:`);
			console.log(`   1回目（キャッシュなし): ${duration1}ms`);
			console.log(`   2回目（キャッシュあり): ${duration2}ms`);
			console.log(`   速度改善: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);

			assert.ok(data1.length > 0);
			assert.ok(data2.length > 0);
			assert.strictEqual(data1.length, data2.length);

			// キャッシュ効果確認: 2回目は大幅に高速化されるべき
			assert.ok(duration2 < duration1 * 0.5, `キャッシュ効果が不十分です: ${duration2}ms vs ${duration1}ms`);

			console.log("✅ 価格データキャッシュ効果確認完了");
		});

		it("指標計算結果キャッシュの効果測定", { timeout }, async () => {
			const symbol = "MSFT";
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [25, 50, 200] },
				rsi: { periods: [14, 21] },
				bollingerBands: { period: 20, standardDeviations: 2 },
			};

			// 1回目: 全計算実行
			const start1 = Date.now();
			const { result: result1 } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
			const duration1 = Date.now() - start1;

			// 2回目: キャッシュされた指標を再利用
			const start2 = Date.now();
			const { result: result2 } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
			const duration2 = Date.now() - start2;

			console.log(`📊 指標計算キャッシュ効果:`);
			console.log(`   1回目（計算実行): ${duration1}ms`);
			console.log(`   2回目（キャッシュ利用): ${duration2}ms`);
			console.log(`   速度改善: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);

			assert.ok(result1);
			assert.ok(result2);
			assert.strictEqual(result1.symbol, result2.symbol);

			// 2回目は1回目より高速化されるべき
			assert.ok(duration2 < duration1, `キャッシュによる速度改善が見られません: ${duration2}ms vs ${duration1}ms`);

			console.log("✅ 指標計算キャッシュ効果確認完了");
		});

		it("キャッシュ統計の確認", { timeout }, async () => {
			// いくつかの操作を実行してキャッシュを蓄積
			await TechnicalAnalyzer.analyzeStockComprehensive("GOOGL", "6mo", true);
			await TechnicalAnalyzer.analyzeStockComprehensive("TSLA", "3mo", true);
			
			// 同じ銘柄を再度実行（キャッシュヒット期待）
			await TechnicalAnalyzer.analyzeStockComprehensive("GOOGL", "6mo", true);

			const stats = globalCacheManager.getStats();
			
			console.log(`📊 キャッシュ統計:`);
			console.log(`   エントリ数: ${stats.totalEntries}個`);
			console.log(`   ヒット率: ${stats.hitRate}%`);
			console.log(`   総ヒット: ${stats.totalHits}回`);
			console.log(`   総ミス: ${stats.totalMisses}回`);
			console.log(`   メモリ使用量: ${stats.memoryUsageKB}KB`);

			assert.ok(stats.totalEntries > 0);
			assert.ok(stats.hitRate >= 0);
			assert.ok(stats.memoryUsageKB >= 0);

			console.log("✅ キャッシュ統計確認完了");
		});
	});

	describe("並列処理最適化テスト", () => {
		it("データ取得並列化の効果測定", { timeout }, async () => {
			const symbol = "AAPL";
			globalCacheManager.clear(); // キャッシュをクリアして純粋な並列効果を測定

			// 従来の逐次処理をシミュレート
			const start1 = Date.now();
			const priceData = await TechnicalAnalyzer.fetchData(symbol, "1y");
			// 財務データも逐次取得（実際の実装では並列化されている）
			const duration1 = Date.now() - start1;

			globalCacheManager.clear(); // キャッシュをクリアして条件を同一に

			// 最適化された並列処理版
			const start2 = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
			const duration2 = Date.now() - start2;

			console.log(`📊 並列処理効果（データ取得）:`);
			console.log(`   逐次処理相当: ${duration1}ms`);
			console.log(`   並列処理版: ${duration2}ms`);

			assert.ok(priceData.length > 0);
			assert.ok(result);
			assert.strictEqual(result.symbol, symbol);

			// 並列処理により合理的な時間内で完了することを確認
			assert.ok(duration2 < 30000, `並列処理でも時間がかかりすぎています: ${duration2}ms`);

			console.log("✅ データ取得並列化効果確認完了");
		});

		it("指標計算並列化の効果測定", { timeout }, async () => {
			const symbol = "MSFT";
			const complexParams: TechnicalParametersConfig = {
				movingAverages: { periods: [5, 10, 15, 20, 25, 30, 50, 75, 100, 200] },
				rsi: { periods: [7, 14, 21, 28] },
				bollingerBands: { period: 20, standardDeviations: 2 },
				stochastic: { kPeriod: 14, dPeriod: 3 },
				volumeAnalysis: { period: 20 },
				vwap: { enableTrueVWAP: false }, // 外部API呼び出しを避けてテストを安定化
				mvwap: { period: 20 },
			};

			globalCacheManager.clear(); // キャッシュクリアで純粋な計算時間を測定

			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, complexParams);
			const duration = Date.now() - start;

			console.log(`📊 複雑な指標並列計算:`);
			console.log(`   実行時間: ${duration}ms`);
			console.log(`   移動平均数: ${complexParams.movingAverages?.periods?.length || 0}個`);
			console.log(`   RSI数: ${complexParams.rsi?.periods?.length || 0}個`);

			assert.ok(result);
			assert.ok(result.extendedIndicators);

			// 複雑なパラメータでも合理的な時間内で完了することを確認
			assert.ok(duration < 60000, `複雑な指標計算の時間が長すぎます: ${duration}ms`);

			console.log("✅ 指標計算並列化効果確認完了");
		});
	});

	describe("パフォーマンス監視機能テスト", () => {
		it("パフォーマンスメトリクス収集", { timeout }, async () => {
			globalPerformanceMonitor.clearProfiles(); // 監視データクリア

			const symbol = "TSLA";
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", true);

			// パフォーマンス統計を確認
			const summary = globalPerformanceMonitor.getSummary();

			console.log(`📊 パフォーマンス監視統計:`);
			console.log(`   操作数: ${summary.totalOperations}回`);
			console.log(`   平均実行時間: ${summary.averageDuration}ms`);
			console.log(`   総API呼び出し: ${summary.totalApiCalls}回`);
			console.log(`   キャッシュ効率: ${summary.cacheEfficiency}%`);

			assert.ok(result);
			assert.ok(summary.totalOperations > 0);
			assert.ok(summary.averageDuration > 0);
			assert.ok(summary.totalApiCalls >= 0);
			assert.ok(summary.cacheEfficiency >= 0);

			console.log("✅ パフォーマンスメトリクス収集確認完了");
		});

		it("パフォーマンス問題検出", { timeout }, async () => {
			// 問題検出機能をテスト
			const issues = globalPerformanceMonitor.detectPerformanceIssues(5000); // 5秒ベースライン

			console.log(`📊 パフォーマンス問題検出:`);
			console.log(`   検出された問題: ${issues.issues.length}件`);
			console.log(`   推奨改善策: ${issues.recommendations.length}件`);

			if (issues.issues.length > 0) {
				console.log(`   問題: ${issues.issues.join(", ")}`);
			}

			// 問題検出機能が正常に動作することを確認（問題がなくても機能は動作する）
			assert.ok(Array.isArray(issues.issues));
			assert.ok(Array.isArray(issues.recommendations));

			console.log("✅ パフォーマンス問題検出機能確認完了");
		});

		it("パフォーマンスレポート生成", { timeout }, async () => {
			// レポート生成をテスト
			const report = globalPerformanceMonitor.generateReport(1); // 過去1時間

			console.log("📊 パフォーマンスレポート:");
			console.log(report);

			assert.ok(typeof report === "string");
			assert.ok(report.length > 0);
			assert.ok(report.includes("パフォーマンスレポート"));

			console.log("✅ パフォーマンスレポート生成確認完了");
		});
	});

	describe("メモリ使用量最適化テスト", () => {
		it("大量操作でのメモリリークチェック", { timeout }, async () => {
			const initialMemory = process.memoryUsage().heapUsed;
			const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
			const iterations = 3;

			// 複数回の分析実行
			for (let i = 0; i < iterations; i++) {
				for (const symbol of symbols) {
					await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "3mo", false); // 財務データなしで高速化
				}
				
				// ガベージコレクションを促す
				if (global.gc) {
					global.gc();
				}
			}

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryGrowth = finalMemory - initialMemory;
			const memoryGrowthMB = memoryGrowth / (1024 * 1024);

			console.log(`📊 メモリリークチェック:`);
			console.log(`   初期メモリ: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   最終メモリ: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
			console.log(`   メモリ増加: ${memoryGrowthMB.toFixed(2)}MB`);
			console.log(`   実行操作: ${symbols.length * iterations}回`);

			// メモリリークが深刻でないことを確認（操作数に対して合理的な増加量）
			const memoryPerOperation = memoryGrowthMB / (symbols.length * iterations);
			console.log(`   操作あたりメモリ: ${memoryPerOperation.toFixed(3)}MB`);

			assert.ok(memoryPerOperation < 10, `操作あたりのメモリ増加が大きすぎます: ${memoryPerOperation.toFixed(3)}MB`);

			console.log("✅ メモリリークチェック完了");
		});

		it("キャッシュメモリ管理テスト", { timeout }, async () => {
			globalCacheManager.clear();
			const initialStats = globalCacheManager.getStats();

			// 大量のキャッシュデータを生成
			const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX"];
			for (const symbol of symbols) {
				await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "6mo", true);
			}

			const afterStats = globalCacheManager.getStats();

			console.log(`📊 キャッシュメモリ管理:`);
			console.log(`   初期エントリ数: ${initialStats.totalEntries}個`);
			console.log(`   最終エントリ数: ${afterStats.totalEntries}個`);
			console.log(`   メモリ使用量: ${afterStats.memoryUsageKB}KB`);

			assert.ok(afterStats.totalEntries > initialStats.totalEntries);
			assert.ok(afterStats.memoryUsageKB > 0);

			// キャッシュサイズが制限内に収まっていることを確認
			assert.ok(afterStats.totalEntries <= 1000, `キャッシュエントリ数が制限を超えています: ${afterStats.totalEntries}`);

			// 期限切れエントリクリーンアップをテスト
			globalCacheManager.cleanupExpiredEntries();
			const cleanupStats = globalCacheManager.getStats();

			console.log(`   クリーンアップ後: ${cleanupStats.totalEntries}個`);

			console.log("✅ キャッシュメモリ管理テスト完了");
		});
	});

	describe("パフォーマンス要件検証", () => {
		it("カスタムパラメータによる性能影響確認（10%以内要件）", { timeout }, async () => {
			const symbol = "AAPL";
			globalCacheManager.clear(); // フェアな比較のためキャッシュクリア

			// ベースライン測定（デフォルトパラメータ）
			const baselineStart = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);
			const baselineTime = Date.now() - baselineStart;

			globalCacheManager.clear(); // キャッシュクリアで条件を同一に

			// カスタムパラメータ測定
			const customParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 25, 50, 100, 200] },
				rsi: { periods: [7, 14, 21], overbought: 75, oversold: 25 },
				macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
				bollingerBands: { period: 18, standardDeviations: 1.8 },
				stochastic: { kPeriod: 10, dPeriod: 5 },
				volumeAnalysis: { period: 15 },
				vwap: { enableTrueVWAP: false }, // API制限を避けるため
				mvwap: { period: 25 },
			};

			const customStart = Date.now();
			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true, customParams);
			const customTime = Date.now() - customStart;

			const performanceIncrease = ((customTime - baselineTime) / baselineTime) * 100;

			console.log(`📊 パフォーマンス要件検証:`);
			console.log(`   ベースライン: ${baselineTime}ms`);
			console.log(`   カスタム設定: ${customTime}ms`);
			console.log(`   性能影響: +${performanceIncrease.toFixed(2)}%`);

			// 要件: カスタムパラメータによる性能影響は10%以内
			assert.ok(performanceIncrease <= 10, 
				`性能影響が要件を超えています: +${performanceIncrease.toFixed(2)}% (要件: 10%以内)`
			);

			console.log("✅ パフォーマンス要件（10%以内）達成確認");
		});

		it("API呼び出し最小化確認", { timeout }, async () => {
			globalCacheManager.clear();
			globalPerformanceMonitor.clearProfiles();

			const symbol = "MSFT";
			await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y", true);

			const summary = globalPerformanceMonitor.getSummary();
			const apiCallsPerOperation = summary.totalOperations > 0 
				? summary.totalApiCalls / summary.totalOperations 
				: 0;

			console.log(`📊 API呼び出し最小化:`);
			console.log(`   総操作数: ${summary.totalOperations}回`);
			console.log(`   総API呼び出し: ${summary.totalApiCalls}回`);
			console.log(`   操作あたりAPI呼び出し: ${apiCallsPerOperation.toFixed(2)}回`);

			// 要件: 操作あたりのAPI呼び出しは2回程度（価格データ + 財務データ）に抑制
			assert.ok(apiCallsPerOperation <= 3, 
				`API呼び出し頻度が高すぎます: ${apiCallsPerOperation.toFixed(2)}回/操作 (要件: 3回以内)`
			);

			console.log("✅ API呼び出し最小化確認完了");
		});
	});
});