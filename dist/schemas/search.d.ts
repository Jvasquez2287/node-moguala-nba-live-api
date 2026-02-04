import * as Joi from 'joi';
/**
 * Player search result
 */
export interface PlayerResult {
    id: number;
    name: string;
    team_id?: number;
    team_abbreviation?: string;
}
/**
 * Team search result
 */
export interface TeamResult {
    id: number;
    name: string;
    abbreviation: string;
}
/**
 * Combined search results
 */
export interface SearchResults {
    players: PlayerResult[];
    teams: TeamResult[];
}
export declare const playerResultSchema: Joi.ObjectSchema<any>;
export declare const teamResultSchema: Joi.ObjectSchema<any>;
export declare const searchResultsSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=search.d.ts.map