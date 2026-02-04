import * as Joi from 'joi';
/**
 * Player information
 */
export interface Player {
    player_id: number;
    name: string;
    jersey_number: string;
    position: string;
    height: string;
    weight: number;
    birth_date: string;
    age: number;
    experience: string;
    school: string;
    team_id?: number;
    season?: string;
}
/**
 * Coach information
 */
export interface Coach {
    coach_id?: number;
    name: string;
    type: string;
    is_assistant?: boolean;
}
/**
 * Team roster with players and coaches
 */
export interface TeamRoster {
    team_id: number;
    team_name: string;
    season: string;
    players: Player[];
    coaches: Coach[];
}
/**
 * Player game performance
 */
export interface PlayerGamePerformance {
    game_id: string;
    date: string;
    opponent_team_abbreviation: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
}
/**
 * Player summary with stats
 */
export interface PlayerSummary {
    PERSON_ID: number;
    PLAYER_LAST_NAME: string;
    PLAYER_FIRST_NAME: string;
    PLAYER_SLUG?: string;
    TEAM_ID?: number;
    TEAM_SLUG?: string;
    IS_DEFUNCT?: number;
    TEAM_CITY?: string;
    TEAM_NAME?: string;
    TEAM_ABBREVIATION?: string;
    JERSEY_NUMBER?: string;
    POSITION?: string;
    HEIGHT?: string;
    WEIGHT?: number;
    COLLEGE?: string;
    COUNTRY?: string;
    ROSTER_STATUS?: string;
    PTS?: number;
    REB?: number;
    AST?: number;
    STL?: number;
    BLK?: number;
    STATS_TIMEFRAME?: string;
    FROM_YEAR?: number;
    TO_YEAR?: number;
    recent_games: PlayerGamePerformance[];
}
export declare const playerSchema: Joi.ObjectSchema<any>;
export declare const coachSchema: Joi.ObjectSchema<any>;
export declare const teamRosterSchema: Joi.ObjectSchema<any>;
export declare const playerGamePerformanceSchema: Joi.ObjectSchema<any>;
export declare const playerSummarySchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=player.d.ts.map