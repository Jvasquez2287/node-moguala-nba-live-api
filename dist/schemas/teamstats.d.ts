import * as Joi from 'joi';
/**
 * Team stat summary
 */
export interface TeamStatSummary {
    team_id: number;
    team_name: string;
    team_abbreviation?: string;
    value: number;
}
/**
 * Team stat category
 */
export interface TeamStatCategory {
    category_name: string;
    teams: TeamStatSummary[];
}
/**
 * Team stats response
 */
export interface TeamStatsResponse {
    season: string;
    categories: TeamStatCategory[];
}
export declare const teamStatSummarySchema: Joi.ObjectSchema<any>;
export declare const teamStatCategorySchema: Joi.ObjectSchema<any>;
export declare const teamStatsResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=teamstats.d.ts.map