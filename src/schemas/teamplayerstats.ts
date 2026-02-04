import * as Joi from 'joi';

/**
 * Player statistics for a team
 */
export interface TeamPlayerStat {
  player_id: number;
  player_name: string;
  position?: string;
  jersey_number?: string;

  // Games
  games_played: number;
  games_started: number;

  // Per game averages
  minutes: number;
  points: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personal_fouls: number;
  assist_to_turnover?: number;
}

/**
 * Response for team player statistics
 */
export interface TeamPlayerStatsResponse {
  team_id: number;
  season: string;
  players: TeamPlayerStat[];
}

// Joi validation schemas
export const teamPlayerStatSchema = Joi.object({
  player_id: Joi.number().integer().required(),
  player_name: Joi.string().required(),
  position: Joi.string().optional(),
  jersey_number: Joi.string().optional(),

  // Games
  games_played: Joi.number().integer().min(0).default(0),
  games_started: Joi.number().integer().min(0).default(0),

  // Per game averages
  minutes: Joi.number().min(0).default(0.0),
  points: Joi.number().min(0).default(0.0),
  offensive_rebounds: Joi.number().min(0).default(0.0),
  defensive_rebounds: Joi.number().min(0).default(0.0),
  rebounds: Joi.number().min(0).default(0.0),
  assists: Joi.number().min(0).default(0.0),
  steals: Joi.number().min(0).default(0.0),
  blocks: Joi.number().min(0).default(0.0),
  turnovers: Joi.number().min(0).default(0.0),
  personal_fouls: Joi.number().min(0).default(0.0),
  assist_to_turnover: Joi.number().optional(),
});

export const teamPlayerStatsResponseSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  season: Joi.string().required(),
  players: Joi.array().items(teamPlayerStatSchema).required(),
});