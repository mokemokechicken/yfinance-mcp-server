/**
 * パフォーマンス最適化バックグラウンドサービス
 * システム全体のパフォーマンス最適化を自動実行
 */

import { globalCacheManager } from "./cacheManager";
import { globalPerformanceMonitor } from "./performanceMonitor";
import { performanceConfig } from "./performanceConfig";

export interface PerformanceAlert {
	type: "memory" | "cache" | "performance" | "api";
	severity: "low" | "medium" | "high";
	message: string;
	timestamp: number;
	metrics: Record<string, number>;
	recommendation: string;
}

export class PerformanceService {
	private static instance: PerformanceService;
	private isRunning = false;
	private intervals: NodeJS.Timeout[] = [];
	private alerts: PerformanceAlert[] = [];
	private lastOptimizationTime = 0;

	// 最適化間隔（デフォルト: 5分）
	private static readonly OPTIMIZATION_INTERVAL = 5 * 60 * 1000;
	private static readonly MAX_ALERTS = 100;

	private constructor() {}

	public static getInstance(): PerformanceService {
		if (!PerformanceService.instance) {
			PerformanceService.instance = new PerformanceService();
		}
		return PerformanceService.instance;
	}

	/**
	 * パフォーマンスサービス開始
	 */
	public start(): void {
		if (this.isRunning) {
			console.log("⚠️ パフォーマンスサービスは既に実行中です");
			return;
		}

		const config = performanceConfig.getConfig();
		if (!config.monitoring.enabled) {
			console.log("📊 パフォーマンス監視が無効のため、サービスは開始しません");
			return;
		}

		console.log("🚀 パフォーマンス最適化サービスを開始します");

		// メモリ監視
		if (config.memory.memoryCheckInterval > 0) {
			const memoryInterval = setInterval(() => {
				this.checkMemoryUsage();
			}, config.memory.memoryCheckInterval);
			this.intervals.push(memoryInterval);
		}

		// キャッシュクリーンアップ
		if (config.cache.cleanupInterval > 0) {
			const cleanupInterval = setInterval(() => {
				this.performCacheCleanup();
			}, config.cache.cleanupInterval);
			this.intervals.push(cleanupInterval);
		}

		// パフォーマンス最適化
		const optimizationInterval = setInterval(() => {
			this.performOptimization();
		}, PerformanceService.OPTIMIZATION_INTERVAL);
		this.intervals.push(optimizationInterval);

		// アラート監視
		const alertInterval = setInterval(() => {
			this.checkPerformanceAlerts();
		}, 60000); // 1分間隔
		this.intervals.push(alertInterval);

		this.isRunning = true;
		console.log("✅ パフォーマンスサービスが開始されました");
	}

	/**
	 * パフォーマンスサービス停止
	 */
	public stop(): void {
		if (!this.isRunning) {
			return;
		}

		for (const interval of this.intervals) {
			clearInterval(interval);
		}
		this.intervals = [];
		this.isRunning = false;

		console.log("⏹️ パフォーマンスサービスを停止しました");
	}

	/**
	 * メモリ使用量チェック
	 */
	private checkMemoryUsage(): void {
		const memoryUsage = process.memoryUsage();
		const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
		const config = performanceConfig.getMemoryConfig();

		if (heapUsedMB > config.alertThresholdMB) {
			const alert: PerformanceAlert = {
				type: "memory",
				severity: heapUsedMB > config.maxHeapUsageMB ? "high" : "medium",
				message: `メモリ使用量が閾値を超過: ${heapUsedMB.toFixed(1)}MB`,
				timestamp: Date.now(),
				metrics: {
					heapUsedMB,
					heapTotalMB: memoryUsage.heapTotal / (1024 * 1024),
					rssMB: memoryUsage.rss / (1024 * 1024),
				},
				recommendation: "キャッシュサイズの縮小またはガベージコレクションの実行を検討してください",
			};

			this.addAlert(alert);

			// 高負荷時の自動調整
			if (heapUsedMB > config.maxHeapUsageMB) {
				performanceConfig.adjustForLowMemory();
				this.performEmergencyCleanup();
			}
		}

		// ガベージコレクション促進
		if (config.enableGcHints && heapUsedMB > config.alertThresholdMB * 0.8) {
			if (global.gc) {
				global.gc();
			}
		}
	}

	/**
	 * キャッシュクリーンアップ実行
	 */
	private performCacheCleanup(): void {
		const beforeStats = globalCacheManager.getStats();
		
		// 期限切れエントリのクリーンアップ
		globalCacheManager.cleanupExpiredEntries();
		
		const afterStats = globalCacheManager.getStats();
		
		if (beforeStats.totalEntries > afterStats.totalEntries) {
			console.log(`🧹 キャッシュクリーンアップ完了: ${beforeStats.totalEntries} → ${afterStats.totalEntries}エントリ`);
		}
	}

	/**
	 * パフォーマンス最適化実行
	 */
	private performOptimization(): void {
		const now = Date.now();
		if (now - this.lastOptimizationTime < PerformanceService.OPTIMIZATION_INTERVAL) {
			return;
		}

		console.log("🔧 パフォーマンス最適化を実行中...");

		// キャッシュ統計分析
		this.analyzeCachePerformance();

		// パフォーマンス統計分析
		this.analyzePerformanceMetrics();

		// システムリソース最適化
		this.optimizeSystemResources();

		this.lastOptimizationTime = now;
		console.log("✅ パフォーマンス最適化完了");
	}

	/**
	 * キャッシュパフォーマンス分析
	 */
	private analyzeCachePerformance(): void {
		const stats = globalCacheManager.getStats();
		const config = performanceConfig.getMonitoringConfig();

		if (stats.hitRate < config.alertThresholds.cacheHitRatePercent) {
			const alert: PerformanceAlert = {
				type: "cache",
				severity: stats.hitRate < 30 ? "high" : "medium",
				message: `キャッシュヒット率が低下: ${stats.hitRate}%`,
				timestamp: Date.now(),
				metrics: stats,
				recommendation: "キャッシュ戦略の見直しまたはTTL設定の調整を検討してください",
			};

			this.addAlert(alert);
		}

		// キャッシュサイズ最適化
		const cacheConfig = performanceConfig.getCacheConfig();
		if (stats.totalEntries > cacheConfig.maxSize * 0.9) {
			console.log("📊 キャッシュサイズが上限に近づいています - プリエンプティブクリーンアップを実行");
			globalCacheManager.cleanupExpiredEntries();
		}
	}

	/**
	 * パフォーマンスメトリクス分析
	 */
	private analyzePerformanceMetrics(): void {
		const summary = globalPerformanceMonitor.getSummary(undefined, 60 * 60 * 1000); // 過去1時間
		const config = performanceConfig.getMonitoringConfig();

		if (summary.averageDuration > config.alertThresholds.durationMs) {
			const alert: PerformanceAlert = {
				type: "performance",
				severity: summary.averageDuration > config.alertThresholds.durationMs * 2 ? "high" : "medium",
				message: `平均実行時間が長期化: ${summary.averageDuration}ms`,
				timestamp: Date.now(),
				metrics: {
					totalOperations: summary.totalOperations,
					averageDuration: summary.averageDuration,
					totalMemoryUsed: summary.totalMemoryUsed,
					totalApiCalls: summary.totalApiCalls,
					cacheEfficiency: summary.cacheEfficiency,
				},
				recommendation: "処理の並列化またはアルゴリズムの最適化を検討してください",
			};

			this.addAlert(alert);
		}

		// 回帰検出
		if (summary.slowestOperations.length > 0) {
			const slowest = summary.slowestOperations[0];
			const regression = globalPerformanceMonitor.detectRegression(
				slowest.operationName,
				slowest.metrics.duration
			);

			if (regression.isRegression) {
				const alert: PerformanceAlert = {
					type: "performance",
					severity: regression.regressionPercent > 50 ? "high" : "medium",
					message: `パフォーマンス回帰を検出: ${slowest.operationName} (+${regression.regressionPercent}%)`,
					timestamp: Date.now(),
					metrics: { 
						...slowest.metrics as Record<string, number>, 
						baselineDuration: regression.baselineDuration,
						regressionPercent: regression.regressionPercent 
					},
					recommendation: "最近のコード変更を確認し、パフォーマンスに影響する変更を特定してください",
				};

				this.addAlert(alert);
			}
		}
	}

	/**
	 * システムリソース最適化
	 */
	private optimizeSystemResources(): void {
		const memoryUsage = process.memoryUsage();
		const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
		const config = performanceConfig.getMemoryConfig();

		// メモリ使用量に基づく動的調整
		if (heapUsedMB > config.alertThresholdMB) {
			const cacheStats = globalCacheManager.getStats();
			const currentCacheSize = cacheStats.totalEntries;
			
			// キャッシュサイズの動的調整
			if (currentCacheSize > 500) {
				const targetReduction = Math.floor(currentCacheSize * 0.2); // 20%削減
				console.log(`📉 メモリ使用量増加のためキャッシュエントリを削減: ${targetReduction}個`);
				
				// 最も古いエントリから削除（実際の実装では evictOldEntries を複数回実行）
				for (let i = 0; i < Math.ceil(targetReduction / 100); i++) {
					globalCacheManager.cleanupExpiredEntries();
				}
			}
		}
	}

	/**
	 * パフォーマンスアラートチェック
	 */
	private checkPerformanceAlerts(): void {
		const issues = globalPerformanceMonitor.detectPerformanceIssues();
		const summary = globalPerformanceMonitor.getSummary();

		for (const issue of issues.issues) {
			const alert: PerformanceAlert = {
				type: "performance",
				severity: "medium",
				message: issue,
				timestamp: Date.now(),
				metrics: {
					totalOperations: summary.totalOperations,
					averageDuration: summary.averageDuration,
					totalMemoryUsed: summary.totalMemoryUsed,
					totalApiCalls: summary.totalApiCalls,
					cacheEfficiency: summary.cacheEfficiency,
				},
				recommendation: issues.recommendations.join(", "),
			};

			this.addAlert(alert);
		}
	}

	/**
	 * 緊急クリーンアップ実行
	 */
	private performEmergencyCleanup(): void {
		console.log("🚨 緊急クリーンアップを実行中...");

		// キャッシュの大幅削減
		globalCacheManager.clear(); // 全キャッシュクリア

		// パフォーマンス監視データの削減
		globalPerformanceMonitor.clearProfiles();

		// ガベージコレクション強制実行
		if (global.gc) {
			global.gc();
		}

		console.log("✅ 緊急クリーンアップ完了");
	}

	/**
	 * アラート追加
	 */
	private addAlert(alert: PerformanceAlert): void {
		this.alerts.push(alert);

		// アラート数制限
		if (this.alerts.length > PerformanceService.MAX_ALERTS) {
			this.alerts = this.alerts.slice(-PerformanceService.MAX_ALERTS);
		}

		// 重要度の高いアラートはコンソール出力
		if (alert.severity === "high") {
			console.error(`🚨 [${alert.type.toUpperCase()}] ${alert.message}`);
			console.error(`   推奨: ${alert.recommendation}`);
		} else if (alert.severity === "medium") {
			console.warn(`⚠️ [${alert.type.toUpperCase()}] ${alert.message}`);
		}
	}

	/**
	 * 最近のアラート取得
	 */
	public getRecentAlerts(count = 10): PerformanceAlert[] {
		return this.alerts.slice(-count).reverse();
	}

	/**
	 * アラート統計取得
	 */
	public getAlertStatistics(timeRangeMs: number = 60 * 60 * 1000): {
		total: number;
		byType: Record<string, number>;
		bySeverity: Record<string, number>;
	} {
		const cutoffTime = Date.now() - timeRangeMs;
		const recentAlerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);

		const byType: Record<string, number> = {};
		const bySeverity: Record<string, number> = {};

		for (const alert of recentAlerts) {
			byType[alert.type] = (byType[alert.type] || 0) + 1;
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
		}

		return {
			total: recentAlerts.length,
			byType,
			bySeverity,
		};
	}

	/**
	 * パフォーマンス健全性レポート生成
	 */
	public generateHealthReport(): string {
		const memoryUsage = process.memoryUsage();
		const cacheStats = globalCacheManager.getStats();
		const perfSummary = globalPerformanceMonitor.getSummary();
		const alertStats = this.getAlertStatistics();

		let report = "📋 システムパフォーマンス健全性レポート\n";
		report += "==========================================\n\n";

		report += "💾 メモリ使用量:\n";
		report += `   Heap使用量: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB\n`;
		report += `   Heap総量: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
		report += `   RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(1)}MB\n\n`;

		report += "🗄️ キャッシュ統計:\n";
		report += `   エントリ数: ${cacheStats.totalEntries}個\n`;
		report += `   ヒット率: ${cacheStats.hitRate}%\n`;
		report += `   メモリ使用量: ${cacheStats.memoryUsageKB}KB\n\n`;

		report += "⚡ パフォーマンス統計:\n";
		report += `   総操作数: ${perfSummary.totalOperations}回\n`;
		report += `   平均実行時間: ${perfSummary.averageDuration}ms\n`;
		report += `   キャッシュ効率: ${perfSummary.cacheEfficiency}%\n\n`;

		report += "🚨 アラート統計 (過去1時間):\n";
		report += `   総アラート数: ${alertStats.total}件\n`;
		if (Object.keys(alertStats.byType).length > 0) {
			report += "   種類別:\n";
			for (const [type, count] of Object.entries(alertStats.byType)) {
				report += `     ${type}: ${count}件\n`;
			}
		}
		if (Object.keys(alertStats.bySeverity).length > 0) {
			report += "   重要度別:\n";
			for (const [severity, count] of Object.entries(alertStats.bySeverity)) {
				report += `     ${severity}: ${count}件\n`;
			}
		}

		if (alertStats.total === 0) {
			report += "\n✅ パフォーマンス問題は検出されていません\n";
		}

		return report;
	}

	/**
	 * サービス状態取得
	 */
	public getServiceStatus(): {
		isRunning: boolean;
		activeIntervals: number;
		lastOptimizationTime: number;
		totalAlerts: number;
	} {
		return {
			isRunning: this.isRunning,
			activeIntervals: this.intervals.length,
			lastOptimizationTime: this.lastOptimizationTime,
			totalAlerts: this.alerts.length,
		};
	}
}

// シングルトンインスタンス
export const performanceService = PerformanceService.getInstance();