import * as Joi from 'joi';
/**
 * A player entry in season leaders
 */
export interface SeasonLeader {
    player_id: number;
    player_name: string;
    team_abbreviation?: string;
    position?: string;
    value: number;
}
/**
 * Season leaders for a specific stat category
 */
export interface SeasonLeadersCategory {
    category: string;
    leaders: SeasonLeader[];
}
/**
 * Season leaders response with multiple stat categories
 */
export interface SeasonLeadersResponse {
    season: string;
    categories: SeasonLeadersCategory[];
}
export declare const seasonLeaderSchema: Joi.ObjectSchema<any>;
export declare const seasonLeadersCategorySchema: Joi.ObjectSchema<any>;
export declare const seasonLeadersResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=seasonleaders.d.ts.map