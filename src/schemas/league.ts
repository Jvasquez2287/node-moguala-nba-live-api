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

// Joi validation schemas
export const leagueLeaderSchema = Joi.object({
  player_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  team: Joi.string().required(),
  stat_value: Joi.number().required(),
  rank: Joi.number().integer().min(1).max(5).required(),
  games_played: Joi.number().integer().min(0).required(),
});

export const leagueLeadersResponseSchema = Joi.object({
  category: Joi.string().valid('PTS', 'REB', 'AST', 'STL', 'BLK').required(),
  season: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  leaders: Joi.array().items(leagueLeaderSchema).default([]),
});