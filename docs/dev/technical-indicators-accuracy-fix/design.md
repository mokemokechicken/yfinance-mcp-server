# 設計書: テクニカル指標計算精度向上

## 1. 設計概要

既存のテクニカル指標ライブラリの4つの主要問題を段階的に修正し、数学的正確性、エラーハンドリング、パフォーマンスを向上させる。

## 2. アーキテクチャ設計

### 2.1 修正対象コンポーネント

```
src/lib/technical-indicators/
├── indicators/
│   ├── macd.ts           # 最重要修正対象
│   ├── rsi.ts            # エッジケース強化
│   └── movingAverage.ts  # パフォーマンス改善
└── utils/
    └── calculator.ts     # 基盤ユーティリティ修正
```

### 2.2 修正アプローチ

**段階的修正戦略**：
1. **Phase 1**: Calculator基盤の修正（EMA初期値標準化）
2. **Phase 2**: MACD致命的バグ修正
3. **Phase 3**: エラーハンドリング強化（全指標）
4. **Phase 4**: パフォーマンス最適化

## 3. 詳細設計

### 3.1 Calculator.exponentialMovingAverage修正

#### 現在の問題
```typescript
// 現在: 最初の値をそのまま使用
ema[0] = values[0];
```

#### 修正後設計
```typescript
// 標準的な実装: 最初のperiod分の単純平均を初期値とする
public static exponentialMovingAverage(
    values: number[],
    period: number,
): number[] {
    // 入力検証
    if (!Array.isArray(values) || values.length === 0) return [];
    if (period <= 0 || !Number.isInteger(period)) 
        throw new CalculationError("Invalid period", "INVALID_PARAMETER");
    if (values.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // 最初のperiod分の単純平均を初期値とする（業界標準）
    const initialSMA = values.slice(0, period)
        .reduce((sum, value) => sum + value, 0) / period;
    
    // period-1番目までは計算しない（標準的な実装）
    ema[period - 1] = initialSMA;

    // period番目以降をEMA計算
    for (let i = period; i < values.length; i++) {
        ema[i] = values[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }

    // 有効な値のみ返却（period-1以降）
    return ema.slice(period - 1);
}
```

### 3.2 MACD計算の修正

#### 現在の致命的問題
```typescript
// 問題: インデックスずれで異なる日付の値を比較
const startIndex = slowPeriod - fastPeriod; // 14
for (let i = startIndex; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i - startIndex]); // 14日ずれ
}
```

#### 修正後設計
```typescript
public static calculate(
    prices: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
): MACDResult {
    // 入力検証強化
    if (!Array.isArray(prices) || prices.length === 0) {
        throw new CalculationError("Invalid prices array", "INVALID_PRICES");
    }
    
    const minRequiredLength = slowPeriod + signalPeriod;
    if (prices.length < minRequiredLength) {
        throw new CalculationError(
            `Insufficient data: need ${minRequiredLength}, got ${prices.length}`,
            "INSUFFICIENT_DATA"
        );
    }

    // EMA計算（修正版Calculator使用）
    const fastEMA = Calculator.exponentialMovingAverage(prices, fastPeriod);
    const slowEMA = Calculator.exponentialMovingAverage(prices, slowPeriod);

    // 同じ日付の値で差分計算（修正版）
    const alignedLength = Math.min(fastEMA.length, slowEMA.length);
    const macdLine: number[] = [];
    
    for (let i = 0; i < alignedLength; i++) {
        macdLine.push(fastEMA[i] - slowEMA[i]);
    }

    // シグナル計算
    if (macdLine.length < signalPeriod) {
        throw new CalculationError(
            "Insufficient MACD data for signal calculation",
            "INSUFFICIENT_MACD_DATA"
        );
    }

    const signalLine = Calculator.exponentialMovingAverage(macdLine, signalPeriod);
    
    // 最新値取得（安全に）
    const macd = Calculator.round(macdLine[macdLine.length - 1], 3);
    const signal = Calculator.round(signalLine[signalLine.length - 1], 3);
    const histogram = Calculator.round(macd - signal, 3);

    return { macd, signal, histogram };
}
```

### 3.3 RSI計算の強化

#### 主な改善点
```typescript
public static calculate(
    prices: number[], 
    period = 14, 
    warmupPeriod = 100
): number {
    // 強化された入力検証
    if (!Array.isArray(prices) || prices.length === 0) {
        throw new CalculationError("Invalid prices array", "INVALID_PRICES");
    }
    
    if (period <= 0 || !Number.isInteger(period)) {
        throw new CalculationError("Period must be positive integer", "INVALID_PARAMETER");
    }

    // 最小データ長チェック（実用的調整版）
    // 注意: warmupPeriodの厳密な適用は実用的でないため、最小必要データ長のみチェック
    ValidationUtils.validateDataLength(prices.length, period + 1);

    // ウォームアップ期間を実用的範囲で適用
    const effectiveWarmup = Math.min(warmupPeriod, prices.length - period - 1);
    const startIndex = Math.max(0, prices.length - period - effectiveWarmup - 1);
    
    // 既存のロジック（正確なので維持）
    // ... 価格変化計算、平滑化処理
    
    // avgGain === 0 && avgLoss === 0 のケース追加
    if (avgGain === 0 && avgLoss === 0) {
        return 50; // 変化なしの場合は中立値
    }
    
    if (avgLoss === 0) {
        return 100; // 下落がない場合
    }
    
    // 既存のRS計算（維持）
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return Calculator.round(rsi, 2);
}
```

### 3.4 エラーハンドリング設計

#### エラー分類と処理戦略

```typescript
// 新しいエラー型定義
export interface CalculationError extends Error {
    code: 'INVALID_PRICES' | 'INVALID_PARAMETER' | 'INSUFFICIENT_DATA' | 'CALCULATION_FAILED';
    details?: any;
}

// 共通バリデーション関数（実装完了版）
export class ValidationUtils {
    static validatePricesArray(prices: number[]): void {
        if (!Array.isArray(prices)) {
            throw new CalculationError("Prices must be an array", "INVALID_PRICES");
        }
        if (prices.length === 0) {
            throw new CalculationError("Prices array cannot be empty", "INVALID_PRICES");
        }
        
        // 全ての値が有限数であることを確認
        const invalidIndex = prices.findIndex(price => !Number.isFinite(price));
        if (invalidIndex !== -1) {
            throw new CalculationError(
                `Invalid price at index ${invalidIndex}: ${prices[invalidIndex]}. Prices must contain only finite numbers`,
                "INVALID_PRICES"
            );
        }
    }

    static validatePeriod(period: number, paramName = "period"): void {
        if (!Number.isInteger(period) || period <= 0) {
            throw new CalculationError(
                `${paramName} must be a positive integer, got: ${period}`,
                "INVALID_PARAMETER"
            );
        }
    }

    // データ長の十分性をチェック（実装で追加）
    static validateDataLength(dataLength: number, required: number, dataType = "data"): void {
        if (dataLength < required) {
            throw new CalculationError(
                `Insufficient ${dataType}: need ${required}, got ${dataLength}`,
                "INSUFFICIENT_DATA"
            );
        }
    }

    // 期間関係の検証（MACD等で使用、実装で追加）
    static validatePeriodRelationship(fastPeriod: number, slowPeriod: number): void {
        this.validatePeriod(fastPeriod, "fastPeriod");
        this.validatePeriod(slowPeriod, "slowPeriod");
        
        if (slowPeriod <= fastPeriod) {
            throw new CalculationError(
                `Slow period (${slowPeriod}) must be greater than fast period (${fastPeriod})`,
                "INVALID_PARAMETER"
            );
        }
    }
}
```

### 3.5 パフォーマンス最適化設計

#### ストリーミング計算API（将来拡張用）

```typescript
// 段階的追加を想定した設計
export class StreamingCalculators {
    // O(1)でのEMA更新
    static updateEMA(
        prevEMA: number,
        newValue: number,
        period: number
    ): number {
        const multiplier = 2 / (period + 1);
        return newValue * multiplier + prevEMA * (1 - multiplier);
    }

    // O(1)でのRSI更新
    static updateRSI(
        prevAvgGain: number,
        prevAvgLoss: number,
        priceChange: number,
        period: number
    ): { rsi: number; avgGain: number; avgLoss: number } {
        const gain = priceChange > 0 ? priceChange : 0;
        const loss = priceChange < 0 ? Math.abs(priceChange) : 0;
        
        const avgGain = (prevAvgGain * (period - 1) + gain) / period;
        const avgLoss = (prevAvgLoss * (period - 1) + loss) / period;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
        
        return { rsi: Calculator.round(rsi, 2), avgGain, avgLoss };
    }
}
```

## 4. データフロー設計

### 4.1 修正前後の比較

#### 修正前（問題あり）
```
prices[] → fastEMA[0..n] → macdLine[i] = fastEMA[i] - slowEMA[i-14] (×)
         → slowEMA[0..n-14]              → signal[] → result
```

#### 修正後（正確）
```
prices[] → fastEMA[12..n] → macdLine[i] = fastEMA[i] - slowEMA[i] (○)
         → slowEMA[26..n] → signal[] → result
```

### 4.2 エラー処理フロー

```
Input → Validation → Calculation → Error Check → Result
  ↓        ↓            ↓           ↓           ↓
[data]  [validate]   [compute]   [verify]   [return]
  ↓        ↓            ↓           ↓           ↓
  ×    → Error ←――――――――×―――――――――××          ×
```

## 5. テスト設計方針

### 5.1 テストカテゴリ

1. **回帰テスト**: 既存動作の維持確認
2. **正確性テスト**: 修正による計算精度向上確認
3. **エラーハンドリングテスト**: 各種エラーケース
4. **パフォーマンステスト**: 速度・メモリ改善確認
5. **互換性テスト**: 市販チャートとの結果比較

### 5.2 テストデータ設計

```typescript
// 標準テストデータセット
export const TestDataSets = {
    // 基本動作確認用
    basic: [100, 101, 102, ...], // 50データポイント
    
    // エッジケース用
    insufficient: [100, 101], // 不十分なデータ
    constant: [100, 100, 100, ...], // 変動なし
    extreme: [100, 200, 50, 300, ...], // 極端な変動
    
    // 実データ近似
    realistic: [...], // 実際の株価データに近い動き
    
    // 既知解答データ（手計算 or 信頼できるソース）
    knownAnswer: {
        prices: [...],
        expectedMACD: {...},
        expectedRSI: 65.43,
        expectedMA: {...}
    }
};
```

## 6. 実装優先順位

### Phase 1: 基盤修正（高優先度）
1. Calculator.exponentialMovingAverage修正
2. エラーハンドリング基盤追加
3. バリデーション共通化

### Phase 2: MACD修正（最重要）
1. インデックスずれ修正
2. MACD専用テスト強化

### Phase 3: 包括的改善（中優先度）
1. RSI強化
2. 移動平均最適化
3. エラーケーステスト追加

### Phase 4: 最適化（低優先度）
1. パフォーマンス改善
2. ストリーミングAPI追加
3. ドキュメント更新

## 7. 品質保証

### 7.1 修正検証方法
1. **数学的検証**: 手計算との比較
2. **互換性検証**: TradingView等との結果比較
3. **回帰検証**: 既存テスト全パス
4. **o3再レビュー**: 修正完了後の再評価

### 7.2 リリース基準
- [ ] 全テストケース成功
- [ ] o3ツール再レビューでの問題解決確認
- [ ] 既存APIインターフェース維持
- [ ] パフォーマンス劣化なし
- [ ] エラーケースでのクラッシュゼロ

## 8. リスク軽減策

### 8.1 段階的デプロイ
1. 開発環境での十分なテスト
2. 既存機能との並行動作による比較
3. 必要に応じたロールバック準備

### 8.2 互換性維持
1. 既存メソッドシグネチャの維持
2. デフォルトパラメータの保持
3. エラー処理の段階的強化（警告→エラー）