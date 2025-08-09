# AI対応MCP Tool タスク一覧

## 実装タスク

### Task 1: TechnicalAnalyzerクラス拡張
- **概要**: TechnicalAnalyzerクラスに新しいメソッドを追加
- **詳細**:
  - `analyzeStockComprehensive()` メソッド追加
  - `calculateExtendedIndicators()` メソッド追加  
  - `generateJapaneseReport()` メソッド追加
- **ファイル**: `src/lib/technical-indicators/TechnicalAnalyzer.ts`
- **優先度**: 高

### Task 2: 型定義拡張
- **概要**: 新機能に対応した型定義を追加
- **詳細**:
  - `ComprehensiveStockAnalysisResult` インターフェース追加
  - `ExtendedIndicatorsResult` インターフェース追加
- **ファイル**: `src/lib/technical-indicators/types.ts`
- **優先度**: 高

### Task 3: 日本語レポート生成機能実装
- **概要**: AIが理解しやすい日本語レポート生成機能を実装
- **詳細**:
  - `spike/spike_all_features.ts`の`getJapaneseSignal()`関数を活用
  - 絵文字付きの構造化レポート形式
  - 財務指標 → テクニカル指標 → 統合シグナル分析の順序
- **ファイル**: 新規レポート生成モジュールまたはTechnicalAnalyzer内
- **優先度**: 高

### Task 4: MCPツール置き換え
- **概要**: 既存getStockHistoryを削除し、新しいgetStockAnalysisツールに置き換え
- **詳細**:
  - 既存の`getStockHistory`ツール削除
  - 新しい`getStockAnalysis`ツール実装
  - 引数: symbol (string), days (number, default: 7)
- **ファイル**: `src/index.ts`
- **優先度**: 中

### Task 5: エラーハンドリング実装
- **概要**: 堅牢なエラーハンドリングを実装
- **詳細**:
  - データ不足時のGraceful Degradation
  - ユーザーフレンドリーなエラーメッセージ
  - API障害時の適切な対応
- **ファイル**: 関連する全ファイル
- **優先度**: 中

### Task 6: 全機能テスト
- **概要**: 実装した全機能のテストを実行
- **詳細**:
  - 既存銘柄（6301.T, AAPL等）での動作確認
  - エラーケースのテスト
  - パフォーマンス確認（5秒以内のレスポンス）
- **ファイル**: 実装完了後の動作確認
- **優先度**: 中

### Task 7: ドキュメント更新
- **概要**: CLAUDE.mdファイルの更新
- **詳細**:
  - 新ツール`getStockAnalysis`の仕様記載
  - 既存ツール削除の記録
  - 使用例の追加
- **ファイル**: `CLAUDE.md`
- **優先度**: 低

## 実装順序

1. **Phase 1**: Task 1, 2 (TechnicalAnalyzer拡張と型定義)
2. **Phase 2**: Task 3 (レポート生成機能)
3. **Phase 3**: Task 4, 5 (MCPツール置き換えとエラーハンドリング)
4. **Phase 4**: Task 6, 7 (テストとドキュメント)

## 成功基準

- [ ] API呼び出し回数が最大2回（価格データ + 財務指標）
- [ ] spike_all_features.tsの全機能を過不足なく実装
- [ ] 日本語+絵文字での構造化レポート出力
- [ ] エラー時のGraceful Degradation動作
- [ ] 5秒以内のレスポンス時間達成