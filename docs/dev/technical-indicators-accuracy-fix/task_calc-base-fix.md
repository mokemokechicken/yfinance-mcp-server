# Task 詳細: Calculator基盤の修正

**Task ID**: `calc-base-fix`  
**優先度**: 🔴 高  
**フェーズ**: Phase 1 - 基盤修正  
**予想工数**: 4-6時間

## 概要

Calculator.exponentialMovingAverageを業界標準実装に修正し、EMA初期値計算を「最初のperiod分の単純平均」方式に変更する。これにより市販チャートソフトとの計算結果の整合性を確保する。

## 現在の問題

### 1. 非標準的なEMA初期値
```typescript
// 現在の実装（問題）
ema[0] = values[0]; // 最初の値をそのまま使用
```

### 2. 入力検証の不足
- period <= 0 への対応なし
- 空配列の適切な処理なし
- データ長 < period の場合の処理が不十分

### 3. 市販チャートとの乖離
- TradingViewやMetaTrader等との計算結果が初期値から乖離
- 特にMACD計算で顕著な違いが発生

## 修正内容

### 1. EMA初期値の標準化
```typescript
// 修正後の実装
public static exponentialMovingAverage(
    values: number[],
    period: number,
): number[] {
    // 入力検証強化
    if (!Array.isArray(values) || values.length === 0) return [];
    if (period <= 0 || !Number.isInteger(period)) {
        throw new CalculationError("Period must be positive integer", "INVALID_PARAMETER");
    }
    if (values.length < period) return [];

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // 標準的な初期値計算: 最初のperiod分の単純平均
    const initialSMA = values.slice(0, period)
        .reduce((sum, value) => sum + value, 0) / period;
    
    // period-1番目に初期値をセット（標準実装）
    ema[period - 1] = initialSMA;

    // period番目以降をEMA計算
    for (let i = period; i < values.length; i++) {
        ema[i] = values[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }

    // 有効な値のみ返却（period-1以降）
    return ema.slice(period - 1);
}
```

### 2. 入力検証の強化
```typescript
// バリデーション追加
ValidationUtils.validatePricesArray(values);
ValidationUtils.validatePeriod(period);
```

### 3. エラーハンドリング改善
```typescript
// 明確なエラーメッセージ
throw new CalculationError(
    `Insufficient data for EMA: need ${period}, got ${values.length}`,
    "INSUFFICIENT_DATA"
);
```

## 実装手順

### Step 1: ValidationUtils作成
1. `src/lib/technical-indicators/utils/validation.ts`を作成
2. 共通バリデーション関数を実装
3. CalculationErrorインターフェースを拡張

### Step 2: Calculator.exponentialMovingAverage修正
1. 現在の実装をバックアップコメント化
2. 新しい標準実装を追加
3. 入力検証を統合
4. 戻り値の調整（period-1以降のみ）

### Step 3: 関連メソッドの調整
1. `simpleMovingAverage`の入力検証統一
2. その他のCalculatorメソッドの整合性確認

### Step 4: テストケース修正
1. 既存テストの期待値を新実装に合わせて調整
2. エラーケーステストの追加
3. 境界値テストの強化

## 影響範囲

### 直接影響
- `Calculator.exponentialMovingAverage`の全呼び出し元
- MACDCalculator（最も重要）
- MovingAverageCalculator.calculateEMA
- RSI計算では直接使用していないため影響軽微

### 間接影響
- MACD計算結果の変更（より正確になる）
- EMA系移動平均の計算結果変更
- 既存テストケースの期待値調整が必要

## テスト計画

### 1. 単体テスト
```typescript
describe("Calculator.exponentialMovingAverage - 修正版", () => {
    it("標準的なEMA初期値を使用する", () => {
        const prices = [10, 11, 12, 13, 14, 15];
        const period = 3;
        const result = Calculator.exponentialMovingAverage(prices, period);
        
        // 初期値は最初の3つの平均: (10+11+12)/3 = 11
        expect(result[0]).toBe(11);
    });

    it("TradingViewと同様の結果を返す", () => {
        const prices = [/* 既知のテストデータ */];
        const result = Calculator.exponentialMovingAverage(prices, 12);
        
        // TradingViewでの計算結果と比較
        expect(result).toBeCloseTo(expectedTradingViewResult, 3);
    });

    it("データ不足時は空配列を返す", () => {
        const prices = [10, 11];
        const result = Calculator.exponentialMovingAverage(prices, 5);
        expect(result).toEqual([]);
    });

    it("不正なperiodでエラーを投げる", () => {
        const prices = [10, 11, 12];
        expect(() => {
            Calculator.exponentialMovingAverage(prices, 0);
        }).toThrow(CalculationError);
    });
});
```

### 2. 統合テスト
- MACD計算での新EMA使用確認
- 既存の技術分析結果との整合性確認

### 3. 互換性テスト
- 市販チャートソフト（TradingView）との結果比較

## 完了条件

### 必須条件
- [ ] 新しいEMA実装が動作する
- [ ] 全入力検証が適切に機能する
- [ ] 既存の単体テストが成功する（期待値調整後）
- [ ] エラーハンドリングが正しく動作する

### 品質条件
- [ ] TradingViewとの計算結果差異が±0.1%以内
- [ ] パフォーマンス劣化がない（同等かそれ以上）
- [ ] メモリ使用量が増加していない

### ドキュメント条件
- [ ] 修正内容が明確にドキュメント化されている
- [ ] APIの使用方法に変更がないことを確認

## リスク

### 高リスク
- **既存計算結果の変更**: MACD等の結果が変わるため、既存の期待値調整が必要
- **互換性問題**: 既存コードでの動作に影響する可能性

### 中リスク
- **テスト工数**: 全関連テストケースの調整が必要
- **検証時間**: 市販チャートとの比較検証に時間が必要

### 対策
1. **段階的実装**: まず新メソッドを追加、動作確認後に既存を置換
2. **並行テスト**: 新旧両方式で計算し、結果を比較
3. **ロールバック準備**: 問題時にすぐ戻せるよう準備

## 成功指標

1. **正確性**: TradingViewと±0.1%以内の一致
2. **安定性**: 全エラーケースでクラッシュなし
3. **性能**: 計算時間の劣化なし
4. **互換性**: 既存APIインターフェース維持

## 次のタスクへの準備

このタスク完了後、以下が可能になる：
- Task 2.1: MACD計算修正（正しいEMAベース）
- Task 1.2: 共通バリデーション基盤の活用
- 全指標の計算精度向上