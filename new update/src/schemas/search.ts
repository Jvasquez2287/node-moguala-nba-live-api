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

// Joi validation schemas
export const playerResultSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  team_id: Joi.number().integer().optional(),
  team_abbreviation: Joi.string().optional(),
});

export const teamResultSchema = Joi.object({
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  abbreviation: Joi.string().required(),
});

export const searchResultsSchema = Joi.object({
  players: Joi.array().items(playerResultSchema).required(),
  teams: Joi.array().items(teamResultSchema).required(),
});