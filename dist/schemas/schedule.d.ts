import * as Joi from 'joi';
/**
 * Minimal team data relevant to the scoreboard app
 */
export interface TeamSummary {
    team_id: number;
    team_abbreviation: string;
    points?: number;
}
/**
 * Top performer details (points, rebounds, assists)
 */
export interface TopScorer {
    player_id: number;
    player_name: string;
    team_id: number;
    points: number;
    rebounds: number;
    assists: number;
}
/**
 * Game leader with season averages
 */
export interface GameLeader {
    personId: number;
    name: string;
    jerseyNum?: string;
    position?: string;
    teamTricode?: string;
    points: number;
    rebounds: number;
    assists: number;
    periods?: Array<{
        period: number;
        score: number;
    }>;
}
/**
 * Game leaders for both teams with season averages
 */
export interface GameLeaders {
    homeLeaders?: GameLeader;
    awayLeaders?: GameLeader;
}
/**
 * Basic game details for past and present games in the scoreboard
 */
export interface GameSummary {
    game_id: string;
    game_date: string;
    game_time_utc?: string;
    matchup: string;
    game_status: string;
    arena?: string;
    home_team: TeamSummary;
    away_team: TeamSummary;
    top_scorer?: TopScorer;
    gameLeaders?: GameLeaders;
    win_probability?: number;
}
/**
 * Response model for past and present games selected by date
 */
export interface GamesResponse {
    date: string;
    games: GameSummary[];
}
export declare const teamSummarySchema: Joi.ObjectSchema<any>;
export declare const topScorerSchema: Joi.ObjectSchema<any>;
export declare const gameLeaderSchema: Joi.ObjectSchema<any>;
export declare const gameLeadersSchema: Joi.ObjectSchema<any>;
export declare const gameSummarySchema: Joi.ObjectSchema<any>;
export declare const gamesResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=schedule.d.ts.map