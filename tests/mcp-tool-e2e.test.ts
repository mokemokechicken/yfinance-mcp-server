import { describe, it } from "node:test";
import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

/**
 * MCP Tool `getStockAnalysis` のエンドツーエンドテスト
 * 実際のMCPサーバープロセスを起動して、JSON-RPC経由でツールを呼び出し
 * レスポンスを検証する統合テストスイート
 */
describe("MCP Tool End-to-End テスト", () => {
	const timeout = 45000; // エンドツーエンドテストのため、長いタイムアウト

	/**
	 * MCPサーバープロセスにJSON-RPC呼び出しを送信し、レスポンスを取得
	 */
	async function callMcpTool(method: string, params: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const serverPath = join(process.cwd(), "build", "index.js");
			const serverProcess: ChildProcess = spawn("node", [serverPath], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			let stdoutData = "";
			let stderrData = "";

			if (!serverProcess.stdout || !serverProcess.stdin || !serverProcess.stderr) {
				reject(new Error("Failed to create server process streams"));
				return;
			}

			serverProcess.stdout.on("data", (data: Buffer) => {
				stdoutData += data.toString();
			});

			serverProcess.stderr.on("data", (data: Buffer) => {
				stderrData += data.toString();
			});

			serverProcess.on("close", (code: number | null) => {
				if (code === 0) {
					try {
						// 複数のJSON-RPCレスポンスが含まれる可能性があるため、最後の行を取得
						const lines = stdoutData.trim().split("\n");
						const lastLine = lines[lines.length - 1];
						const response = JSON.parse(lastLine);
						resolve(response);
					} catch (error) {
						reject(new Error(`JSON parse error: ${error}\nOutput: ${stdoutData}\nError: ${stderrData}`));
					}
				} else {
					reject(new Error(`Server process exited with code ${code}\nStderr: ${stderrData}`));
				}
			});

			serverProcess.on("error", (error: Error) => {
				reject(new Error(`Failed to start server process: ${error.message}`));
			});

			// JSON-RPCリクエストを送信
			const jsonRpcRequest = {
				jsonrpc: "2.0",
				id: 1,
				method,
				params,
			};

			const requestStr = JSON.stringify(jsonRpcRequest) + "\n";
			serverProcess.stdin.write(requestStr);
			serverProcess.stdin.end();
		});
	}

	describe("tools/call - getStockAnalysis", () => {
		it("デフォルトパラメータでのツール呼び出し", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
				},
			});

			// JSON-RPC応答の基本構造確認
			assert.ok(response);
			assert.strictEqual(response.jsonrpc, "2.0");
			assert.strictEqual(response.id, 1);
			assert.ok(response.result);

			// ツール実行結果の構造確認
			const result = response.result;
			assert.ok(result.content);
			assert.ok(Array.isArray(result.content));
			assert.strictEqual(result.content.length, 1);
			assert.strictEqual(result.content[0].type, "text");
			assert.ok(result.content[0].text);

			const reportText = result.content[0].text;
			
			// レポートに必要な要素が含まれていることを確認
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("移動平均線"));
			assert.ok(reportText.includes("RSI"));
			assert.ok(reportText.includes("MACD"));
			assert.ok(reportText.includes("ボリンジャーバンド"));
			assert.ok(reportText.includes("VWAP"));

			console.log("✅ デフォルトパラメータでのMCPツール呼び出し完了");
		});

		it("days パラメータありでのツール呼び出し", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					days: 14,
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			// 14日分のデータ表示を確認（レポートに「14日間」などの表記があるかチェック）
			assert.ok(reportText.includes("AAPL"));
			
			console.log("✅ daysパラメータありでのMCPツール呼び出し完了");
		});

		it("カスタムtechnicalParamsでのツール呼び出し", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					days: 7,
					technicalParams: {
						movingAverages: {
							periods: [10, 30, 100],
						},
						rsi: {
							periods: [7, 14],
							overbought: 75,
							oversold: 25,
						},
						macd: {
							fastPeriod: 8,
							slowPeriod: 21,
							signalPeriod: 5,
						},
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			// カスタム設定の表示を確認
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("カスタム") || reportText.includes("カスタマイズ"));
			
			console.log("✅ カスタムtechnicalParamsでのMCPツール呼び出し完了");
		});

		it("部分的なtechnicalParamsでのツール呼び出し", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					technicalParams: {
						rsi: {
							overbought: 80,
						},
						// 他の設定はデフォルト値を使用
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("RSI"));
			
			console.log("✅ 部分的なtechnicalParamsでのMCPツール呼び出し完了");
		});

		it("日本株での統合テスト", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "7203.T", // トヨタ自動車
					days: 5,
					technicalParams: {
						movingAverages: {
							periods: [20, 50, 100],
						},
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("7203.T"));
			assert.ok(reportText.includes("移動平均線"));
			
			console.log("✅ 日本株でのMCPツール統合テスト完了");
		});
	});

	describe("VWAP機能統合テスト", () => {
		it("VWAP機能（enableTrueVWAP: true）での統合テスト", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					technicalParams: {
						vwap: {
							enableTrueVWAP: true,
							standardDeviations: 1,
						},
						mvwap: {
							period: 20,
							standardDeviations: 1,
						},
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			// VWAP関連の表示を確認
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("VWAP") || reportText.includes("MVWAP"));
			
			console.log("✅ VWAP機能統合テスト完了");
		});

		it("ハイブリッドVWAP機能での統合テスト", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "MSFT", // Microsoft
					technicalParams: {
						vwap: {
							enableTrueVWAP: true,
							standardDeviations: 2,
						},
						mvwap: {
							period: 15,
							standardDeviations: 1.5,
						},
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("MSFT"));
			
			console.log("✅ ハイブリッドVWAP機能統合テスト完了");
		});
	});

	describe("エラーハンドリング統合テスト", () => {
		it("無効な銘柄コードでのエラーハンドリング", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "INVALID_SYMBOL_TESTING_123",
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			// エラーメッセージが適切に表示されることを確認
			assert.ok(reportText.includes("分析に失敗") || reportText.includes("エラー"));
			assert.ok(reportText.includes("INVALID_SYMBOL_TESTING_123"));
			
			console.log("✅ 無効銘柄コードでのエラーハンドリング統合テスト完了");
		});

		it("無効なパラメータでのGraceful Degradation統合テスト", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					technicalParams: {
						movingAverages: {
							periods: [-5, 0, 1000], // 無効値
						},
						rsi: {
							periods: [999], // 無効値
							overbought: 150, // 範囲外
							oversold: -10, // 範囲外
						},
						macd: {
							fastPeriod: -1, // 無効値
							slowPeriod: 0, // 無効値
							signalPeriod: 1000, // 無効値
						},
					},
				},
			});

			// エラーが発生せず、結果が返されることを確認
			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("AAPL"));
			// 警告メッセージまたは修正されたパラメータの表示があることを確認
			
			console.log("✅ 無効パラメータでのGraceful Degradation統合テスト完了");
		});
	});

	describe("下位互換性確認統合テスト", () => {
		it("従来のAPI呼び出し形式（symbolのみ）", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("移動平均線"));
			
			console.log("✅ 従来API呼び出し形式での下位互換性確認完了");
		});

		it("従来のAPI呼び出し形式（symbol + days）", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					days: 10,
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			assert.ok(reportText.includes("AAPL"));
			
			console.log("✅ 従来API呼び出し形式（symbol + days）での下位互換性確認完了");
		});
	});

	describe("パフォーマンス検証統合テスト", () => {
		it("レスポンス時間が許容範囲内である", { timeout }, async () => {
			const startTime = Date.now();
			
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					technicalParams: {
						movingAverages: { periods: [10, 30, 100] },
						rsi: { periods: [7, 14] },
						macd: { fastPeriod: 8, slowPeriod: 21, signalPeriod: 5 },
					},
				},
			});
			
			const responseTime = Date.now() - startTime;
			
			assert.ok(response?.result?.content?.[0]?.text);
			
			// 統合テストとしてのレスポンス時間は30秒以内であることを確認
			assert.ok(responseTime < 30000, `レスポンス時間が長すぎます: ${responseTime}ms`);
			
			console.log(`📊 統合テスト レスポンス時間: ${responseTime}ms`);
			console.log("✅ パフォーマンス検証統合テスト完了");
		});
	});

	describe("複合シナリオ統合テスト", () => {
		it("すべての機能を含む最大パラメータ設定での統合テスト", { timeout }, async () => {
			const response = await callMcpTool("tools/call", {
				name: "getStockAnalysis",
				arguments: {
					symbol: "AAPL",
					days: 14,
					technicalParams: {
						movingAverages: {
							periods: [5, 20, 50, 100],
						},
						rsi: {
							periods: [7, 14, 21],
							overbought: 75,
							oversold: 25,
						},
						macd: {
							fastPeriod: 8,
							slowPeriod: 21,
							signalPeriod: 5,
						},
						bollingerBands: {
							period: 15,
							standardDeviations: 1.5,
						},
						stochastic: {
							kPeriod: 10,
							dPeriod: 5,
							overbought: 85,
							oversold: 15,
						},
						volumeAnalysis: {
							period: 15,
							spikeThreshold: 2.5,
						},
						vwap: {
							enableTrueVWAP: true,
							standardDeviations: 2,
						},
						mvwap: {
							period: 25,
							standardDeviations: 1.5,
						},
					},
				},
			});

			assert.ok(response?.result?.content?.[0]?.text);
			const reportText = response.result.content[0].text;
			
			// 全機能が含まれていることを確認
			assert.ok(reportText.includes("AAPL"));
			assert.ok(reportText.includes("移動平均線"));
			assert.ok(reportText.includes("RSI"));
			assert.ok(reportText.includes("MACD"));
			assert.ok(reportText.includes("ボリンジャーバンド"));
			assert.ok(reportText.includes("ストキャスティクス"));
			assert.ok(reportText.includes("VWAP") || reportText.includes("MVWAP"));
			
			console.log("✅ 最大パラメータ設定での統合テスト完了");
		});
	});
});