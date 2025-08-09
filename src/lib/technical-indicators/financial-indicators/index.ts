/**
 * 財務指標ライブラリ - メインエクスポート
 */

// 型定義
export * from "./types.js";

// 財務指標分析クラス
export { FinancialAnalyzer } from "./FinancialAnalyzer.js";

// 移動平均乖離率計算クラス
export { MovingAverageDeviationCalculator } from "./MovingAverageDeviationCalculator.js";

// 既存RSICalculatorの拡張機能もエクスポート（参照用）
// 実際のRSICalculatorは indicators/rsi.ts から使用
export type { RSIExtendedResult, RSILevels } from "./types.js";
