import * as Joi from 'joi';

/**
 * Team game log entry
 */
export interface TeamGameLogEntry {
  game_id: string;
  game_date: string;
  matchup: string;
  win_loss?: string;
  points: number;
  rebounds: number;
  assists: number;
  field_goals_made?: number;
  field_goals_attempted?: number;
  field_goal_pct?: number;
  three_pointers_made?: number;
  three_pointers_attempted?: number;
  three_point_pct?: number;
  free_throws_made?: number;
  free_throws_attempted?: number;
  free_throw_pct?: number;
  turnovers: number;
  steals: number;
  blocks: number;
}

/**
 * Team game log response
 */
export interface TeamGameLogResponse {
  team_id: number;
  season: string;
  games: TeamGameLogEntry[];
}

// Joi validation schemas
export const teamGameLogEntrySchema = Joi.object({
  game_id: Joi.string().required(),
  game_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  matchup: Joi.string().required(),
  win_loss: Joi.string().optional(),
  points: Joi.number().integer().min(0).default(0),
  rebounds: Joi.number().integer().min(0).default(0),
  assists: Joi.number().integer().min(0).default(0),
  field_goals_made: Joi.number().integer().min(0).optional(),
  field_goals_attempted: Joi.number().integer().min(0).optional(),
  field_goal_pct: Joi.number().min(0).max(1).optional(),
  three_pointers_made: Joi.number().integer().min(0).optional(),
  three_pointers_attempted: Joi.number().integer().min(0).optional(),
  three_point_pct: Joi.number().min(0).max(1).optional(),
  free_throws_made: Joi.number().integer().min(0).optional(),
  free_throws_attempted: Joi.number().integer().min(0).optional(),
  free_throw_pct: Joi.number().min(0).max(1).optional(),
  turnovers: Joi.number().integer().min(0).default(0),
  steals: Joi.number().integer().min(0).default(0),
  blocks: Joi.number().integer().min(0).default(0),
});

export const teamGameLogResponseSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  season: Joi.string().required(),
  games: Joi.array().items(teamGameLogEntrySchema).required(),
});