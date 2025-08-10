# 技術指標パラメータ化機能 設計書

## 1. アーキテクチャ概要

### 1.1 設計原則
- **下位互換性**: 既存のAPI呼び出しは変更なく動作
- **Graceful Degradation**: パラメータエラー時もデフォルト値で継続
- **拡張性**: 新しい指標の追加が容易
- **型安全性**: TypeScript型システムの活用

### 1.2 システム構成図
```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   MCP Tool      │    │  Technical Analyzer   │    │  Yahoo Finance  │
│ getStockAnalysis│────│  + Parameter Config   │────│      API        │
│                 │    │  + VWAP Calculator    │    │ (日足 + 15分足)  │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│  Parameter      │    │   Indicator          │
│  Validation     │    │   Calculators        │
│  + Defaults     │    │  (MA/RSI/MACD/BB/   │
│                 │    │   Stoch/Vol/VWAP)    │
└─────────────────┘    └──────────────────────┘
```

## 2. データ構造設計

### 2.1 拡張パラメータ型定義
```typescript
// 新規追加: パラメータ設定用インターフェース
export interface TechnicalParametersConfig {
  movingAverages?: {
    periods?: number[];            // デフォルト[25, 50, 200]
  };
  rsi?: {
    periods?: number[];            // デフォルト[14, 21]
    overbought?: number;           // デフォルト70
    oversold?: number;             // デフォルト30
  };
  macd?: {
    fastPeriod?: number;           // デフォルト12
    slowPeriod?: number;           // デフォルト26
    signalPeriod?: number;         // デフォルト9
  };
  bollingerBands?: {
    period?: number;               // デフォルト20
    standardDeviations?: number;   // デフォルト2
  };
  stochastic?: {
    kPeriod?: number;              // デフォルト14
    dPeriod?: number;              // デフォルト3
    overbought?: number;           // デフォルト80
    oversold?: number;             // デフォルト20
  };
  volumeAnalysis?: {
    period?: number;               // デフォルト20
    spikeThreshold?: number;       // デフォルト2.0
  };
  vwap?: {
    enableTrueVWAP?: boolean;      // デフォルトtrue（15分足ベース）
    standardDeviations?: number;   // デフォルト1
  };
  mvwap?: {
    period?: number;               // デフォルト20（移動期間）
    standardDeviations?: number;   // デフォルト1
  };
}

// MCP Tool引数の拡張
export interface StockAnalysisRequest {
  symbol: string;                    // 既存（必須）
  days?: number;                     // 既存（オプション、デフォルト7）
  technicalParams?: TechnicalParametersConfig; // 新規追加
}
```

### 2.2 拡張結果型定義
```typescript
// VWAP結果の拡張
export interface VWAPAnalysisResult {
  trueDailyVWAP?: VWAPResult;       // 15分足ベースの真の1日VWAP
  movingVWAP: VWAPResult;           // 従来の移動VWAP
  recommendedVWAP: 'daily' | 'moving'; // 推奨指標
  dataSource: {
    daily?: '15min' | 'unavailable';
    moving: 'daily';
  };
}

// 拡張指標結果の修正
export interface ExtendedIndicatorsResult {
  bollingerBands: BollingerBandsResult & { config: { period: number; sigma: number } };
  stochastic: StochasticResult & { config: { kPeriod: number; dPeriod: number } };
  crossDetection: CrossDetectionResult;
  volumeAnalysis: VolumeAnalysisResult & { config: { period: number } };
  vwap: VWAPAnalysisResult;         // 拡張
  rsiExtended: RSIExtendedResult & { config: { periods: number[] } };
  movingAverageDeviations: (MovingAverageDeviationResult & { period: number })[];
}
```

## 3. コンポーネント設計

### 3.1 パラメータ管理コンポーネント

#### ParameterValidator クラス
```typescript
export class ParameterValidator {
  // パラメータ検証とデフォルト値設定
  public static validateAndSetDefaults(
    params?: TechnicalParametersConfig
  ): ValidatedTechnicalParameters;
  
  // 個別パラメータ検証
  private static validatePeriods(periods: number[], min: number, max: number): number[];
  private static validateThreshold(value: number, min: number, max: number): number;
  private static validateBooleanFlag(value: boolean): boolean;
}
```

#### ConfigManager クラス
```typescript
export class ConfigManager {
  // 設定の統合とマージ
  public static mergeWithDefaults(
    userParams: TechnicalParametersConfig,
    defaults: TechnicalParametersConfig
  ): TechnicalParametersConfig;
  
  // 設定情報の出力フォーマット作成
  public static generateConfigSummary(config: TechnicalParametersConfig): ConfigSummary;
}
```

### 3.2 VWAP計算コンポーネントの拡張

#### TrueVWAPCalculator クラス（新規）
```typescript
export class TrueVWAPCalculator {
  // 15分足データでの真の1日VWAP計算
  public static async calculateTrueDailyVWAP(
    symbol: string,
    targetDate?: Date,
    standardDeviations = 1
  ): Promise<VWAPResult | null>;
  
  // 15分足データの取得
  private static async fetch15MinData(symbol: string, date: Date): Promise<PriceData[]>;
  
  // データ品質チェック
  private static validateDataQuality(data: PriceData[]): boolean;
}
```

#### HybridVWAPCalculator クラス（新規）
```typescript
export class HybridVWAPCalculator {
  // 真のVWAPと移動VWAPの統合計算
  public static async calculateHybridVWAP(
    symbol: string,
    priceData: PriceData[],
    config: VWAPConfig
  ): Promise<VWAPAnalysisResult>;
  
  // 最適なVWAP選択ロジック
  private static selectRecommendedVWAP(
    dailyVWAP: VWAPResult | null,
    movingVWAP: VWAPResult
  ): 'daily' | 'moving';
}
```

### 3.3 TechnicalAnalyzer の拡張

#### 主要変更点
```typescript
export class TechnicalAnalyzer {
  private config: IndicatorConfig;
  private parameterConfig: TechnicalParametersConfig; // 新規追加

  constructor(
    priceData: PriceData[], 
    config: IndicatorConfig = DEFAULT_CONFIG,
    parameterConfig: TechnicalParametersConfig = {}  // 新規追加
  );

  // 包括的分析メソッドの拡張
  public static async analyzeStockComprehensive(
    symbol: string,
    period = "1y",
    includeFinancials = true,
    technicalParams?: TechnicalParametersConfig  // 新規追加
  ): Promise<ComprehensiveStockAnalysisResult>;

  // 拡張指標計算メソッドの修正
  public calculateExtendedIndicators(
    customConfig?: TechnicalParametersConfig  // 新規追加
  ): ExtendedIndicatorsResult;
}
```

## 4. API設計

### 4.1 MCP Tool インターフェース修正

#### getStockAnalysis の拡張
```typescript
// src/index.ts での実装
{
  name: "getStockAnalysis",
  description: "株式の包括的分析（技術指標パラメータ化対応）",
  inputSchema: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "株式シンボル" },
      days: { type: "number", description: "表示日数", default: 7 },
      technicalParams: {  // 新規追加
        type: "object",
        description: "技術指標パラメータ設定（オプション）",
        properties: {
          movingAverages: {
            type: "object",
            properties: {
              periods: { 
                type: "array", 
                items: { type: "number" },
                description: "移動平均期間配列"
              }
            }
          },
          // ... 他のパラメータ定義
        }
      }
    },
    required: ["symbol"]
  }
}
```

### 4.2 データフロー設計

#### 処理フロー
```
1. Tool引数受信
   ↓
2. パラメータ検証・デフォルト値設定 (ParameterValidator)
   ↓
3. 設定統合 (ConfigManager)
   ↓
4. 並列データ取得
   ├─ 日足データ取得 (既存)
   ├─ 15分足データ取得 (新規: VWAP用)
   └─ 財務データ取得 (既存)
   ↓
5. 指標計算
   ├─ 基本指標 (カスタムパラメータ適用)
   ├─ 拡張指標 (カスタムパラメータ適用)
   └─ ハイブリッドVWAP計算 (新規)
   ↓
6. 出力フォーマット生成
   └─ 設定情報付き日本語レポート
```

## 5. 出力フォーマット設計

### 5.1 日本語レポート拡張

#### パラメータ表示の統一フォーマット
```typescript
// 設定情報セクション
export interface ConfigDisplaySection {
  title: string;
  isCustom: boolean;
  parameters: {
    name: string;
    value: string;
    isDefault: boolean;
  }[];
}

// 指標表示の拡張
export interface IndicatorDisplayFormat {
  emoji: string;
  name: string;
  config: string;        // "(25日)" や "(12,26,9日)" 等
  value: string;
  status: string;        // "📈" や "⚠️買われすぎ圏" 等
  isCustomConfig: boolean;
}
```

#### レポート生成フロー
```
1. 設定情報の整理
   ├─ デフォルト設定識別
   ├─ カスタム設定識別
   └─ 表示フォーマット決定

2. 指標セクション生成
   ├─ 基本情報 (設定パラメータ明記)
   ├─ 分析結果 (従来通り)
   └─ カスタム設定警告 (該当時)

3. VWAP特別セクション
   ├─ 真の1日VWAP (利用可能時)
   ├─ 移動VWAP (常時)
   └─ 推奨指標表示
```

### 5.2 エラーハンドリング設計

#### エラー分類
```typescript
export enum ParameterErrorType {
  INVALID_RANGE = "INVALID_RANGE",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA", 
  API_RATE_LIMIT = "API_RATE_LIMIT",
  VWAP_DATA_UNAVAILABLE = "VWAP_DATA_UNAVAILABLE"
}

export interface ParameterWarning {
  type: ParameterErrorType;
  parameter: string;
  message: string;
  fallbackValue: any;
}
```

#### Graceful Degradation戦略
1. **パラメータエラー**: デフォルト値で継続、警告表示
2. **データ不足**: 計算可能な指標のみ表示
3. **API制限**: キャッシュデータ利用、制限情報表示
4. **VWAP計算失敗**: 移動VWAPのみ表示、理由説明

## 6. パフォーマンス設計

### 6.1 キャッシュ戦略

#### データキャッシュ設計
```typescript
export class DataCacheManager {
  // 15分足データキャッシュ (1時間TTL)
  private static intraday15MinCache: Map<string, CachedData>;
  
  // 日足データキャッシュ (15分TTL) 
  private static dailyDataCache: Map<string, CachedData>;
  
  // 設定別計算結果キャッシュ (30分TTL)
  private static calculationCache: Map<string, CachedResult>;
}
```

#### キャッシュキー設計
```
Format: "{symbol}_{dataType}_{period}_{hash(params)}"
Example: "AAPL_15min_60d_a1b2c3"
```

### 6.2 API呼び出し最適化

#### 並列処理設計
```typescript
// 並列データ取得
const [dailyData, intradayData, financialData] = await Promise.all([
  TechnicalAnalyzer.fetchData(symbol, period),           // 既存
  TrueVWAPCalculator.fetch15MinData(symbol, new Date()), // 新規
  FinancialAnalyzer.getFinancialMetrics(symbol)          // 既存
]);
```

#### レート制限対応
- 15分足API呼び出しは1日1回まで (キャッシュ活用)
- 並列処理での同時接続数制限
- エラー時の指数バックオフ実装

## 7. テスト設計

### 7.1 テストケース分類

#### 単体テスト
1. **パラメータ検証**: ParameterValidator の各メソッド
2. **設定管理**: ConfigManager の設定統合機能  
3. **VWAP計算**: 新しいVWAP計算ロジック
4. **出力フォーマット**: レポート生成の正確性

#### パラメータ渡しテスト（重要）
1. **メソッドシグネチャテスト**: `TechnicalAnalyzer.analyzeStockComprehensive` の拡張引数受け取り
2. **パラメータ伝播テスト**: カスタムパラメータが個別指標計算まで正しく伝わる
3. **デフォルト値テスト**: パラメータ未指定時のデフォルト動作
4. **部分設定テスト**: 一部指標のみカスタマイズした場合の動作
5. **無効値処理テスト**: 範囲外・無効なパラメータの適切な処理
6. **下位互換性テスト**: 既存の呼び出し方法が正常動作する

#### 統合テスト
1. **エンドツーエンド**: Tool呼び出しから出力まで
2. **エラーシナリオ**: 各種エラー状況でのGraceful Degradation
3. **パフォーマンス**: 応答時間とメモリ使用量

### 7.2 テストデータ設計
- **モックデータ**: API応答の模擬データ  
- **エッジケース**: 極端なパラメータ値
- **リアルデータ**: 実際のシンボルでの統合テスト

### 7.3 パラメータ渡しテストの詳細設計

#### 7.3.1 テスト対象メソッド
```typescript
// 現在のシグネチャ
TechnicalAnalyzer.analyzeStockComprehensive(
  symbol: string,
  period = "1y",
  includeFinancials = true
)

// 拡張後のシグネチャ  
TechnicalAnalyzer.analyzeStockComprehensive(
  symbol: string,
  period = "1y", 
  includeFinancials = true,
  technicalParams?: TechnicalParametersConfig // 新規追加
)
```

#### 7.3.2 テストシナリオ
```typescript
// 1. 基本パラメータ渡しテスト
const customParams = {
  movingAverages: { periods: [10, 30, 100] },
  rsi: { periods: [7, 14], overbought: 75 }
};
await analyzeStockComprehensive("AAPL", "1y", true, customParams);

// 2. 部分設定テスト
const partialParams = {
  movingAverages: { periods: [20, 60] }
  // 他の設定はデフォルト値を使用
};
await analyzeStockComprehensive("AAPL", "1y", true, partialParams);

// 3. 無効値処理テスト  
const invalidParams = {
  movingAverages: { periods: [-5, 0, 1000] }, // 無効値
  rsi: { overbought: 150, oversold: -10 }     // 範囲外
};
// デフォルト値に修正されることを検証

// 4. 下位互換性テスト
await analyzeStockComprehensive("AAPL"); // 既存の呼び出し方法
```

#### 7.3.3 検証ポイント
1. **引数の受け取り**: メソッドが4番目の引数を正しく受け取る
2. **パラメータの伝播**: 各指標計算メソッドにカスタム値が渡される
3. **デフォルト値の適用**: 未指定項目はデフォルト値が使用される
4. **エラーハンドリング**: 無効値は警告付きでデフォルト値に修正される
5. **結果への反映**: 出力に設定した期間・閾値が正しく表示される

## 8. 移行戦略

### 8.1 段階的リリース計画

#### Phase 1: 基本パラメータ化 (MVP)
- 移動平均、RSI、MACD、ボリンジャーバンドの期間設定
- 出力フォーマットの改善（期間明記）
- パラメータ検証機能

#### Phase 2: VWAP機能拡張
- 真の1日VWAP機能追加
- 15分足データ取得実装
- ハイブリッドVWAP計算

#### Phase 3: 高度な機能
- 全パラメータのカスタマイズ対応
- キャッシュ機能強化
- パフォーマンス最適化

### 8.2 下位互換性保証
- 既存のAPI呼び出しは無変更で動作
- デフォルト値による従来と同等の出力
- エラー時のフォールバック機能

## 9. セキュリティ考慮事項

### 9.1 入力検証
- パラメータ値の範囲チェック
- SQLインジェクション対策 (該当する場合)
- 不正な配列サイズの制限

### 9.2 レート制限対応
- API呼び出し頻度の監視
- 異常なトラフィック検出
- Graceful Degradation による可用性確保

## 10. 運用・保守設計

### 10.1 ログ設計
```typescript
// パラメータ使用状況のログ
interface ParameterUsageLog {
  timestamp: string;
  symbol: string;
  customParameters: TechnicalParametersConfig;
  performanceMetrics: {
    calculationTime: number;
    apiCalls: number;
    cacheHits: number;
  };
}
```

### 10.2 監視ポイント
- API呼び出し成功率
- VWAP計算成功率  
- 応答時間分布
- キャッシュヒット率
- エラー発生頻度

これらの設計により、技術指標パラメータ化機能を安全かつ効率的に実装できます。