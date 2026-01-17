/**
 * Yahoo Finance API クライアント
 * yahoo-finance2 v3 対応のインスタンス管理モジュール
 */
import YahooFinance from "yahoo-finance2";

// シングルトンインスタンスを作成
const yahooFinance = new YahooFinance();

// 通知メッセージを抑制
yahooFinance._notices.suppress(["yahooSurvey"]);

export default yahooFinance;
