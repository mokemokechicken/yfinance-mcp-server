/**
 * パフォーマンス最適化設定管理
 * システム全体のパフォーマンス関連設定を一元管理
 */

export interface PerformanceConfig {
	// キャッシュ設定
	cache: {
		enabled: boolean;
		maxSize: number;
		ttl: {
			priceData: number; // ミリ秒
			financialData: number;
			indicators: number;
			default: number;
		};
		cleanupInterval: number; // 自動クリーンアップ間隔
		enableMetrics: boolean; // キャッシュメトリクス収集
	};
	
	// 並列処理設定
	parallelization: {
		enabled: boolean;
		maxConcurrency: number; // 同時実行数上限
		batchSize: number; // バッチ処理サイズ
		timeoutMs: number; // 並列処理タイムアウト
	};
	
	// API呼び出し設定
	api: {
		maxRetries: number;
		retryDelayMs: number;
		rateLimitDelay: number; // レート制限対応遅延
		connectionTimeout: number;
		enableCircuitBreaker: boolean; // サーキットブレーカー
	};
	
	// メモリ管理設定
	memory: {
		maxHeapUsageMB: number; // 最大ヒープ使用量
		enableGcHints: boolean; // ガベージコレクション促進
		memoryCheckInterval: number; // メモリチェック間隔
		alertThresholdMB: number; // アラート閾値
	};
	
	// パフォーマンス監視設定
	monitoring: {
		enabled: boolean;
		profileAll: boolean; // 全操作をプロファイル
		maxProfiles: number; // 保持するプロファイル数上限
		alertThresholds: {
			durationMs: number; // 実行時間アラート閾値
			memoryMB: number; // メモリ使用量アラート閾値
			cacheHitRatePercent: number; // キャッシュヒット率低下閾値
		};
		exportMetrics: boolean; // メトリクス外部出力
	};
}

// デフォルト設定
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
	cache: {
		enabled: true,
		maxSize: 1000,
		ttl: {
			priceData: 15 * 60 * 1000, // 15分
			financialData: 24 * 60 * 60 * 1000, // 24時間
			indicators: 30 * 60 * 1000, // 30分
			default: 60 * 60 * 1000, // 1時間
		},
		cleanupInterval: 10 * 60 * 1000, // 10分
		enableMetrics: true,
	},
	
	parallelization: {
		enabled: true,
		maxConcurrency: 5,
		batchSize: 3,
		timeoutMs: 30000, // 30秒
	},
	
	api: {
		maxRetries: 3,
		retryDelayMs: 1000, // 1秒
		rateLimitDelay: 100, // 100ms
		connectionTimeout: 10000, // 10秒
		enableCircuitBreaker: true,
	},
	
	memory: {
		maxHeapUsageMB: 500,
		enableGcHints: true,
		memoryCheckInterval: 60000, // 1分
		alertThresholdMB: 400,
	},
	
	monitoring: {
		enabled: true,
		profileAll: false, // 本番環境では false
		maxProfiles: 1000,
		alertThresholds: {
			durationMs: 15000, // 15秒
			memoryMB: 100,
			cacheHitRatePercent: 50,
		},
		exportMetrics: false,
	},
};

// 開発環境設定
export const DEV_PERFORMANCE_CONFIG: PerformanceConfig = {
	...DEFAULT_PERFORMANCE_CONFIG,
	monitoring: {
		...DEFAULT_PERFORMANCE_CONFIG.monitoring,
		profileAll: true, // 開発環境では全プロファイリング
		exportMetrics: true,
	},
	cache: {
		...DEFAULT_PERFORMANCE_CONFIG.cache,
		ttl: {
			...DEFAULT_PERFORMANCE_CONFIG.cache.ttl,
			priceData: 5 * 60 * 1000, // 開発時は短めのTTL
			indicators: 10 * 60 * 1000,
		},
	},
};

// プロダクション環境設定
export const PROD_PERFORMANCE_CONFIG: PerformanceConfig = {
	...DEFAULT_PERFORMANCE_CONFIG,
	cache: {
		...DEFAULT_PERFORMANCE_CONFIG.cache,
		maxSize: 2000, // プロダクションでは大きなキャッシュ
		ttl: {
			...DEFAULT_PERFORMANCE_CONFIG.cache.ttl,
			priceData: 30 * 60 * 1000, // 30分
			financialData: 6 * 60 * 60 * 1000, // 6時間（市場時間考慮）
		},
	},
	parallelization: {
		...DEFAULT_PERFORMANCE_CONFIG.parallelization,
		maxConcurrency: 10, // より多くの並列処理
	},
	memory: {
		...DEFAULT_PERFORMANCE_CONFIG.memory,
		maxHeapUsageMB: 1000, // プロダクションでは大きなメモリ許容
		alertThresholdMB: 800,
	},
};

export class PerformanceConfigManager {
	private static instance: PerformanceConfigManager;
	private config: PerformanceConfig;
	private environment: "development" | "production" | "test";

	private constructor() {
		this.environment = this.detectEnvironment();
		this.config = this.getEnvironmentConfig();
	}

	public static getInstance(): PerformanceConfigManager {
		if (!PerformanceConfigManager.instance) {
			PerformanceConfigManager.instance = new PerformanceConfigManager();
		}
		return PerformanceConfigManager.instance;
	}

	private detectEnvironment(): "development" | "production" | "test" {
		const nodeEnv = process.env.NODE_ENV?.toLowerCase();
		
		if (nodeEnv === "test") return "test";
		if (nodeEnv === "production") return "production";
		return "development";
	}

	private getEnvironmentConfig(): PerformanceConfig {
		switch (this.environment) {
			case "production":
				return PROD_PERFORMANCE_CONFIG;
			case "development":
				return DEV_PERFORMANCE_CONFIG;
			case "test":
				return {
					...DEFAULT_PERFORMANCE_CONFIG,
					cache: {
						...DEFAULT_PERFORMANCE_CONFIG.cache,
						ttl: {
							...DEFAULT_PERFORMANCE_CONFIG.cache.ttl,
							priceData: 1000, // テスト時は極短TTL
							indicators: 1000,
							financialData: 1000,
							default: 1000,
						},
					},
					monitoring: {
						...DEFAULT_PERFORMANCE_CONFIG.monitoring,
						enabled: false, // テスト時は監視無効
					},
				};
			default:
				return DEFAULT_PERFORMANCE_CONFIG;
		}
	}

	public getConfig(): PerformanceConfig {
		return { ...this.config }; // 設定のディープコピーを返す
	}

	public updateConfig(partialConfig: Partial<PerformanceConfig>): void {
		this.config = this.mergeConfig(this.config, partialConfig);
	}

	private mergeConfig(base: PerformanceConfig, partial: Partial<PerformanceConfig>): PerformanceConfig {
		const result = { ...base };
		
		for (const [key, value] of Object.entries(partial)) {
			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				const currentValue = (result as Record<string, unknown>)[key];
				const valueAsRecord = value as Record<string, unknown>;
				if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
					(result as Record<string, unknown>)[key] = {
						...(currentValue as Record<string, unknown>),
						...valueAsRecord,
					};
				} else {
					(result as Record<string, unknown>)[key] = valueAsRecord;
				}
			} else {
				(result as Record<string, unknown>)[key] = value;
			}
		}
		
		return result;
	}

	public getCacheConfig() {
		return this.config.cache;
	}

	public getParallelizationConfig() {
		return this.config.parallelization;
	}

	public getApiConfig() {
		return this.config.api;
	}

	public getMemoryConfig() {
		return this.config.memory;
	}

	public getMonitoringConfig() {
		return this.config.monitoring;
	}

	public getEnvironment() {
		return this.environment;
	}

	// 動的設定更新メソッド
	public enableProfiling(enable = true): void {
		this.config.monitoring.profileAll = enable;
	}

	public setCacheEnabled(enabled: boolean): void {
		this.config.cache.enabled = enabled;
	}

	public setParallelizationEnabled(enabled: boolean): void {
		this.config.parallelization.enabled = enabled;
	}

	public adjustForLowMemory(): void {
		this.config.cache.maxSize = Math.floor(this.config.cache.maxSize * 0.5);
		this.config.memory.maxHeapUsageMB = Math.floor(this.config.memory.maxHeapUsageMB * 0.7);
		this.config.parallelization.maxConcurrency = Math.max(1, Math.floor(this.config.parallelization.maxConcurrency * 0.5));
		
		console.log("⚠️ メモリ不足を検知: パフォーマンス設定を低メモリ環境に調整しました");
	}

	public adjustForHighLoad(): void {
		this.config.api.retryDelayMs *= 2;
		this.config.api.rateLimitDelay *= 3;
		this.config.parallelization.maxConcurrency = Math.max(1, Math.floor(this.config.parallelization.maxConcurrency * 0.7));
		
		console.log("⚠️ 高負荷を検知: API制限とレート制限を強化しました");
	}

	public reset(): void {
		this.config = this.getEnvironmentConfig();
	}

	// 設定検証
	public validateConfig(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];
		
		if (this.config.cache.maxSize <= 0) {
			errors.push("キャッシュサイズは正の値である必要があります");
		}
		
		if (this.config.parallelization.maxConcurrency <= 0) {
			errors.push("最大並列数は正の値である必要があります");
		}
		
		if (this.config.api.maxRetries < 0) {
			errors.push("最大リトライ数は非負値である必要があります");
		}
		
		if (this.config.memory.maxHeapUsageMB <= 0) {
			errors.push("最大ヒープ使用量は正の値である必要があります");
		}
		
		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	// 診断情報
	public getDiagnostics(): {
		environment: string;
		config: PerformanceConfig;
		validation: { isValid: boolean; errors: string[] };
	} {
		return {
			environment: this.environment,
			config: this.getConfig(),
			validation: this.validateConfig(),
		};
	}
}

// シングルトンインスタンス
export const performanceConfig = PerformanceConfigManager.getInstance();