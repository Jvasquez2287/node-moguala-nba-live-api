import * as Joi from 'joi';
import { Coach } from './coach';
/**
 * Team details response
 */
export interface TeamDetailsResponse {
    team_id: number;
    team_name: string;
    team_city: string;
    abbreviation?: string;
    year_founded?: number;
    arena?: string;
    arena_capacity?: number;
    owner?: string;
    general_manager?: string;
    head_coach?: string;
}
/**
 * Player information for roster
 */
export interface Player {
    player_id: number;
    name: string;
    jersey_number?: string;
    position?: string;
    height?: string;
    weight?: number;
    birth_date?: string;
    age?: number;
    experience?: string;
    school?: string;
}
/**
 * Team roster response
 */
export interface TeamRoster {
    team_id: number;
    team_name: string;
    season: string;
    players: Player[];
    coaches?: Coach[];
}
export declare const teamDetailsResponseSchema: Joi.ObjectSchema<any>;
export declare const playerSchema: Joi.ObjectSchema<any>;
export declare const teamRosterSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=team.d.ts.map