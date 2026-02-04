import * as Joi from 'joi';
/**
 * A single game log entry for a player
 */
export interface PlayerGameLogEntry {
    game_id: string;
    game_date: string;
    matchup: string;
    win_loss?: string;
    minutes?: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    field_goals_made?: number;
    field_goals_attempted?: number;
    field_goal_pct?: number;
    three_pointers_made?: number;
    three_pointers_attempted?: number;
    three_point_pct?: number;
    free_throws_made?: number;
    free_throws_attempted?: number;
    free_throw_pct?: number;
    plus_minus?: number;
}
/**
 * Player game log response with all games
 */
export interface PlayerGameLogResponse {
    player_id: number;
    season: string;
    games: PlayerGameLogEntry[];
}
export declare const playerGameLogEntrySchema: Joi.ObjectSchema<any>;
export declare const playerGameLogResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=playergamelog.d.ts.map