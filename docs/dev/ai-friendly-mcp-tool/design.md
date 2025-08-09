# AI対応MCP Tool 設計書

## アーキテクチャ概要

### 既存システムとの関係
- **置き換え対象:** 既存の `getStockHistory` ツール（src/index.ts）
- **活用ライブラリ:** TechnicalAnalyzer および全関連クラス
- **データソース:** Yahoo Finance API（yahoo-finance2）

### 新ツールの設計
- **ツール名:** `getStockAnalysis`
- **実装場所:** src/index.ts（既存ツールを完全置換）
- **出力形式:** 構造化された日本語レポート（markdown形式）

## データフロー設計

```
[User Request]
    ↓
[Input Validation]
symbol: string (required)
days: number (optional, default: 7)
    ↓
[Data Fetching]
Yahoo Finance API → 1年分のデータ取得
    ↓
[Technical Analysis]
TechnicalAnalyzer.analyzeStock()
各種Calculator classes
    ↓
[Report Generation]
日本語 + 絵文字レポート生成
    ↓
[Output Filtering]
指定日数分のみ表示
    ↓
[Response]
```

## コンポーネント設計

### 1. 入力バリデーション
- **symbol:** 文字列検証（空文字列チェック）
- **days:** 数値範囲検証（1-365）、デフォルト値設定

### 2. TechnicalAnalyzer拡張設計
```typescript
// TechnicalAnalyzerクラスに新メソッド追加
class TechnicalAnalyzer {
  // 既存メソッド継続...
  
  // 新規：包括的分析メソッド
  public static async analyzeStockComprehensive(symbol: string, period = "1y"): Promise<ComprehensiveStockAnalysisResult>;
  
  // 新規：拡張指標計算メソッド  
  public calculateExtendedIndicators(): ExtendedIndicatorsResult;
  
  // 新規：日本語レポート生成メソッド
  public generateJapaneseReport(days: number): string;
}
```

### 3. 型定義拡張
```typescript
interface ComprehensiveStockAnalysisResult extends StockAnalysisResult {
  financialMetrics: FinancialMetricsResult | null;
  extendedIndicators: ExtendedIndicatorsResult;
}

interface ExtendedIndicatorsResult {
  rsiExtended: RSIExtendedResult;
  deviationResults: MovingAverageDeviationResult[];
  bollingerBands: BollingerBandsResult;
  stochastic: StochasticResult;
  crossDetection: CrossDetectionResult;
  volumeAnalysis: VolumeAnalysisResult;
  vwap: VWAPResult;
}
```

### 4. レポート生成層
```typescript
interface ReportGenerator {
  generateBasicInfo(symbol: string, days: number): string;
  generatePriceInfo(priceData: PriceInfo): string;
  generateFinancialMetrics(metrics: FinancialMetricsResult): string;
  generateTechnicalIndicators(indicators: AllIndicators): string;
  generateSignalAnalysis(signals: SignalAnalysis): string;
  combineReport(sections: string[]): string;
}
```

### 5. 日本語変換層
```typescript
// spike_all_features.tsのgetJapaneseSignal()を活用・拡張
function formatJapaneseSignal(type: string, signal: string): string;
function formatCurrency(value: number): string;
function formatPercentage(value: number): string;
```

## エラーハンドリング設計

### エラー分類
1. **入力エラー:** 無効な銘柄コード、範囲外の日数
2. **データ取得エラー:** Yahoo Finance API障害、銘柄存在しない
3. **計算エラー:** データ不足による指標計算不可
4. **システムエラー:** 予期しない例外

### エラー対応戦略
- **Graceful Degradation:** 一部指標が計算できない場合でも利用可能な指標のみ表示
- **ユーザーフレンドリーメッセージ:** 技術的詳細を隠した分かりやすいエラー表示
- **データ不足の明示:** 「N/A」「データ不足」等の明確な表示

## パフォーマンス設計

### API呼び出し最小化
- **価格データ取得:** 1回のAPI呼び出しで1年分データ取得
- **財務指標取得:** 1回のAPI呼び出しで全財務指標取得
- **テクニカル計算:** 取得済みデータからローカル計算のみ（API呼び出しなし）
- **総API呼び出し回数:** 最大2回（価格データ + 財務指標）

### 最適化戦略
- **並列実行:** 価格データと財務指標の並列取得
- **キャッシュ活用:** TechnicalAnalyzerの内部最適化を活用
- **計算効率化:** 既存の最適化されたCalculatorクラスを活用
- **データ再利用:** 一度取得したデータから全指標を計算

### レスポンス時間目標
- **通常ケース:** 3秒以内
- **最大許容:** 5秒以内
- **タイムアウト:** 10秒

## セキュリティ設計

### 入力サニタイゼーション
- 銘柄コード: 英数字・ピリオド・ハイフンのみ許可
- 日数: 数値範囲制限

### APIセキュリティ
- Yahoo Finance APIの利用規約遵守
- レート制限の考慮

## 互換性設計

### 既存コードとの関係
- **完全置換:** getStockHistory削除
- **ライブラリ活用:** technical-indicators配下の全クラスを活用
- **型定義継承:** 既存の型定義を最大限活用

### 将来拡張性
- 新指標追加時の拡張ポイント明確化
- レポート形式の変更容易性
- 多言語対応の準備

## 実装詳細設計

### TechnicalAnalyzer.analyzeStock() の拡張設計
```typescript
// TechnicalAnalyzer.analyzeStock() を拡張して全機能対応
public static async analyzeStockComprehensive(
  symbol: string,
  period = "1y",
  includeFinancials = true
): Promise<ComprehensiveStockAnalysisResult> {
  // API呼び出し最小化：並列取得
  const [priceData, financialMetrics] = await Promise.all([
    TechnicalAnalyzer.fetchData(symbol, period),
    includeFinancials 
      ? FinancialAnalyzer.getFinancialMetrics(symbol).catch(() => null)
      : Promise.resolve(null)
  ]);

  // 全指標をローカル計算
  const analyzer = new TechnicalAnalyzer(priceData);
  const result = analyzer.analyze(symbol);
  
  // 拡張指標計算（spike_all_features.ts の全機能）
  const extendedResult = analyzer.calculateExtendedIndicators();
  
  return {
    ...result,
    financialMetrics,
    extendedIndicators: extendedResult
  };
}
```

### メイン関数構造
```typescript
server.tool(
  "getStockAnalysis",
  {
    symbol: z.string(),
    days: z.number().min(1).max(365).optional().default(7)
  },
  async ({ symbol, days = 7 }) => {
    try {
      // 1. 拡張分析実行（API呼び出し最小化済み）
      const analysisResult = await TechnicalAnalyzer.analyzeStockComprehensive(symbol, "1y");

      // 2. 日本語レポート生成
      const report = generateComprehensiveReport(analysisResult, days);

      return {
        content: [{ type: "text", text: report }]
      };

    } catch (error) {
      return handleError(error, symbol);
    }
  }
);
```

### レポート生成関数設計
```typescript
function generateComprehensiveReport(data: AnalysisData): string {
  const sections = [
    generateBasicInfo(data.symbol, data.days),
    generatePriceInfo(data.priceData),
    generateFinancialSection(data.financialMetrics),
    generateTechnicalSection(data.analysisResult, data.extendedAnalysis),
    generateSignalSection(data.analysisResult.signals)
  ];
  
  return sections.join('\n\n');
}
```

## テスト設計

### テストカバレッジ
1. **正常系:** 有効な銘柄での各指標計算
2. **異常系:** 無効銘柄、データ不足ケース
3. **境界値:** 最小/最大日数指定
4. **パフォーマンス:** レスポンス時間測定

### テストデータ
- **実データ:** 6301.T (コマツ)、AAPL等の安定銘柄
- **モックデータ:** エラーケース用の制御されたデータ

## デプロイメント設計

### リリース戦略
1. 既存ツール削除
2. 新ツール追加
3. 動作確認
4. ドキュメント更新（CLAUDE.md）

### ロールバック計画
- Git履歴による既存コードへの復元
- 設定切り戻し手順の明確化