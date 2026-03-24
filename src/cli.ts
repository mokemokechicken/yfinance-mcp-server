#!/usr/bin/env node

import { buildAnalysisReport } from "./lib/analysisRunner.js";
import type { TechnicalParametersConfig } from "./lib/technical-indicators/types.js";

interface CliOptions {
	symbol?: string;
	days: number;
	period: string;
	json: boolean;
	includeFinancials: boolean;
	technicalParams?: TechnicalParametersConfig;
	help: boolean;
}

function printUsage(): void {
	console.log(`yfinance-analyze <symbol> [options]

Options:
  -d, --days <number>               直近何日分をレポートに表示するか (default: 7)
  -p, --period <value>              取得期間 (default: 1y)
  -t, --technical-params <json>     技術指標パラメータの JSON
  --json                            JSON で出力する
  --no-financials                   財務指標の取得を省略する
  -h, --help                        このヘルプを表示する

Examples:
  yfinance-analyze AAPL
  yfinance-analyze 6301.T --days 5
  yfinance-analyze AAPL --technical-params '{"rsi":{"overbought":80}}'
  yfinance-analyze AAPL --json
`);
}

function parseTechnicalParams(value: string): TechnicalParametersConfig {
	try {
		const parsed = JSON.parse(value) as TechnicalParametersConfig;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("technical-params は JSON オブジェクトで指定してください");
		}
		return parsed;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`technical-params の JSON 解析に失敗しました: ${message}`);
	}
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		days: 7,
		period: "1y",
		json: false,
		includeFinancials: true,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === "-h" || arg === "--help") {
			options.help = true;
			continue;
		}

		if (arg === "--json") {
			options.json = true;
			continue;
		}

		if (arg === "--no-financials") {
			options.includeFinancials = false;
			continue;
		}

		if (arg === "-d" || arg === "--days") {
			const value = argv[++i];
			if (!value) {
				throw new Error("--days には数値を指定してください");
			}
			const days = Number(value);
			if (!Number.isInteger(days) || days < 1 || days > 365) {
				throw new Error("--days は 1 から 365 の整数で指定してください");
			}
			options.days = days;
			continue;
		}

		if (arg === "-p" || arg === "--period") {
			const value = argv[++i];
			if (!value) {
				throw new Error("--period には値を指定してください");
			}
			options.period = value;
			continue;
		}

		if (arg === "-t" || arg === "--technical-params" || arg === "--technicalParams") {
			const value = argv[++i];
			if (!value) {
				throw new Error("--technical-params には JSON を指定してください");
			}
			options.technicalParams = parseTechnicalParams(value);
			continue;
		}

		if (arg.startsWith("--days=")) {
			const days = Number(arg.slice("--days=".length));
			if (!Number.isInteger(days) || days < 1 || days > 365) {
				throw new Error("--days は 1 から 365 の整数で指定してください");
			}
			options.days = days;
			continue;
		}

		if (arg.startsWith("--period=")) {
			options.period = arg.slice("--period=".length);
			continue;
		}

		if (arg.startsWith("--technical-params=")) {
			options.technicalParams = parseTechnicalParams(arg.slice("--technical-params=".length));
			continue;
		}

		if (arg.startsWith("--technicalParams=")) {
			options.technicalParams = parseTechnicalParams(arg.slice("--technicalParams=".length));
			continue;
		}

		if (arg.startsWith("-")) {
			throw new Error(`未対応のオプションです: ${arg}`);
		}

		if (!options.symbol) {
			options.symbol = arg;
			continue;
		}

		throw new Error(`引数が多すぎます: ${arg}`);
	}

	return options;
}

async function main() {
	try {
		const options = parseArgs(process.argv.slice(2));

		if (options.help || !options.symbol) {
			printUsage();
			process.exitCode = options.help ? 0 : 1;
			return;
		}

		const analysis = await buildAnalysisReport({
			symbol: options.symbol,
			days: options.days,
			period: options.period,
			includeFinancials: options.includeFinancials,
			technicalParams: options.technicalParams,
		});

		if (options.json) {
			console.log(
				JSON.stringify(
					{
						symbol: options.symbol,
						days: options.days,
						period: options.period,
						includeFinancials: options.includeFinancials,
						report: analysis.report,
						analysisResult: analysis.analysisResult,
						validatedParams: analysis.validatedParams,
						errorReports: analysis.errorReports,
					},
					null,
					2,
				),
			);
			return;
		}

		console.log(analysis.report);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ CLI 実行に失敗しました: ${message}`);
		process.exitCode = 1;
	}
}

await main();

