import { ErrorHandler } from "./technical-indicators/utils/errorHandler.js";
import { ParameterValidator } from "./technical-indicators/utils/parameterValidator.js";
import { TechnicalAnalyzer } from "./technical-indicators/technicalAnalyzer.js";
import type {
	ComprehensiveStockAnalysisResult,
	ErrorReport,
	TechnicalParametersConfig,
	ValidatedTechnicalParameters,
} from "./technical-indicators/types.js";

export interface BuildAnalysisReportOptions {
	symbol: string;
	days?: number;
	period?: string;
	includeFinancials?: boolean;
	technicalParams?: TechnicalParametersConfig;
}

export interface BuildAnalysisReportResult {
	report: string;
	analysisResult: ComprehensiveStockAnalysisResult;
	validatedParams: ValidatedTechnicalParameters;
	errorReports: ErrorReport[];
}

export async function buildAnalysisReport({
	symbol,
	days = 7,
	period = "1y",
	includeFinancials = true,
	technicalParams,
}: BuildAnalysisReportOptions): Promise<BuildAnalysisReportResult> {
	const { result: analysisResult, errorReports } = await TechnicalAnalyzer.analyzeStockComprehensive(
		symbol,
		period,
		includeFinancials,
		technicalParams,
	);

	const validationResult = ParameterValidator.validateAndSetDefaults(technicalParams);
	const report = TechnicalAnalyzer.generateJapaneseReportFromAnalysis(
		analysisResult,
		days,
		validationResult.validatedParams,
		technicalParams,
	);

	const consolidatedErrorMessage = ErrorHandler.generateConsolidatedUserMessage(errorReports);
	const finalReport = consolidatedErrorMessage ? `${report}\n\n---\n\n${consolidatedErrorMessage}` : report;

	return {
		report: finalReport,
		analysisResult,
		validatedParams: validationResult.validatedParams,
		errorReports,
	};
}

