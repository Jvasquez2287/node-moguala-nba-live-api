import * as Joi from 'joi';

/**
 * Minimal team data relevant to the scoreboard app
 */
export interface TeamSummary {
  team_id: number;
  team_abbreviation: string;
  points?: number;
}

/**
 * Top performer details (points, rebounds, assists)
 */
export interface TopScorer {
  player_id: number;
  player_name: string;
  team_id: number;
  points: number;
  rebounds: number;
  assists: number;
}

/**
 * Game leader with season averages
 */
export interface GameLeader {
  personId: number;
  name: string;
  jerseyNum?: string;
  position?: string;
  teamTricode?: string;
  points: number;
  rebounds: number;
  assists: number;
}

/**
 * Game leaders for both teams with season averages
 */
export interface GameLeaders {
  homeLeaders?: GameLeader;
  awayLeaders?: GameLeader;
}

/**
 * Basic game details for past and present games in the scoreboard
 */
export interface GameSummary {
  game_id: string;
  game_date: string;
  game_time_utc?: string;
  matchup: string;
  game_status: string;
  arena?: string;
  home_team: TeamSummary;
  away_team: TeamSummary;
  top_scorer?: TopScorer;
  gameLeaders?: GameLeaders;
  win_probability?: number;
}

/**
 * Response model for past and present games selected by date
 */
export interface GamesResponse {
  date: string;
  games: GameSummary[];
}

// Joi validation schemas
export const teamSummarySchema = Joi.object({
  team_id: Joi.number().integer().required(),
  team_abbreviation: Joi.string().required(),
  points: Joi.number().integer().allow(null).optional(),
});

export const topScorerSchema = Joi.object({
  player_id: Joi.number().integer().required(),
  player_name: Joi.string().required(),
  team_id: Joi.number().integer().required(),
  points: Joi.number().integer().required(),
  rebounds: Joi.number().integer().required(),
  assists: Joi.number().integer().required(),
});

export const gameLeaderSchema = Joi.object({
  personId: Joi.number().integer().required(),
  name: Joi.string().required(),
  jerseyNum: Joi.string().optional(),
  position: Joi.string().optional(),
  teamTricode: Joi.string().optional(),
  points: Joi.number().required(),
  rebounds: Joi.number().required(),
  assists: Joi.number().required(),
});

export const gameLeadersSchema = Joi.object({
  homeLeaders: gameLeaderSchema.optional(),
  awayLeaders: gameLeaderSchema.optional(),
});

export const gameSummarySchema = Joi.object({
  game_id: Joi.string().required(),
  game_date: Joi.string().required(),
  game_time_utc: Joi.string().allow(null).optional(),
  matchup: Joi.string().required(),
  game_status: Joi.string().required(),
  arena: Joi.string().allow(null).optional(),
  home_team: teamSummarySchema.required(),
  away_team: teamSummarySchema.required(),
  top_scorer: topScorerSchema.optional(),
  gameLeaders: gameLeadersSchema.optional(),
  win_probability: Joi.number().min(0).max(1).optional(),
});

export const gamesResponseSchema = Joi.object({
  date: Joi.string().required(),
  games: Joi.array().items(gameSummarySchema).required(),
});