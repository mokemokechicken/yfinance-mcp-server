/**
 * 移動平均乖離率計算クラス
 * 株価が移動平均線からどの程度乖離しているかを%で算出
 */

import { MovingAverageCalculator } from "../indicators/movingAverage.js";
import type { DeviationSignal, MovingAverageDeviationResult } from "./types.js";

export class MovingAverageDeviationCalculator {
	/**
	 * 移動平均乖離率を計算
	 * 計算式: (現在価格 - 移動平均価格) / 移動平均価格 × 100
	 * @param prices 価格データ配列
	 * @param period 移動平均期間
	 * @returns 移動平均乖離率結果
	 */
	static calculate(
		prices: number[],
		period: number,
	): MovingAverageDeviationResult {
		if (prices.length === 0) {
			throw new Error("価格データが空です");
		}

		if (period <= 0 || period > prices.length) {
			throw new Error(`無効な期間です: ${period} (データ数: ${prices.length})`);
		}

		// 現在価格（最新の価格）
		const currentPrice = prices[prices.length - 1];

		// 移動平均を計算
		const movingAverage = MovingAverageCalculator.calculate(prices, period);

		// 分母が0の場合は例外を投げる
		if (movingAverage === 0) {
			throw new Error("移動平均が0のため乖離率を計算できません");
		}

		// 乖離率を計算（%）
		const deviation = ((currentPrice - movingAverage) / movingAverage) * 100;

		return {
			period,
			currentPrice,
			movingAverage,
			deviation,
			deviationDirection: deviation >= 0 ? "positive" : "negative",
		};
	}

	/**
	 * 複数期間の乖離率を一括計算
	 * @param prices 価格データ配列
	 * @param periods 期間配列（例: [25, 50, 200]）
	 * @returns 乖離率結果配列
	 */
	static calculateMultiple(
		prices: number[],
		periods: number[],
	): MovingAverageDeviationResult[] {
		if (periods.length === 0) {
			throw new Error("期間配列が空です");
		}

		return periods.map((period) => {
			try {
				return MovingAverageDeviationCalculator.calculate(prices, period);
			} catch (error) {
				// 期間が長すぎる場合などはスキップ
				throw new Error(
					`期間${period}での計算に失敗: ${(error as Error).message}`,
				);
			}
		});
	}

	/**
	 * 乖離率シグナル判定
	 * @param deviation 乖離率（%）
	 * @returns シグナル判定
	 */
	static getDeviationSignal(deviation: number): DeviationSignal {
		if (deviation >= 10) {
			return "strong_above"; // 大きく上振れ
		}
		if (deviation >= 5) {
			return "above"; // 上振れ
		}
		if (deviation <= -10) {
			return "strong_below"; // 大きく下振れ
		}
		if (deviation <= -5) {
			return "below"; // 下振れ
		}
		return "neutral"; // 正常範囲
	}

	/**
	 * 複数期間の総合シグナル判定
	 * @param results 乖離率結果配列
	 * @returns 総合シグナル
	 */
	static getOverallSignal(results: MovingAverageDeviationResult[]): {
		signal: DeviationSignal;
		confidence: "high" | "medium" | "low";
		details: string;
	} {
		if (results.length === 0) {
			throw new Error("乖離率結果が空です");
		}

		// 各期間のシグナルを取得
		const signals = results.map((result) => ({
			period: result.period,
			deviation: result.deviation,
			signal: MovingAverageDeviationCalculator.getDeviationSignal(
				result.deviation,
			),
		}));

		// シグナルのカウント
		const signalCounts = {
			strong_above: 0,
			above: 0,
			neutral: 0,
			below: 0,
			strong_below: 0,
		};

		for (const { signal } of signals) {
			signalCounts[signal]++;
		}

		// 総合判定ロジック
		const totalCount = signals.length;
		let overallSignal: DeviationSignal;
		let confidence: "high" | "medium" | "low";

		if (signalCounts.strong_above >= totalCount * 0.6) {
			overallSignal = "strong_above";
			confidence = "high";
		} else if (signalCounts.strong_below >= totalCount * 0.6) {
			overallSignal = "strong_below";
			confidence = "high";
		} else if (
			signalCounts.above + signalCounts.strong_above >=
			totalCount * 0.6
		) {
			overallSignal = "above";
			confidence = "medium";
		} else if (
			signalCounts.below + signalCounts.strong_below >=
			totalCount * 0.6
		) {
			overallSignal = "below";
			confidence = "medium";
		} else {
			overallSignal = "neutral";
			confidence = signalCounts.neutral >= totalCount * 0.5 ? "medium" : "low";
		}

		// 詳細メッセージ
		const details = signals
			.map(
				({ period, deviation, signal }) =>
					`${period}日: ${deviation.toFixed(1)}% (${MovingAverageDeviationCalculator.getSignalLabel(signal)})`,
			)
			.join(", ");

		return {
			signal: overallSignal,
			confidence,
			details,
		};
	}

	/**
	 * シグナルの日本語ラベルを取得
	 */
	private static getSignalLabel(signal: DeviationSignal): string {
		switch (signal) {
			case "strong_above":
				return "大幅上振れ";
			case "above":
				return "上振れ";
			case "neutral":
				return "正常";
			case "below":
				return "下振れ";
			case "strong_below":
				return "大幅下振れ";
			default:
				return "不明";
		}
	}

	/**
	 * 乖離率のトレンドを分析
	 * @param pricesHistory 過去の価格データ（時系列順）
	 * @param period 移動平均期間
	 * @param analysisLength 分析する期間（日数）
	 * @returns トレンド分析結果
	 */
	static analyzeDeviationTrend(
		pricesHistory: number[][],
		period: number,
		analysisLength = 5,
	): {
		trend: "increasing" | "decreasing" | "stable";
		deviationHistory: number[];
		averageDeviation: number;
	} {
		if (pricesHistory.length < analysisLength) {
			throw new Error(
				`トレンド分析には最低${analysisLength}日分のデータが必要です`,
			);
		}

		// 各日の乖離率を計算
		const recentData = pricesHistory.slice(-analysisLength);
		const deviationHistory = recentData.map((prices) => {
			try {
				const result = MovingAverageDeviationCalculator.calculate(
					prices,
					period,
				);
				return result.deviation;
			} catch {
				return 0; // エラーの場合は0とする
			}
		});

		// 平均乖離率
		const averageDeviation =
			deviationHistory.reduce((sum, dev) => sum + dev, 0) /
			deviationHistory.length;

		// トレンド判定（線形回帰の傾き）
		const n = deviationHistory.length;

		// n=1の場合は傾きを計算できないので安定と判定
		if (n < 2) {
			return {
				trend: "stable" as const,
				deviationHistory,
				averageDeviation,
			};
		}

		const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
		const sumY = deviationHistory.reduce((sum, y) => sum + y, 0);
		const sumXY = deviationHistory.reduce((sum, y, i) => sum + i * y, 0);
		const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // 0^2 + 1^2 + ... + (n-1)^2

		const denominator = n * sumXX - sumX * sumX;
		// 分母が0の場合は安定と判定
		if (denominator === 0) {
			return {
				trend: "stable" as const,
				deviationHistory,
				averageDeviation,
			};
		}

		const slope = (n * sumXY - sumX * sumY) / denominator;

		let trend: "increasing" | "decreasing" | "stable";
		if (slope > 0.5) {
			trend = "increasing"; // 上昇傾向
		} else if (slope < -0.5) {
			trend = "decreasing"; // 下降傾向
		} else {
			trend = "stable"; // 安定
		}

		return {
			trend,
			deviationHistory,
			averageDeviation,
		};
	}
}
