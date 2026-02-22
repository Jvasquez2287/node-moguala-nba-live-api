/**
 * Prompt generation for Groq LLM for NBA game insights and analysis
 */
/**
 * Get the system message for Groq LLM
 */
export declare function getSystemMessage(): string;
/**
 * Build the user prompt for generating AI insights
 */
export declare function buildInsightPrompt(options: {
    homeTeamName: string;
    awayTeamName: string;
    homeWinProbPct: number;
    awayWinProbPct: number;
    predictedHomeScore: number;
    predictedAwayScore: number;
    netRatingDiffStr?: string;
}): string;
/**
 * Get system message for live game insights
 */
export declare function getLiveGameSystemMessage(): string;
/**
 * Build the user prompt for generating live game insights
 */
export declare function buildLiveGameInsightPrompt(options: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    period: number;
    clock: string;
    lastThreePlays: string[];
    topPerformer?: string;
    triggerType?: string;
}): string;
/**
 * Get system message for batched live game insights
 */
export declare function getBatchedInsightsSystemMessage(): string;
/**
 * Build prompt for batched insights across all games
 */
export declare function buildBatchedInsightsPrompt(games: Array<Record<string, any>>): string;
/**
 * Get system message for key moment context
 */
export declare function getKeyMomentSystemMessage(): string;
/**
 * Build prompt for key moment context
 */
export declare function buildKeyMomentContextPrompt(options: {
    momentType: string;
    gameInfo: {
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        period: number;
        clock: string;
    };
    play: {
        teamTricode: string;
        playerName?: string;
        actionType?: string;
        description?: string;
    };
}): string;
/**
 * Get system message for batched moment context
 */
export declare function getBatchedMomentContextSystemMessage(): string;
/**
 * Build prompt for batched moment context
 */
export declare function buildBatchedMomentContextPrompt(momentsWithGameInfo: Array<{
    momentId: string;
    moment: {
        type: string;
        play: Record<string, any>;
    };
    gameInfo: {
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        period: number;
        clock: string;
    };
}>): string;
declare const _default: {
    getSystemMessage: typeof getSystemMessage;
    buildInsightPrompt: typeof buildInsightPrompt;
    getLiveGameSystemMessage: typeof getLiveGameSystemMessage;
    buildLiveGameInsightPrompt: typeof buildLiveGameInsightPrompt;
    getBatchedInsightsSystemMessage: typeof getBatchedInsightsSystemMessage;
    buildBatchedInsightsPrompt: typeof buildBatchedInsightsPrompt;
    getKeyMomentSystemMessage: typeof getKeyMomentSystemMessage;
    buildKeyMomentContextPrompt: typeof buildKeyMomentContextPrompt;
    getBatchedMomentContextSystemMessage: typeof getBatchedMomentContextSystemMessage;
    buildBatchedMomentContextPrompt: typeof buildBatchedMomentContextPrompt;
};
export default _default;
//# sourceMappingURL=groqPrompts%20copy.d.ts.map