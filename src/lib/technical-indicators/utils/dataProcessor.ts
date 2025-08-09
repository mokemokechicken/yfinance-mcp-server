import { PriceData, ValidationError } from "../types";

export class DataProcessor {
	// Yahoo Financeの生データを内部形式に変換
	public static processRawData(rawData: any[]): PriceData[] {
		if (!Array.isArray(rawData) || rawData.length === 0) {
			throw new ValidationError("Invalid raw data provided", "INVALID_DATA");
		}

		return rawData.map((item, index) => {
			try {
				return {
					date: new Date(item.date),
					open: Number(item.open),
					high: Number(item.high),
					low: Number(item.low),
					close: Number(item.close),
					volume: Number(item.volume || 0),
				};
			} catch (error) {
				throw new ValidationError(`Invalid data at index ${index}`, "DATA_CONVERSION_ERROR");
			}
		});
	}

	// 価格データの前処理（異常値除去、欠損値補完）
	public static cleanData(data: PriceData[]): PriceData[] {
		if (data.length === 0) return data;

		const cleaned = [...data];

		// 日付順にソート
		cleaned.sort((a, b) => a.date.getTime() - b.date.getTime());

		// 異常値の除去・修正
		for (let i = 0; i < cleaned.length; i++) {
			const item = cleaned[i];

			// NaN値のチェック
			if (isNaN(item.open) || isNaN(item.high) || isNaN(item.low) || isNaN(item.close)) {
				if (i > 0) {
					// 前の値で補完
					const prev = cleaned[i - 1];
					item.open = prev.close;
					item.high = prev.close;
					item.low = prev.close;
					item.close = prev.close;
				} else {
					// 最初の行の場合、次の有効な値を探す
					for (let j = i + 1; j < cleaned.length; j++) {
						if (!isNaN(cleaned[j].close)) {
							item.open = cleaned[j].close;
							item.high = cleaned[j].close;
							item.low = cleaned[j].close;
							item.close = cleaned[j].close;
							break;
						}
					}
				}
			}

			// 高値・安値の論理チェック
			if (item.high < item.low) {
				[item.high, item.low] = [item.low, item.high];
			}
			if (item.high < item.open) item.high = Math.max(item.open, item.close);
			if (item.high < item.close) item.high = Math.max(item.open, item.close);
			if (item.low > item.open) item.low = Math.min(item.open, item.close);
			if (item.low > item.close) item.low = Math.min(item.open, item.close);

			// 負の価格の修正
			if (item.open < 0) item.open = 0;
			if (item.high < 0) item.high = 0;
			if (item.low < 0) item.low = 0;
			if (item.close < 0) item.close = 0;
			if (item.volume < 0) item.volume = 0;
		}

		return cleaned;
	}

	// データの妥当性検証
	public static validateData(data: PriceData[]): boolean {
		if (!Array.isArray(data) || data.length === 0) {
			return false;
		}

		return data.every(item => {
			return item.date instanceof Date &&
				   typeof item.open === 'number' && !isNaN(item.open) &&
				   typeof item.high === 'number' && !isNaN(item.high) &&
				   typeof item.low === 'number' && !isNaN(item.low) &&
				   typeof item.close === 'number' && !isNaN(item.close) &&
				   typeof item.volume === 'number' && !isNaN(item.volume);
		});
	}

	// 終値データの抽出
	public static extractClosePrices(data: PriceData[]): number[] {
		return data.map(item => item.close);
	}

	// 高値データの抽出
	public static extractHighPrices(data: PriceData[]): number[] {
		return data.map(item => item.high);
	}

	// 安値データの抽出
	public static extractLowPrices(data: PriceData[]): number[] {
		return data.map(item => item.low);
	}

	// 出来高データの抽出
	public static extractVolumes(data: PriceData[]): number[] {
		return data.map(item => item.volume);
	}

	// 指定期間のデータを取得
	public static getLastNDays(data: PriceData[], days: number): PriceData[] {
		return data.slice(-days);
	}
}