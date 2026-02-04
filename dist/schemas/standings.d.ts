import * as Joi from 'joi';
/**
 * Represents the standings of an NBA team for a given season
 */
export interface StandingRecord {
    season_id: string;
    team_id: number;
    team_city: string;
    team_name: string;
    conference: string;
    division: string;
    wins: number;
    losses: number;
    win_pct: number;
    playoff_rank: number;
    home_record: string;
    road_record: string;
    conference_record: string;
    division_record: string;
    l10_record: string;
    current_streak: number;
    current_streak_str: string;
    games_back: string;
    ppg?: number;
    opp_ppg?: number;
    diff?: number;
}
/**
 * Response schema for NBA standings by season
 */
export interface StandingsResponse {
    standings: StandingRecord[];
}
export declare const standingRecordSchema: Joi.ObjectSchema<any>;
export declare const standingsResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=standings.d.ts.map