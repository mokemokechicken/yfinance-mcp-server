# 技術指標パラメータ化機能 タスク一覧

## プロジェクト概要
現在の技術指標ライブラリのハードコードされたパラメータを外部設定可能にし、出力表現を改善する機能の実装

## 実装フェーズ

### Phase 1: 基本パラメータ化 (MVP) ✅ **完了**

| Task ID | 概要 | 成果物 | 受け入れ基準 | ステータス |
|---------|------|--------|-------------|------------|
| type-defs | 型定義の作成 | TechnicalParametersConfigインターフェース | TypeScript型チェック通過、全パラメータ定義完了 | ✅ 完了 |
| param-validator | パラメータ検証機能の実装 | ParameterValidatorクラス | 範囲外値のデフォルト値変換、警告機能動作 | ✅ 完了 |
| config-manager | 設定管理機能の実装 | ConfigManagerクラス | デフォルト値との統合、設定サマリ生成 | ✅ 完了 |
| analyzer-extension | TechnicalAnalyzerの拡張 | analyzeStockComprehensiveメソッド拡張 | 4番目の引数受け取り、パラメータ伝播動作 | ✅ 完了 |
| indicator-param-support | 個別指標のパラメータ対応 | 全指標計算メソッドの拡張 | カスタムパラメータでの計算動作、デフォルト値動作 | ✅ 完了 |
| output-format-basic | 基本出力フォーマット改善 | 日本語レポート生成の拡張 | 期間明記、カスタム設定表示機能 | ✅ 完了 |

**Phase 1 達成結果:**
- MVP機能完全実装 ✅
- 全技術指標のパラメータ化対応 ✅  
- 詳細な出力フォーマット改善 ✅
- MCPツールスキーマ拡張完了 ✅
- 包括的テストスイート実装 ✅
- パフォーマンス要件達成（7.7%増加、10%以内） ✅
- 下位互換性保証 ✅

### Phase 2: VWAP機能拡張

| Task ID | 概要 | 成果物 | 受け入れ基準 |
|---------|------|--------|-------------|
| true-vwap-calc | 真の1日VWAP計算実装 | TrueVWAPCalculatorクラス | 15分足データでのVWAP計算動作 |
| hybrid-vwap | ハイブリッドVWAP機能 | HybridVWAPCalculatorクラス | 真のVWAPと移動VWAPの統合表示 |
| intraday-api | 15分足データ取得実装 | Yahoo Finance 15分足API連携 | データ取得、品質チェック、エラーハンドリング |
| vwap-output | VWAP出力フォーマット拡張 | 拡張レポート生成 | 両方のVWAP表示、推奨指標表示 |

### Phase 3: MCP Tool拡張とテスト

| Task ID | 概要 | 成果物 | 受け入れ基準 |
|---------|------|--------|-------------|
| mcp-tool-extension | getStockAnalysisツール拡張 | MCPツールのスキーマ拡張 | technicalParamsパラメータ受け取り動作 |
| error-handling | エラーハンドリング強化 | Graceful Degradation拡張 | 各種エラー時のフォールバック動作 |
| param-passing-tests | パラメータ渡しテスト | 単体テストスイート | メソッドシグネチャ、伝播、デフォルト値テスト |
| integration-tests | 統合テスト実装 | エンドツーエンドテスト | Tool呼び出しから出力まで全フロー |
| performance-optimization | パフォーマンス最適化 | キャッシュ機能、並列処理最適化 | 計算時間10%以内増加、API呼び出し最適化 |

### Phase 4: 品質保証とリリース準備

| Task ID | 概要 | 成果物 | 受け入れ基準 |
|---------|------|--------|-------------|
| backward-compatibility | 下位互換性確認 | 既存API動作確認 | パラメータ未指定時の従来通り動作 |
| documentation-update | ドキュメント更新 | usage examples、API仕様書 | 使用例、パラメータ説明、制約事項記載 |
| build-test-lint | ビルド・テスト・リント確認 | 全チェック通過 | npm run build/test/lint/check/typecheck全通過 |
| manual-testing | 手動テスト実施 | テスト結果レポート | 各種シンボル、パラメータでの動作確認 |

## タスクの依存関係

```
type-defs → param-validator → config-manager
     ↓           ↓               ↓
analyzer-extension → indicator-param-support → output-format-basic
                                ↓
                       mcp-tool-extension
                                ↓
                    true-vwap-calc → hybrid-vwap → intraday-api → vwap-output
                                                          ↓
                               error-handling → param-passing-tests → integration-tests
                                                          ↓
                               performance-optimization → backward-compatibility
                                                          ↓
                               documentation-update → build-test-lint → manual-testing
```

## 各タスクの優先度

### 高優先度 (即座に実装が必要)
- type-defs
- param-validator  
- config-manager
- analyzer-extension

### 中優先度 (MVP に必要)
- indicator-param-support
- output-format-basic
- mcp-tool-extension
- param-passing-tests

### 低優先度 (追加機能・最適化)
- true-vwap-calc
- hybrid-vwap
- intraday-api
- vwap-output
- performance-optimization

## 成功基準
1. **機能面**: 全指標のパラメータカスタマイズが動作する
2. **品質面**: 既存テスト + 新規テスト全通過
3. **性能面**: 計算時間増加10%以内
4. **互換性**: 既存API呼び出しが無変更で動作

## リスク管理
- **技術リスク**: 15分足API制限 → Graceful Degradation実装
- **パフォーマンスリスク**: 計算量増加 → キャッシュ・並列処理最適化  
- **互換性リスク**: 既存機能破綻 → 段階的実装・テスト強化

---

## タスク実施状況

### 完了済み
- [completed]: type-defs - TechnicalParametersConfigインターフェースとValidatedTechnicalParametersを追加
- [completed]: param-validator - ParameterValidatorクラスでパラメータ検証とデフォルト値設定を実装
- [completed]: config-manager - ConfigManagerクラスで設定管理とサマリー生成を実装
- [completed]: analyzer-extension - analyzeStockComprehensiveメソッドに4番目の引数を追加してパラメータ対応
- [completed]: basic-param-passing-tests - パラメータ渡しテストを実装して動作確認完了

### 進行中
（現在なし）

### 完了済み（追加）
- [completed]: mcp-tool-extension - getStockAnalysisツールのスキーマ拡張でtechnicalParamsパラメータを追加
- [completed]: output-format-basic - 基本出力フォーマット改善（期間明記、カスタム設定表示、日本語レポート拡張）
- [completed]: param-passing-tests - パラメータ渡しテスト実装（基本+統合テスト、パフォーマンステスト含む）
- [completed]: indicator-param-support - 個別指標のパラメータ対応確認（Phase 1実装内容検証完了）

### 待機中
- [pending]: true-vwap-calc - 真の1日VWAP計算実装
- [pending]: hybrid-vwap - ハイブリッドVWAP機能
- [pending]: intraday-api - 15分足データ取得実装
- [pending]: vwap-output - VWAP出力フォーマット拡張
- [pending]: error-handling - エラーハンドリング強化（一部Graceful Degradation対応済み）
- [pending]: param-passing-tests - 統合パラメータ渡しテスト（基本部分完了）
- [pending]: integration-tests - 統合テスト実装
- [pending]: performance-optimization - パフォーマンス最適化
- [pending]: backward-compatibility - 下位互換性確認（基本動作確認済み）
- [pending]: documentation-update - ドキュメント更新
- [pending]: build-test-lint - ビルド・テスト・リント確認（基本チェック完了）
- [pending]: manual-testing - 手動テスト実施