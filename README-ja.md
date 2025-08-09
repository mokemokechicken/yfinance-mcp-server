# yfinance-mcp-server

[English](./README.md)

**重要な注意: これは非公式のMCPサーバーです。**

包括的なテクニカル分析機能を持つYahoo Financeデータアクセス用のModel Context Protocol（MCP）サーバーです。Yahoo Finance APIを通じてAIフレンドリーな構造化された株式分析を提供します。

**本プロジェクトは [onori/yfinance-mcp-server](https://github.com/onori/yfinance-mcp-server) をベースにして、包括的なテクニカル分析機能を追加・強化したものです。**

## 機能

- **包括的株式分析**: 詳細な財務指標、テクニカル指標、AIフレンドリーな日本語レポートを取得
- **テクニカル指標**: RSI、MACD、ボリンジャーバンド、ストキャスティクス、移動平均、VWAP、出来高分析
- **財務指標**: 時価総額、PER、PBR、ROE、EPS成長率、配当利回り
- **マルチマーケット対応**: 米国株（AAPL）、日本株（7203.T）、仮想通貨（BTC-USD）、為替（EURUSD=X）
- **AI最適化出力**: より良いAI理解のための絵文字付き構造化日本語レポート
- **パフォーマンス最適化**: 最大2回のAPI呼び出しで包括的なローカル計算

## インストール

### Claude Code MCP設定

Claude Code CLIを使用してMCPサーバーを追加：

```bash
claude mcp add yfinance npx @mokemokechicken/yfinance-mcp-server
```

または手動でClaude CodeのMCP設定に追加：

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["@mokemokechicken/yfinance-mcp-server"]
    }
  }
}
```

### その他MCPクライアント（Cursor等）

```json
{
  "mcpServers": {
    "yfinance": {
      "command": "npx",
      "args": ["@mokemokechicken/yfinance-mcp-server"]
    }
  }
}
```

## 利用可能なツール

### getStockAnalysis

テクニカル指標と財務指標による包括的な株式分析を実行します。

**パラメータ：**
- `symbol`（必須）：株式銘柄
  - 米国株: `AAPL`、`GOOGL`、`MSFT`
  - 日本株: `7203.T`、`6301.T`、`9984.T`
  - 仮想通貨: `BTC-USD`、`ETH-USD`
  - 為替: `EURUSD=X`、`USDJPY=X`
- `days`（オプション）：直近株価データ表示日数（デフォルト: 7、範囲: 1-365）

**使用例：**

```markdown
> Apple株（AAPL）を過去5日間で分析してください

> トヨタ自動車（7203.T）をデフォルトの7日間期間で分析してください
```

**レスポンス内容：**
- 📊 直近株価データ
- 💰 財務指標（時価総額、PER、ROE等）
- 📈 テクニカル指標（RSI、MACD、ボリンジャーバンド等）
- 🎯 売買シグナルとトレンド分析
- 📋 AIフレンドリーな構造化日本語レポート

## 開発

開発環境のセットアップ：

1. リポジトリをクローン
2. 依存関係をインストール：
```bash
npm install
```
3. 開発サーバーを起動：
```bash
npm run dev
```

## ライセンス

ISC License (ISC)