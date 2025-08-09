# Task 詳細: MACD計算ロジックの修正

**Task ID**: `macd-index-fix`  
**優先度**: 🔴 最重要  
**フェーズ**: Phase 2 - MACD修正  
**予想工数**: 6-8時間  
**依存関係**: Task 1.1 (calc-base-fix) 完了後

## 概要

MACDCalculator.calculateメソッドの致命的なインデックスずれ問題を修正する。現在は短期EMAと長期EMAの異なる日付の値を比較しているが、これを同一日付の値で差分計算するよう修正する。

## 現在の致命的な問題

### 問題の詳細
```typescript
// 現在の実装（致命的バグ）
const startIndex = slowPeriod - fastPeriod; // 26-12=14
for (let i = startIndex; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
    //            ↑現在日    ↑14日前    ←14日ずれている！
}
```

### 具体例での問題
```
日付:    1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20...
fastEMA: -  -  -  -  -  -  -  -  -  -  -  x  x  x  x  x  x  x  x  x...
slowEMA: -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -...

現在の実装:
MACD[0] = fastEMA[14] - slowEMA[0]  ← 14日ずれ！
MACD[1] = fastEMA[15] - slowEMA[1]  ← 14日ずれ！

正しい実装:
MACD[0] = fastEMA[14] - slowEMA[14]  ← 同じ日付
MACD[1] = fastEMA[15] - slowEMA[15]  ← 同じ日付
```

## o3ツール指摘内容の再確認

> 短期 EMA と長期 EMA を差し引く位置がずれている  
> startIndex = slowPeriod – fastPeriod (26-12=14) により  
> macdLine[i] = fastEMA[i] - slowEMA[i-14]  
> となり、同じ日付の値を比較していません。

## 修正後の実装設計

### 1. アライメント方式の修正
```typescript
public static calculate(
    prices: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
): MACDResult {
    // 入力検証（強化版）
    ValidationUtils.validatePricesArray(prices);
    ValidationUtils.validatePeriod(fastPeriod);
    ValidationUtils.validatePeriod(slowPeriod);
    ValidationUtils.validatePeriod(signalPeriod);
    
    if (slowPeriod <= fastPeriod) {
        throw new CalculationError(
            "Slow period must be greater than fast period",
            "INVALID_PARAMETER"
        );
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
    const macdLine: number[] = [];
    
    // 両EMAが有効な期間のみ計算
    const alignedLength = Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = 0; i < alignedLength; i++) {
        macdLine.push(fastEMA[i] - slowEMA[i]); // 同一インデックス = 同一日付
    }

    // シグナル計算
    if (macdLine.length < signalPeriod) {
        throw new CalculationError(
            `Insufficient MACD data for signal: need ${signalPeriod}, got ${macdLine.length}`,
            "INSUFFICIENT_MACD_DATA"
        );
    }

    const signalLine = Calculator.exponentialMovingAverage(macdLine, signalPeriod);
    
    // 最新値取得（安全に）
    if (macdLine.length === 0 || signalLine.length === 0) {
        throw new CalculationError("No valid MACD or signal data", "CALCULATION_FAILED");
    }
    
    const macd = Calculator.round(macdLine[macdLine.length - 1], 3);
    const signal = Calculator.round(signalLine[signalLine.length - 1], 3);
    const histogram = Calculator.round(macd - signal, 3);

    return { macd, signal, histogram };
}
```

### 2. データフロー修正
```
修正前（間違い）:
prices[] → fastEMA[12..n]  → macdLine[i] = fastEMA[i+14] - slowEMA[i] ×
         → slowEMA[26..n]   

修正後（正確）:
prices[] → fastEMA[12..n]  → 両方有効な範囲 → macdLine[i] = fastEMA[i] - slowEMA[i] ○
         → slowEMA[26..n]  → で同一日付計算
```

## 実装手順

### Step 1: バックアップと準備
1. 現在の`macd.ts`をバックアップ
2. テスト用の既知データセット準備
3. 修正前の計算結果を記録（比較用）

### Step 2: calculate修正
1. インデックスずれ修正の実装
2. エラーハンドリング強化
3. 入力検証の統合

### Step 3: calculateArray修正
1. 同様のインデックスずれ修正
2. ヒストグラム計算の調整
3. 配列長の整合性確保

### Step 4: 補助メソッド修正
1. `detectCross`の修正
2. `detectDivergence`の修正
3. その他関連メソッドの整合性確認

## 検証計画

### 1. 手計算による検証
```typescript
// 簡単なテストケースで手計算検証
const testPrices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
// 手計算でMACD値を求め、実装結果と比較
```

### 2. TradingView比較検証
```typescript
// 実際の株価データでTradingViewと比較
const realStockData = [/* SPY等の実データ */];
const ourResult = MACDCalculator.calculate(realStockData, 12, 26, 9);
// TradingViewの結果と±0.1%以内の一致を確認
```

### 3. 境界値テスト
```typescript
describe("MACD修正版 - 境界値テスト", () => {
    it("最小データ長で正しく計算する", () => {
        const minData = new Array(26 + 9).fill(100);
        expect(() => MACDCalculator.calculate(minData)).not.toThrow();
    });

    it("データ不足時は適切なエラーを投げる", () => {
        const insufficientData = new Array(30).fill(100);
        expect(() => MACDCalculator.calculate(insufficientData))
            .toThrow(CalculationError);
    });
});
```

## 影響範囲分析

### 直接影響
- **MACDCalculator.calculate**: 計算結果が大幅に変更（正確になる）
- **MACDCalculator.calculateArray**: 同様の修正が必要
- **関連メソッド**: detectCross, detectDivergence等

### 間接影響
- **TechnicalAnalyzer**: MACD結果を使用する分析ロジック
- **既存テストケース**: 期待値の大幅な調整が必要
- **実際の使用者**: より正確なMACD値の提供

### APIインターフェース
- **変更なし**: メソッドシグネチャは維持
- **戻り値構造**: MACDResult構造は維持
- **エラー処理**: より詳細なエラー情報提供

## テスト戦略

### 1. 単体テスト更新
```typescript
describe("MACDCalculator - インデックス修正版", () => {
    it("同一日付のEMA値で差分を計算する", () => {
        // 検証可能なテストケース
        const prices = [/* 既知の価格データ */];
        const result = MACDCalculator.calculate(prices, 3, 5, 2);
        
        // 手計算による期待値と比較
        expect(result.macd).toBeCloseTo(expectedValue, 3);
    });

    it("TradingViewと同様の結果を返す", () => {
        const realData = [/* 実際の株価データ */];
        const result = MACDCalculator.calculate(realData, 12, 26, 9);
        
        // TradingViewでの計算結果
        expect(result.macd).toBeCloseTo(tradingViewResult.macd, 2);
    });
});
```

### 2. 回帰テスト対策
```typescript
// 既存テストの期待値を新しい正確な計算に更新
// 修正前後の結果差異レポート作成
```

## 完了条件

### 必須条件
- [ ] 同一日付のEMA値で差分計算が実行される
- [ ] 全エラーケースで適切な例外が発生する
- [ ] calculateArrayも同様に修正される
- [ ] 既存のメソッドシグネチャが維持される

### 品質条件  
- [ ] TradingViewとの結果差異が±0.1%以内
- [ ] 手計算による検証が成功する
- [ ] 全境界値テストが成功する
- [ ] パフォーマンス劣化がない

### ドキュメント条件
- [ ] 修正内容が詳細にドキュメント化される
- [ ] インデックスずれ問題の説明が追加される

## リスク管理

### 高リスク
- **大幅な結果変更**: 既存の期待値が全て変わる
- **テスト工数**: 全MACDテストの書き直しが必要

### 中リスク
- **検証時間**: TradingViewとの比較検証に時間要
- **依存関係**: 他の指標への間接的影響

### 対策
1. **段階的検証**: 小さなデータセットから検証開始
2. **並行実装**: 新旧両方式で結果比較
3. **十分な時間確保**: 検証に十分な時間を割り当て

## 成功後の効果

### 1. 正確性向上
- 数学的に正しいMACD計算の実現
- 市販チャートソフトとの整合性確保

### 2. 信頼性向上  
- テクニカル分析結果の信頼性向上
- プロダクション使用での安心感

### 3. 基盤強化
- 他の指標修正の基盤となる
- エラーハンドリングの標準化

このタスクの成功により、最も重要な計算精度問題が解決され、プロジェクト全体の品質が大幅に向上します。