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

// Joi validation schemas
export const playerSchema = Joi.object({
  player_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  jersey_number: Joi.string().optional(),
  position: Joi.string().optional(),
  height: Joi.string().optional(),
  weight: Joi.number().integer().optional(),
  birth_date: Joi.string().optional(),
  age: Joi.number().integer().optional(),
  experience: Joi.string().optional(),
  school: Joi.string().optional(),
  team_id: Joi.number().integer().optional(),
  season: Joi.string().optional(),
});

export const coachSchema = Joi.object({
  coach_id: Joi.number().integer().optional(),
  name: Joi.string().required(),
  type: Joi.string().required(),
  is_assistant: Joi.boolean().optional(),
});

export const teamRosterSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  team_name: Joi.string().required(),
  season: Joi.string().required(),
  players: Joi.array().items(playerSchema).required(),
  coaches: Joi.array().items(coachSchema).optional().default([]),
});

export const playerGamePerformanceSchema = Joi.object({
  game_id: Joi.string().required(),
  date: Joi.string().required(),
  opponent_team_abbreviation: Joi.string().required(),
  points: Joi.number().integer().required(),
  rebounds: Joi.number().integer().required(),
  assists: Joi.number().integer().required(),
  steals: Joi.number().integer().required(),
  blocks: Joi.number().integer().required(),
});

export const playerSummarySchema = Joi.object({
  PERSON_ID: Joi.number().integer().required(),
  PLAYER_LAST_NAME: Joi.string().required(),
  PLAYER_FIRST_NAME: Joi.string().required(),
  PLAYER_SLUG: Joi.string().optional(),
  TEAM_ID: Joi.number().integer().optional(),
  TEAM_SLUG: Joi.string().optional(),
  IS_DEFUNCT: Joi.number().integer().optional(),
  TEAM_CITY: Joi.string().optional(),
  TEAM_NAME: Joi.string().optional(),
  TEAM_ABBREVIATION: Joi.string().optional(),
  JERSEY_NUMBER: Joi.string().optional(),
  POSITION: Joi.string().optional(),
  HEIGHT: Joi.string().optional(),
  WEIGHT: Joi.number().integer().optional(),
  COLLEGE: Joi.string().optional(),
  COUNTRY: Joi.string().optional(),
  ROSTER_STATUS: Joi.string().optional(),
  PTS: Joi.number().optional(),
  REB: Joi.number().optional(),
  AST: Joi.number().optional(),
  STL: Joi.number().optional(),
  BLK: Joi.number().optional(),
  STATS_TIMEFRAME: Joi.string().optional(),
  FROM_YEAR: Joi.number().integer().optional(),
  TO_YEAR: Joi.number().integer().optional(),
  recent_games: Joi.array().items(playerGamePerformanceSchema).optional().default([]),
});