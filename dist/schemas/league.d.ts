import * as Joi from 'joi';
/**
 * Represents a league leader in a specific stat category
 */
export interface LeagueLeader {
    player_id: number;
    name: string;
    team: string;
    stat_value: number;
    rank: number;
    games_played: number;
}
/**
 * Response schema for league leaders endpoint
 */
export interface LeagueLeadersResponse {
    category: string;
    season: string;
    leaders: LeagueLeader[];
}
export declare const leagueLeaderSchema: Joi.ObjectSchema<any>;
export declare const leagueLeadersResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=league.d.ts.map