/**
 * キャッシュ管理システム
 * 計算結果のキャッシュを統一管理し、パフォーマンス最適化を実現
 */

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	accessCount: number;
	lastAccess: number;
}

export interface CacheStats {
	totalEntries: number;
	hitRate: number;
	totalHits: number;
	totalMisses: number;
	memoryUsageKB: number;
	oldestEntry: number;
	newestEntry: number;
	[key: string]: number;
}

export class CacheManager {
	private cache = new Map<string, CacheEntry<unknown>>();
	private hits = 0;
	private misses = 0;
	
	// TTL設定（ミリ秒）
	private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1時間
	private static readonly PRICE_DATA_TTL = 15 * 60 * 1000; // 価格データは15分
	private static readonly FINANCIAL_DATA_TTL = 24 * 60 * 60 * 1000; // 財務データは24時間
	private static readonly INDICATOR_TTL = 30 * 60 * 1000; // 指標計算は30分

	// キャッシュサイズ制限
	private static readonly MAX_CACHE_SIZE = 1000;
	private static readonly CLEANUP_BATCH_SIZE = 100;

	/**
	 * キャッシュからデータを取得
	 */
	public get<T>(key: string, ttl?: number): T | null {
		const entry = this.cache.get(key);
		
		if (!entry) {
			this.misses++;
			return null;
		}

		const currentTime = Date.now();
		const effectiveTTL = ttl || CacheManager.DEFAULT_TTL;
		
		// TTL確認
		if (currentTime - entry.timestamp > effectiveTTL) {
			this.cache.delete(key);
			this.misses++;
			return null;
		}

		// アクセス統計更新
		entry.accessCount++;
		entry.lastAccess = currentTime;
		this.hits++;
		
		return entry.data as T;
	}

	/**
	 * キャッシュにデータを保存
	 */
	public set<T>(key: string, data: T, ttl?: number): void {
		const currentTime = Date.now();
		
		// キャッシュサイズ制限チェック
		if (this.cache.size >= CacheManager.MAX_CACHE_SIZE) {
			this.evictOldEntries();
		}

		const entry: CacheEntry<T> = {
			data,
			timestamp: currentTime,
			accessCount: 1,
			lastAccess: currentTime,
		};

		this.cache.set(key, entry);
	}

	/**
	 * 特定の価格データをキャッシュ
	 */
	public setPriceData<T>(symbol: string, period: string, data: T): void {
		const key = this.generatePriceDataKey(symbol, period);
		this.set(key, data, CacheManager.PRICE_DATA_TTL);
	}

	/**
	 * 価格データを取得
	 */
	public getPriceData<T>(symbol: string, period: string): T | null {
		const key = this.generatePriceDataKey(symbol, period);
		return this.get<T>(key, CacheManager.PRICE_DATA_TTL);
	}

	/**
	 * 財務データをキャッシュ
	 */
	public setFinancialData<T>(symbol: string, data: T): void {
		const key = this.generateFinancialDataKey(symbol);
		this.set(key, data, CacheManager.FINANCIAL_DATA_TTL);
	}

	/**
	 * 財務データを取得
	 */
	public getFinancialData<T>(symbol: string): T | null {
		const key = this.generateFinancialDataKey(symbol);
		return this.get<T>(key, CacheManager.FINANCIAL_DATA_TTL);
	}

	/**
	 * 指標計算結果をキャッシュ
	 */
	public setIndicatorResult<T>(symbol: string, indicatorName: string, params: Record<string, unknown>, data: T): void {
		const key = this.generateIndicatorKey(symbol, indicatorName, params);
		this.set(key, data, CacheManager.INDICATOR_TTL);
	}

	/**
	 * 指標計算結果を取得
	 */
	public getIndicatorResult<T>(symbol: string, indicatorName: string, params: Record<string, unknown>): T | null {
		const key = this.generateIndicatorKey(symbol, indicatorName, params);
		return this.get<T>(key, CacheManager.INDICATOR_TTL);
	}

	/**
	 * 古いエントリを削除
	 */
	private evictOldEntries(): void {
		const entries = Array.from(this.cache.entries());
		
		// 最終アクセス時間でソート
		entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
		
		// 古いエントリを削除
		const toDelete = entries.slice(0, CacheManager.CLEANUP_BATCH_SIZE);
		for (const [key] of toDelete) {
			this.cache.delete(key);
		}
	}

	/**
	 * キャッシュクリア
	 */
	public clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * 特定のパターンのキーを削除
	 */
	public clearPattern(pattern: string): void {
		const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
		for (const key of keysToDelete) {
			this.cache.delete(key);
		}
	}

	/**
	 * キャッシュ統計を取得
	 */
	public getStats(): CacheStats {
		const entries = Array.from(this.cache.values());
		const totalRequests = this.hits + this.misses;
		const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
		
		// メモリ使用量推定（簡易版）
		let memoryUsage = 0;
		for (const [key, entry] of this.cache.entries()) {
			memoryUsage += key.length * 2; // 文字列のバイト数（UTF-16）
			memoryUsage += this.estimateObjectSize(entry.data);
			memoryUsage += 32; // entry メタデータ
		}

		const timestamps = entries.map(e => e.timestamp);
		
		return {
			totalEntries: this.cache.size,
			hitRate: Number(hitRate.toFixed(2)),
			totalHits: this.hits,
			totalMisses: this.misses,
			memoryUsageKB: Math.round(memoryUsage / 1024),
			oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
			newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
		};
	}

	/**
	 * オブジェクトサイズの推定
	 */
	private estimateObjectSize(obj: any): number {
		const jsonString = JSON.stringify(obj);
		return jsonString.length * 2; // UTF-16での推定バイト数
	}

	/**
	 * 価格データキーの生成
	 */
	private generatePriceDataKey(symbol: string, period: string): string {
		return `price:${symbol}:${period}`;
	}

	/**
	 * 財務データキーの生成
	 */
	private generateFinancialDataKey(symbol: string): string {
		return `financial:${symbol}`;
	}

	/**
	 * 指標キーの生成
	 */
	private generateIndicatorKey(symbol: string, indicatorName: string, params: any): string {
		const paramHash = this.hashParams(params);
		return `indicator:${symbol}:${indicatorName}:${paramHash}`;
	}

	/**
	 * パラメータのハッシュ化
	 */
	private hashParams(params: any): string {
		return Buffer.from(JSON.stringify(params)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
	}

	/**
	 * 期限切れエントリの自動クリーンアップ
	 */
	public cleanupExpiredEntries(): void {
		const currentTime = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			// デフォルトTTLで期限切れチェック
			if (currentTime - entry.timestamp > CacheManager.DEFAULT_TTL) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.cache.delete(key);
		}
	}

	/**
	 * キャッシュワーミング用のプリロード
	 */
	public async preloadCommonData(symbols: string[], periods: string[] = ["1y", "6mo", "3mo"]): Promise<void> {
		// よく使用される銘柄・期間の組み合わせを事前にロード
		// 実際の実装では、バックグラウンドで価格データを取得してキャッシュに保存
		console.log(`Cache warming: ${symbols.length} symbols × ${periods.length} periods`);
	}
}

// シングルトンインスタンス
export const globalCacheManager = new CacheManager();