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

  // Performance
  wins: number;
  losses: number;
  win_pct: number;

  // Rankings
  playoff_rank: number;

  // Records
  home_record: string;
  road_record: string;
  conference_record: string;
  division_record: string;
  l10_record: string;

  // Streak & GB
  current_streak: number;
  current_streak_str: string;
  games_back: string;

  // Offense/Defense stats (optional - may not be available for all seasons)
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

// Joi validation schemas
export const standingRecordSchema = Joi.object({
  season_id: Joi.string().required(),
  team_id: Joi.number().integer().required(),
  team_city: Joi.string().required(),
  team_name: Joi.string().required(),
  conference: Joi.string().valid('East', 'West').required(),
  division: Joi.string().required(),

  // Performance
  wins: Joi.number().integer().min(0).required(),
  losses: Joi.number().integer().min(0).required(),
  win_pct: Joi.number().min(0).max(1).required(),

  // Rankings
  playoff_rank: Joi.number().integer().min(1).required(),

  // Records
  home_record: Joi.string().required(),
  road_record: Joi.string().required(),
  conference_record: Joi.string().required(),
  division_record: Joi.string().required(),
  l10_record: Joi.string().required(),

  // Streak & GB
  current_streak: Joi.number().integer().required(),
  current_streak_str: Joi.string().required(),
  games_back: Joi.string().required(),

  // Offense/Defense stats
  ppg: Joi.number().optional(),
  opp_ppg: Joi.number().optional(),
  diff: Joi.number().optional(),
});

export const standingsResponseSchema = Joi.object({
  standings: Joi.array().items(standingRecordSchema).required(),
});