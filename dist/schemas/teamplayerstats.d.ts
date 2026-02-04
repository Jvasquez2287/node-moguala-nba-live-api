import * as Joi from 'joi';
/**
 * Player statistics for a team
 */
export interface TeamPlayerStat {
    player_id: number;
    player_name: string;
    position?: string;
    jersey_number?: string;
    games_played: number;
    games_started: number;
    minutes: number;
    points: number;
    offensive_rebounds: number;
    defensive_rebounds: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    personal_fouls: number;
    assist_to_turnover?: number;
}
/**
 * Response for team player statistics
 */
export interface TeamPlayerStatsResponse {
    team_id: number;
    season: string;
    players: TeamPlayerStat[];
}
export declare const teamPlayerStatSchema: Joi.ObjectSchema<any>;
export declare const teamPlayerStatsResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=teamplayerstats.d.ts.map