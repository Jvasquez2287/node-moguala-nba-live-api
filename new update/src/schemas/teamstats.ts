import * as Joi from 'joi';

/**
 * Team stat summary
 */
export interface TeamStatSummary {
  team_id: number;
  team_name: string;
  team_abbreviation?: string;
  value: number;
}

/**
 * Team stat category
 */
export interface TeamStatCategory {
  category_name: string;
  teams: TeamStatSummary[];
}

/**
 * Team stats response
 */
export interface TeamStatsResponse {
  season: string;
  categories: TeamStatCategory[];
}

// Joi validation schemas
export const teamStatSummarySchema = Joi.object({
  team_id: Joi.number().integer().required(),
  team_name: Joi.string().required(),
  team_abbreviation: Joi.string().optional(),
  value: Joi.number().required(),
});

export const teamStatCategorySchema = Joi.object({
  category_name: Joi.string().required(),
  teams: Joi.array().items(teamStatSummarySchema).required(),
});

export const teamStatsResponseSchema = Joi.object({
  season: Joi.string().required(),
  categories: Joi.array().items(teamStatCategorySchema).required(),
});