import * as Joi from 'joi';

/**
 * A player entry in season leaders
 */
export interface SeasonLeader {
  player_id: number;
  player_name: string;
  team_abbreviation?: string;
  position?: string;
  value: number;
}

/**
 * Season leaders for a specific stat category
 */
export interface SeasonLeadersCategory {
  category: string;
  leaders: SeasonLeader[];
}

/**
 * Season leaders response with multiple stat categories
 */
export interface SeasonLeadersResponse {
  season: string;
  categories: SeasonLeadersCategory[];
}

// Joi validation schemas
export const seasonLeaderSchema = Joi.object({
  player_id: Joi.number().integer().required(),
  player_name: Joi.string().required(),
  team_abbreviation: Joi.string().optional(),
  position: Joi.string().optional(),
  value: Joi.number().required(),
});

export const seasonLeadersCategorySchema = Joi.object({
  category: Joi.string().required(),
  leaders: Joi.array().items(seasonLeaderSchema).required(),
});

export const seasonLeadersResponseSchema = Joi.object({
  season: Joi.string().required(),
  categories: Joi.array().items(seasonLeadersCategorySchema).required(),
});