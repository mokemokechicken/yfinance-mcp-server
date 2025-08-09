# Technical Indicators Library - 設計書

## 1. アーキテクチャ概要

### 1.1 システム構成
```
src/lib/technical-indicators/
├── index.ts                 # エクスポート用のエントリーポイント
├── types.ts                 # 型定義
├── indicators/
│   ├── movingAverage.ts     # 移動平均線計算
│   ├── rsi.ts              # RSI計算
│   └── macd.ts             # MACD計算
├── utils/
│   ├── dataProcessor.ts     # データ前処理
│   └── calculator.ts        # 共通計算ロジック
└── technicalAnalyzer.ts     # メインのアナライザークラス

spike/
└── spike_api.ts            # 検証用テストファイル
```

### 1.2 データフロー
```
Yahoo Finance API → Raw Data → Data Processor → Technical Indicators → JSON Output
                                                        ↓
                                            spike_api.ts (検証)
```

## 2. 詳細設計

### 2.1 型定義 (types.ts)

```typescript
// 価格データの型
export interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// テクニカル指標の結果型
export interface TechnicalIndicators {
  movingAverages: {
    ma25: number;
    ma50: number;
    ma200: number;
  };
  rsi: {
    rsi14: number;
    rsi21: number;
  };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

// 最終出力型
export interface StockAnalysisResult {
  symbol: string;
  companyName: string;
  period: string;
  lastUpdated: string;
  priceData: {
    current: number;
    change: number;
    changePercent: number;
  };
  technicalIndicators: TechnicalIndicators;
  signals: {
    trend: 'upward' | 'downward' | 'sideways';
    momentum: 'positive' | 'negative' | 'neutral';
    strength: 'strong' | 'moderate' | 'weak';
  };
}
```

### 2.2 メインアナライザー (technicalAnalyzer.ts)

```typescript
export class TechnicalAnalyzer {
  constructor(private yahooFinanceData: PriceData[]) {}

  // メインの分析実行メソッド
  public analyze(symbol: string): StockAnalysisResult {
    // 1. データの前処理
    // 2. 各指標の計算
    // 3. シグナル判定
    // 4. 結果の統合
  }

  // Yahoo Finance APIからのデータ取得
  public static async fetchData(symbol: string, period: string): Promise<PriceData[]> {
    // yahoo-finance2を使用してデータ取得
  }
}
```

### 2.3 個別指標計算モジュール

#### 移動平均線 (indicators/movingAverage.ts)
```typescript
export class MovingAverageCalculator {
  // シンプル移動平均の計算
  public static calculate(prices: number[], period: number): number {
    // 直近period日分の平均を計算
  }

  // 指数移動平均の計算（将来拡張用）
  public static calculateEMA(prices: number[], period: number): number {
    // EMA計算ロジック
  }
}
```

#### RSI (indicators/rsi.ts)
```typescript
export class RSICalculator {
  public static calculate(prices: number[], period: number = 14): number {
    // 1. 価格変動の計算
    // 2. 上昇・下落の平均計算
    // 3. RS = 上昇平均 / 下落平均
    // 4. RSI = 100 - (100 / (1 + RS))
  }
}
```

#### MACD (indicators/macd.ts)
```typescript
export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export class MACDCalculator {
  public static calculate(
    prices: number[], 
    fastPeriod: number = 12, 
    slowPeriod: number = 26, 
    signalPeriod: number = 9
  ): MACDResult {
    // 1. 短期EMA(12日)と長期EMA(26日)の計算
    // 2. MACD = 短期EMA - 長期EMA
    // 3. Signal = MACDの9日EMA
    // 4. Histogram = MACD - Signal
  }
}
```

### 2.4 ユーティリティモジュール

#### データ処理 (utils/dataProcessor.ts)
```typescript
export class DataProcessor {
  // Yahoo Financeの生データを内部形式に変換
  public static processRawData(rawData: any[]): PriceData[] {
    // データの正規化とバリデーション
  }

  // 価格データの前処理（異常値除去、欠損値補完）
  public static cleanData(data: PriceData[]): PriceData[] {
    // データクリーニング処理
  }
}
```

#### 計算ヘルパー (utils/calculator.ts)
```typescript
export class Calculator {
  // 標準偏差計算
  public static standardDeviation(values: number[]): number {}

  // 指数移動平均計算
  public static exponentialMovingAverage(values: number[], period: number): number {}

  // 数値の丸め処理
  public static round(value: number, decimals: number = 2): number {}
}
```

## 3. エラーハンドリング設計

### 3.1 エラー階層
```typescript
export class TechnicalIndicatorError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class DataFetchError extends TechnicalIndicatorError {}
export class CalculationError extends TechnicalIndicatorError {}
export class ValidationError extends TechnicalIndicatorError {}
```

### 3.2 エラー対応戦略
- **API障害**: リトライ機能（最大3回）
- **データ不足**: 最低限必要なデータ期間の確認
- **計算エラー**: NaN/Infinityのチェックとデフォルト値返却

## 4. パフォーマンス設計

### 4.1 計算最適化
- 移動平均: 累積和を使った効率計算
- RSI: インクリメンタル計算でO(n)時間計算量
- MACD: EMAの再利用による計算回数削減

### 4.2 メモリ最適化
- 大量データ処理時のストリーミング処理
- 不要な中間データの早期ガベージコレクション

## 5. テスト設計

### 5.1 spike_api.tsでの検証項目
```typescript
// 1. 基本動作確認
const analyzer = new TechnicalAnalyzer(mockData);
const result = analyzer.analyze('6301.T');

// 2. 各指標の精度確認
console.log('MA25:', result.technicalIndicators.movingAverages.ma25);
console.log('RSI14:', result.technicalIndicators.rsi.rsi14);
console.log('MACD:', result.technicalIndicators.macd);

// 3. エラーケースの確認
// - 不正なシンボル
// - データ不足
// - API障害シミュレーション
```

### 5.2 テストデータ
- コマツ(6301)の過去1年分のデータ
- 既知の結果との比較検証
- エッジケース（データ欠損、極端な値）

## 6. 設定パラメータ

### 6.1 デフォルト設定
```typescript
export const DEFAULT_CONFIG = {
  movingAverages: {
    periods: [25, 50, 200]
  },
  rsi: {
    periods: [14, 21]
  },
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9
  },
  precision: {
    price: 2,        // 価格は小数点以下2桁
    indicator: 3,    // 指標は小数点以下3桁
    percentage: 2    // パーセントは小数点以下2桁
  }
};
```

## 7. 拡張性設計

### 7.1 新指標追加のインターフェース
```typescript
export interface IndicatorCalculator {
  calculate(data: PriceData[], config?: any): number | object;
  validate(data: PriceData[]): boolean;
}
```

### 7.2 プラグイン機能
将来的にボリンジャーバンドやストキャスティクスを追加する際の統一インターフェースを提供

## 8. 実装優先度

### Phase 1: 基本構造
1. 型定義とインターフェース
2. データ処理ユーティリティ
3. Yahoo Finance連携

### Phase 2: コア指標
1. 移動平均線計算
2. RSI計算  
3. MACD計算

### Phase 3: 統合とテスト
1. TechnicalAnalyzerクラス
2. spike_api.tsでの検証
3. エラーハンドリングの完成

この設計に基づいて実装を進めてよろしいでしょうか？