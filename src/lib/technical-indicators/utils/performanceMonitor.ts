/**
 * パフォーマンス監視システム
 * 計算時間、メモリ使用量、API呼び出し回数を追跡
 */

export interface PerformanceMetrics {
	duration: number;
	memoryUsed: number;
	apiCalls: number;
	cacheHits: number;
	cacheMisses: number;
	timestamp: number;
	[key: string]: number;
}

export interface OperationProfile {
	operationName: string;
	symbol: string;
	parameters?: Record<string, unknown>;
	metrics: PerformanceMetrics;
	breakdown: Record<string, number>;
}

export interface PerformanceSummary {
	totalOperations: number;
	averageDuration: number;
	totalMemoryUsed: number;
	totalApiCalls: number;
	cacheEfficiency: number;
	slowestOperations: OperationProfile[];
	fastestOperations: OperationProfile[];
	memoryIntensiveOperations: OperationProfile[];
	[key: string]: number | OperationProfile[];
}

class PerformanceProfiler {
	private startTime = 0;
	private startMemory: NodeJS.MemoryUsage = process.memoryUsage();
	private apiCallCount = 0;
	private cacheHitCount = 0;
	private cacheMissCount = 0;
	private breakdown = new Map<string, number>();
	private stepStartTime = 0;

	/**
	 * プロファイリング開始
	 */
	public start(): void {
		this.startTime = Date.now();
		this.startMemory = process.memoryUsage();
		this.apiCallCount = 0;
		this.cacheHitCount = 0;
		this.cacheMissCount = 0;
		this.breakdown.clear();
	}

	/**
	 * ステップ開始
	 */
	public startStep(stepName: string): void {
		this.stepStartTime = Date.now();
	}

	/**
	 * ステップ終了
	 */
	public endStep(stepName: string): void {
		if (this.stepStartTime > 0) {
			const duration = Date.now() - this.stepStartTime;
			this.breakdown.set(stepName, duration);
		}
	}

	/**
	 * API呼び出しカウント増加
	 */
	public recordApiCall(): void {
		this.apiCallCount++;
	}

	/**
	 * キャッシュヒット記録
	 */
	public recordCacheHit(): void {
		this.cacheHitCount++;
	}

	/**
	 * キャッシュミス記録
	 */
	public recordCacheMiss(): void {
		this.cacheMissCount++;
	}

	/**
	 * プロファイリング終了と結果取得
	 */
	public end(): PerformanceMetrics {
		const endTime = Date.now();
		const endMemory = process.memoryUsage();
		
		return {
			duration: endTime - this.startTime,
			memoryUsed: endMemory.heapUsed - this.startMemory.heapUsed,
			apiCalls: this.apiCallCount,
			cacheHits: this.cacheHitCount,
			cacheMisses: this.cacheMissCount,
			timestamp: this.startTime,
		};
	}

	/**
	 * 詳細な分析結果を取得
	 */
	public getBreakdown(): Record<string, number> {
		return Object.fromEntries(this.breakdown);
	}
}

export class PerformanceMonitor {
	private profiles: OperationProfile[] = [];
	private maxProfiles = 1000; // メモリ制限

	/**
	 * 新しいプロファイラーを作成
	 */
	public createProfiler(): PerformanceProfiler {
		return new PerformanceProfiler();
	}

	/**
	 * プロファイル結果を記録
	 */
	public recordProfile(
		operationName: string,
		symbol: string,
		metrics: PerformanceMetrics,
		breakdown: Record<string, number>,
		parameters?: Record<string, unknown>,
	): void {
		const profile: OperationProfile = {
			operationName,
			symbol,
			parameters,
			metrics,
			breakdown,
		};

		this.profiles.push(profile);

		// メモリ制限に達した場合、古いプロファイルを削除
		if (this.profiles.length > this.maxProfiles) {
			this.profiles.shift();
		}
	}

	/**
	 * パフォーマンス統計を取得
	 */
	public getSummary(operationName?: string, timeRangeMs?: number): PerformanceSummary {
		let filteredProfiles = this.profiles;

		// 操作名でフィルタ
		if (operationName) {
			filteredProfiles = filteredProfiles.filter(p => p.operationName === operationName);
		}

		// 時間範囲でフィルタ
		if (timeRangeMs) {
			const cutoffTime = Date.now() - timeRangeMs;
			filteredProfiles = filteredProfiles.filter(p => p.metrics.timestamp >= cutoffTime);
		}

		if (filteredProfiles.length === 0) {
			return {
				totalOperations: 0,
				averageDuration: 0,
				totalMemoryUsed: 0,
				totalApiCalls: 0,
				cacheEfficiency: 0,
				slowestOperations: [],
				fastestOperations: [],
				memoryIntensiveOperations: [],
			};
		}

		// 統計計算
		const durations = filteredProfiles.map(p => p.metrics.duration);
		const memoryUsages = filteredProfiles.map(p => p.metrics.memoryUsed);
		const totalApiCalls = filteredProfiles.reduce((sum, p) => sum + p.metrics.apiCalls, 0);
		const totalCacheHits = filteredProfiles.reduce((sum, p) => sum + p.metrics.cacheHits, 0);
		const totalCacheMisses = filteredProfiles.reduce((sum, p) => sum + p.metrics.cacheMisses, 0);

		const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
		const totalMemoryUsed = memoryUsages.reduce((sum, m) => sum + m, 0);
		const cacheEfficiency = totalCacheHits + totalCacheMisses > 0 
			? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100 
			: 0;

		// 最も遅い/速い/メモリ集約的な操作を特定
		const sortedByDuration = [...filteredProfiles].sort((a, b) => b.metrics.duration - a.metrics.duration);
		const sortedByMemory = [...filteredProfiles].sort((a, b) => b.metrics.memoryUsed - a.metrics.memoryUsed);

		return {
			totalOperations: filteredProfiles.length,
			averageDuration: Math.round(averageDuration),
			totalMemoryUsed,
			totalApiCalls,
			cacheEfficiency: Number(cacheEfficiency.toFixed(2)),
			slowestOperations: sortedByDuration.slice(0, 5),
			fastestOperations: sortedByDuration.slice(-5).reverse(),
			memoryIntensiveOperations: sortedByMemory.slice(0, 5),
		};
	}

	/**
	 * パフォーマンス問題の検出
	 */
	public detectPerformanceIssues(baselineMs?: number): {
		issues: string[];
		recommendations: string[];
	} {
		const issues: string[] = [];
		const recommendations: string[] = [];
		const recentSummary = this.getSummary(undefined, 60000); // 過去1分

		if (recentSummary.totalOperations === 0) {
			return { issues: [], recommendations: [] };
		}

		// 実行時間の問題
		const baseline = baselineMs || 5000; // デフォルト5秒ベースライン
		if (recentSummary.averageDuration > baseline * 1.5) {
			issues.push(`平均実行時間が長すぎます: ${recentSummary.averageDuration}ms (ベースライン: ${baseline}ms)`);
			recommendations.push("キャッシュ効率を改善するか、並列処理を最適化してください");
		}

		// メモリ使用量の問題
		const memoryUsageMB = recentSummary.totalMemoryUsed / (1024 * 1024);
		if (memoryUsageMB > 100) {
			issues.push(`メモリ使用量が多すぎます: ${memoryUsageMB.toFixed(1)}MB`);
			recommendations.push("メモリリークがないか確認し、不要なデータの保持を避けてください");
		}

		// キャッシュ効率の問題
		if (recentSummary.cacheEfficiency < 50) {
			issues.push(`キャッシュ効率が低すぎます: ${recentSummary.cacheEfficiency}%`);
			recommendations.push("キャッシュ戦略を見直し、TTLやキーの設計を改善してください");
		}

		// API呼び出し頻度の問題
		const apiCallsPerOperation = recentSummary.totalOperations > 0 
			? recentSummary.totalApiCalls / recentSummary.totalOperations 
			: 0;
		if (apiCallsPerOperation > 3) {
			issues.push(`API呼び出し頻度が高すぎます: 操作あたり${apiCallsPerOperation.toFixed(1)}回`);
			recommendations.push("API呼び出しをバッチ化するか、より効率的なデータ取得戦略を採用してください");
		}

		return { issues, recommendations };
	}

	/**
	 * パフォーマンス回帰の検出
	 */
	public detectRegression(
		currentOperation: string, 
		currentDuration: number, 
		windowSizeHours = 24
	): { isRegression: boolean; baselineDuration: number; regressionPercent: number } {
		const windowMs = windowSizeHours * 60 * 60 * 1000;
		const cutoffTime = Date.now() - windowMs;
		
		const historicalProfiles = this.profiles.filter(
			p => p.operationName === currentOperation && p.metrics.timestamp >= cutoffTime
		);

		if (historicalProfiles.length < 5) {
			return { isRegression: false, baselineDuration: 0, regressionPercent: 0 };
		}

		const historicalDurations = historicalProfiles.map(p => p.metrics.duration);
		const baselineDuration = historicalDurations.reduce((sum, d) => sum + d, 0) / historicalDurations.length;
		const regressionPercent = ((currentDuration - baselineDuration) / baselineDuration) * 100;

		// 20%以上の性能劣化を回帰とみなす
		const isRegression = regressionPercent > 20;

		return {
			isRegression,
			baselineDuration: Math.round(baselineDuration),
			regressionPercent: Number(regressionPercent.toFixed(1)),
		};
	}

	/**
	 * パフォーマンスレポート生成
	 */
	public generateReport(timeRangeHours = 24): string {
		const summary = this.getSummary(undefined, timeRangeHours * 60 * 60 * 1000);
		const issues = this.detectPerformanceIssues();

		let report = "📊 パフォーマンスレポート\n";
		report += "=======================\n\n";
		report += `📈 統計 (過去${timeRangeHours}時間)\n`;
		report += `   総操作数: ${summary.totalOperations}回\n`;
		report += `   平均実行時間: ${summary.averageDuration}ms\n`;
		report += `   総メモリ使用量: ${(summary.totalMemoryUsed / (1024 * 1024)).toFixed(1)}MB\n`;
		report += `   総API呼び出し: ${summary.totalApiCalls}回\n`;
		report += `   キャッシュ効率: ${summary.cacheEfficiency}%\n\n`;

		if (summary.slowestOperations.length > 0) {
			report += "🐌 最も遅い操作:\n";
			summary.slowestOperations.slice(0, 3).forEach((op, i) => {
				report += `   ${i + 1}. ${op.operationName} (${op.symbol}): ${op.metrics.duration}ms\n`;
			});
			report += "\n";
		}

		if (issues.issues.length > 0) {
			report += "⚠️ パフォーマンス問題:\n";
			for (const issue of issues.issues) {
				report += `   • ${issue}\n`;
			}
			report += "\n";

			report += "💡 推奨改善策:\n";
			for (const rec of issues.recommendations) {
				report += `   • ${rec}\n`;
			}
		} else {
			report += "✅ パフォーマンス問題は検出されませんでした\n";
		}

		return report;
	}

	/**
	 * プロファイルデータをクリア
	 */
	public clearProfiles(): void {
		this.profiles = [];
	}

	/**
	 * CSV形式でデータをエクスポート
	 */
	public exportToCSV(): string {
		if (this.profiles.length === 0) {
			return "operationName,symbol,duration,memoryUsed,apiCalls,cacheHits,cacheMisses,timestamp\n";
		}

		let csv = "operationName,symbol,duration,memoryUsed,apiCalls,cacheHits,cacheMisses,timestamp\n";
		
		for (const profile of this.profiles) {
			const m = profile.metrics;
			csv += `${profile.operationName},${profile.symbol},${m.duration},${m.memoryUsed},${m.apiCalls},${m.cacheHits},${m.cacheMisses},${m.timestamp}\n`;
		}

		return csv;
	}
}

// シングルトンインスタンス
export const globalPerformanceMonitor = new PerformanceMonitor();