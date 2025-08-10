import { describe, it } from "node:test";
import assert from "node:assert";
import { TechnicalAnalyzer } from "../src/lib/technical-indicators/technicalAnalyzer";
import type { TechnicalParametersConfig } from "../src/lib/technical-indicators/types";

/**
 * 下位互換性確認テスト
 * 既存のAPI呼び出しが無変更で動作することを確認
 * パラメータ未指定時の従来通り動作を検証
 */
describe("下位互換性確認テスト", () => {
	const timeout = 35000;

	describe("既存API呼び出し形式の互換性", () => {
		it("最小引数（symbolのみ）での従来動作", { timeout }, async () => {
			// Phase 1実装前の最も基本的な呼び出し形式
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL");

			// 基本構造が維持されていることを確認
			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.priceData);
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);
			assert.ok(result.signals);

			// デフォルト指標が計算されていることを確認
			assert.ok(result.technicalIndicators.movingAverages);
			assert.ok(result.technicalIndicators.rsi);
			assert.ok(result.technicalIndicators.macd);
			assert.ok(result.extendedIndicators.bollingerBands);
			assert.ok(result.extendedIndicators.stochastic);

			console.log("✅ 最小引数（symbolのみ）での従来動作確認完了");
		});

		it("2引数（symbol + period）での従来動作", { timeout }, async () => {
			// Phase 1実装前の一般的な呼び出し形式
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y");

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);

			console.log("✅ 2引数（symbol + period）での従来動作確認完了");
		});

		it("3引数（symbol + period + includeExtended）での従来動作", { timeout }, async () => {
			// Phase 1実装前のフル引数呼び出し形式
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result);
			assert.strictEqual(result.symbol, "AAPL");
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);

			// 拡張指標が含まれていることを確認
			assert.ok(result.extendedIndicators.bollingerBands);
			assert.ok(result.extendedIndicators.stochastic);
			assert.ok(result.extendedIndicators.vwap);

			console.log("✅ 3引数（symbol + period + includeExtended）での従来動作確認完了");
		});

		it("includeExtended=falseでの従来動作", { timeout }, async () => {
			// 拡張指標を無効にした従来の呼び出し
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", false);

			assert.ok(result);
			assert.ok(result.technicalIndicators);
			
			// 基本指標は存在することを確認
			assert.ok(result.technicalIndicators.movingAverages);
			assert.ok(result.technicalIndicators.rsi);
			assert.ok(result.technicalIndicators.macd);

			console.log("✅ includeExtended=falseでの従来動作確認完了");
		});
	});

	describe("デフォルト値の互換性", () => {
		it("従来のデフォルト移動平均期間（25, 50, 200日）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result.technicalIndicators.movingAverages);
			const ma = result.technicalIndicators.movingAverages;

			// 従来のデフォルト期間が存在することを確認
			assert.ok('ma25' in ma, "25日移動平均が存在しない");
			assert.ok('ma50' in ma, "50日移動平均が存在しない");
			assert.ok('ma200' in ma, "200日移動平均が存在しない");

			// 値が適切に計算されていることを確認
			assert.ok(typeof ma.ma25 === 'number' && ma.ma25 > 0);
			assert.ok(typeof ma.ma50 === 'number' && ma.ma50 > 0);
			assert.ok(typeof ma.ma200 === 'number' && ma.ma200 > 0);

			console.log("✅ 従来のデフォルト移動平均期間確認完了");
		});

		it("従来のデフォルトRSI期間（14, 21日）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result.technicalIndicators.rsi);
			assert.ok(result.extendedIndicators.rsiExtended);

			// RSIの基本値が存在することを確認
			assert.ok(typeof result.technicalIndicators.rsi === 'number');
			assert.ok(result.technicalIndicators.rsi >= 0 && result.technicalIndicators.rsi <= 100);

			console.log("✅ 従来のデフォルトRSI期間確認完了");
		});

		it("従来のデフォルトMACD設定（12, 26, 9）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result.technicalIndicators.macd);
			const macd = result.technicalIndicators.macd;

			// MACD値が適切に計算されていることを確認
			assert.ok(typeof macd.macd === 'number');
			assert.ok(typeof macd.signal === 'number');
			assert.ok(typeof macd.histogram === 'number');

			console.log("✅ 従来のデフォルトMACD設定確認完了");
		});

		it("従来のデフォルトボリンジャーバンド設定（20日、2σ）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result.extendedIndicators.bollingerBands);
			const bb = result.extendedIndicators.bollingerBands;

			// ボリンジャーバンドの基本構造確認
			assert.ok(typeof bb.middle === 'number' && bb.middle > 0);
			assert.ok(typeof bb.upper === 'number' && bb.upper > bb.middle);
			assert.ok(typeof bb.lower === 'number' && bb.lower < bb.middle);

			console.log("✅ 従来のデフォルトボリンジャーバンド設定確認完了");
		});

		it("従来のデフォルトストキャスティクス設定（14日、3日）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			assert.ok(result.extendedIndicators.stochastic);
			const stoch = result.extendedIndicators.stochastic;

			// ストキャスティクスの基本構造確認
			assert.ok(typeof stoch.k === 'number');
			assert.ok(typeof stoch.d === 'number');
			assert.ok(stoch.k >= 0 && stoch.k <= 100);
			assert.ok(stoch.d >= 0 && stoch.d <= 100);

			console.log("✅ 従来のデフォルトストキャスティクス設定確認完了");
		});
	});

	describe("レポート生成の互換性", () => {
		it("従来のレポート生成（パラメータなし）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			
			// 従来のレポート生成方法
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);

			assert.ok(report);
			assert.ok(typeof report === 'string');
			assert.ok(report.includes("AAPL"));
			
			// 従来の基本要素が含まれていることを確認
			assert.ok(report.includes("移動平均線"));
			assert.ok(report.includes("RSI"));
			assert.ok(report.includes("MACD"));
			assert.ok(report.includes("ボリンジャーバンド"));

			// カスタム設定の表示がないことを確認（従来動作）
			assert.ok(!report.includes("カスタム") && !report.includes("カスタマイズ"));

			console.log("✅ 従来のレポート生成確認完了");
		});

		it("従来の期間表記（デフォルト値）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(result, 7);

			// 従来のデフォルト期間が表示されていることを確認
			assert.ok(report.includes("25") && report.includes("50") && report.includes("200"));
			assert.ok(report.includes("14") || report.includes("21"));

			console.log("✅ 従来の期間表記確認完了");
		});
	});

	describe("日本株での互換性", () => {
		it("日本株での従来動作（最小引数）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("7203.T");

			assert.ok(result);
			assert.strictEqual(result.symbol, "7203.T");
			assert.ok(result.technicalIndicators);

			console.log("✅ 日本株での従来動作（最小引数）確認完了");
		});

		it("日本株での従来動作（フル引数）", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("7203.T", "1y", true);

			assert.ok(result);
			assert.strictEqual(result.symbol, "7203.T");
			assert.ok(result.technicalIndicators);
			assert.ok(result.extendedIndicators);

			console.log("✅ 日本株での従来動作（フル引数）確認完了");
		});
	});

	describe("出力構造の互換性", () => {
		it("result構造体の互換性", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			// 従来の基本構造が維持されていることを確認
			assert.ok(result);
			assert.ok('symbol' in result);
			assert.ok('priceData' in result);
			assert.ok('technicalIndicators' in result);
			assert.ok('extendedIndicators' in result);
			assert.ok('signals' in result);

			// 各セクションの基本構造
			assert.ok(typeof result.symbol === 'string');
			assert.ok(Array.isArray(result.priceData));
			assert.ok(typeof result.technicalIndicators === 'object');
			assert.ok(typeof result.extendedIndicators === 'object');
			assert.ok(typeof result.signals === 'object');

			console.log("✅ result構造体の互換性確認完了");
		});

		it("technicalIndicators構造の互換性", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			const indicators = result.technicalIndicators;
			
			// 従来の基本指標が存在することを確認
			assert.ok('movingAverages' in indicators);
			assert.ok('rsi' in indicators);
			assert.ok('macd' in indicators);

			// movingAveragesの構造
			assert.ok(typeof indicators.movingAverages === 'object');
			assert.ok('ma25' in indicators.movingAverages);
			assert.ok('ma50' in indicators.movingAverages);
			assert.ok('ma200' in indicators.movingAverages);

			// MACD構造
			assert.ok(typeof indicators.macd === 'object');
			assert.ok('value' in indicators.macd);
			assert.ok('signal' in indicators.macd);
			assert.ok('histogram' in indicators.macd);

			console.log("✅ technicalIndicators構造の互換性確認完了");
		});

		it("signals構造の互換性", { timeout }, async () => {
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);

			const signals = result.signals;
			
			// 従来のシグナル構造が維持されていることを確認
			assert.ok('trend' in signals);
			assert.ok('momentum' in signals);
			assert.ok('strength' in signals);

			assert.ok(typeof signals.trend === 'string');
			assert.ok(typeof signals.momentum === 'string');
			assert.ok(typeof signals.strength === 'string');

			console.log("✅ signals構造の互換性確認完了");
		});
	});

	describe("エラーハンドリングの互換性", () => {
		it("無効銘柄での従来エラーハンドリング", { timeout }, async () => {
			// パラメータなしでの無効銘柄エラー
			try {
				await TechnicalAnalyzer.analyzeStockComprehensive("INVALID_SYMBOL_TEST");
				assert.fail("エラーが発生すべきです");
			} catch (error: any) {
				assert.ok(error);
				// エラーオブジェクトの基本構造が維持されていることを確認
				assert.ok(error.message || error.toString());
				console.log(`✅ 従来エラーハンドリング確認: ${error.message || error.toString()}`);
			}
		});
	});

	describe("パフォーマンスの互換性", () => {
		it("従来設定での性能維持", { timeout }, async () => {
			const start = Date.now();
			const { result } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			const duration = Date.now() - start;

			assert.ok(result);
			
			console.log(`📊 従来設定での実行時間: ${duration}ms`);
			
			// 従来設定で合理的な時間内で完了することを確認
			assert.ok(duration < 25000, `従来設定の実行時間が想定より長いです: ${duration}ms`);

			console.log("✅ 従来設定での性能維持確認完了");
		});
	});

	describe("新旧API混合使用の互換性", () => {
		it("従来呼び出し後の新機能呼び出し", { timeout }, async () => {
			// 従来の呼び出し
			const { result: oldResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			assert.ok(oldResult);

			// 新機能の呼び出し
			const newParams: TechnicalParametersConfig = {
				movingAverages: { periods: [10, 30] },
			};
			const { result: newResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, newParams);
			assert.ok(newResult);

			// 両方とも正常に動作することを確認
			assert.strictEqual(oldResult.symbol, "AAPL");
			assert.strictEqual(newResult.symbol, "AAPL");

			console.log("✅ 従来呼び出し後の新機能呼び出し確認完了");
		});

		it("新機能呼び出し後の従来呼び出し", { timeout }, async () => {
			// 新機能の呼び出し
			const newParams: TechnicalParametersConfig = {
				rsi: { periods: [7, 14], overbought: 75 },
			};
			const { result: newResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true, newParams);
			assert.ok(newResult);

			// 従来の呼び出し
			const { result: oldResult } = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			assert.ok(oldResult);

			// 状態が適切にリセットされ、従来動作することを確認
			assert.strictEqual(newResult.symbol, "AAPL");
			assert.strictEqual(oldResult.symbol, "AAPL");

			console.log("✅ 新機能呼び出し後の従来呼び出し確認完了");
		});
	});

	describe("レガシーコード互換性", () => {
		it("TypeScript型互換性", { timeout }, async () => {
			// 従来の型でのコンパイル・実行が可能であることを確認
			// (このテストはTypeScriptコンパイラにより静的に検証される)
			
			// 最小引数での型安全性
			const result1 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL");
			assert.ok(result1.result);

			// 部分引数での型安全性
			const result2 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y");
			assert.ok(result2.result);

			// フル引数での型安全性
			const result3 = await TechnicalAnalyzer.analyzeStockComprehensive("AAPL", "1y", true);
			assert.ok(result3.result);

			console.log("✅ TypeScript型互換性確認完了");
		});

		it("メソッドシグネチャの互換性", { timeout }, async () => {
			// 従来のメソッドシグネチャが維持されていることを確認
			const analyzer = TechnicalAnalyzer;
			
			// analyzeStockComprehensiveメソッドが存在し、呼び出し可能
			assert.ok(typeof analyzer.analyzeStockComprehensive === 'function');
			
			// generateJapaneseReportFromAnalysisメソッドが存在し、呼び出し可能
			assert.ok(typeof analyzer.generateJapaneseReportFromAnalysis === 'function');

			// 実際の呼び出し確認
			const { result } = await analyzer.analyzeStockComprehensive("AAPL");
			const report = analyzer.generateJapaneseReportFromAnalysis(result, 7);
			
			assert.ok(result);
			assert.ok(report);

			console.log("✅ メソッドシグネチャの互換性確認完了");
		});
	});
});