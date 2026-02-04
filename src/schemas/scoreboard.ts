import * as Joi from 'joi';

/**
 * Schema for a single play-by-play event in the game.
 */
export interface PlayByPlayEvent {
  /** Unique identifier for the action. */
  action_number: number;
  /** Time remaining in the period (ISO 8601 format). */
  clock: string;
  /** Current period of the game. */
  period: number;
  /** Team ID associated with the play. */
  team_id?: number;
  /** Three-letter team abbreviation. */
  team_tricode?: string;
  /** Type of action (e.g., 'shot', 'turnover'). */
  action_type: string;
  /** Detailed description of the play. */
  description: string;
  /** Player ID involved in the action. */
  player_id?: number;
  /** Full name of the player involved in the action. */
  player_name?: string;
  /** Current home team score after action. */
  score_home?: string;
  /** Current away team score after action. */
  score_away?: string;
}

/**
 * Schema for retrieving real-time play-by-play breakdown of a game.
 */
export interface PlayByPlayResponse {
  /** Unique identifier for the game (10-digit ID). */
  game_id: string;
  /** List of play-by-play events. */
  plays: PlayByPlayEvent[];
}

/**
 * Represents an NBA team participating in a game.
 */
export interface Team {
  /** Unique identifier for the team. */
  teamId: number;
  /** Full name of the team. */
  teamName: string;
  /** City where the team is based. */
  teamCity: string;
  /** Three-letter abbreviation of the team. */
  teamTricode: string;
  /** Total wins for the team in the season. */
  wins?: number;
  /** Total losses for the team in the season. */
  losses?: number;
  /** Total team score. */
  score?: number;
  /** Number of timeouts left for the team. */
  timeoutsRemaining?: number;
}

/**
 * Represents an individual player's performance in a game or season averages.
 */
export interface PlayerStats {
  /** Unique identifier for the player. */
  personId: number;
  /** Full name of the player. */
  name: string;
  /** Player's jersey number. */
  jerseyNum: string;
  /** Player's position on the court. */
  position: string;
  /** Three-letter abbreviation of the player's team. */
  teamTricode: string;
  /** Points (game stats or season average PPG). */
  points: number;
  /** Rebounds (game stats or season average RPG). */
  rebounds: number;
  /** Assists (game stats or season average APG). */
  assists: number;
}

/**
 * Represents the top-performing players in a game.
 */
export interface GameLeaders {
  /** Top-performing player from the home team. */
  homeLeaders?: PlayerStats;
  /** Top-performing player from the away team. */
  awayLeaders?: PlayerStats;
}

/**
 * Detailed statistics for a player in a game.
 */
export interface PlayerBoxScoreStats {
  /** Unique identifier for the player. */
  player_id: number;
  /** Full name of the player. */
  name: string;
  /** Position played. Defaults to 'N/A' if not available. */
  position: string;
  /** Total minutes played. */
  minutes?: string;
  /** Total points scored. */
  points: number;
  /** Total rebounds. */
  rebounds: number;
  /** Total assists. */
  assists: number;
  /** Total steals. */
  steals: number;
  /** Total blocks. */
  blocks: number;
  /** Total turnovers. */
  turnovers: number;
}

/**
 * Team-level box score stats.
 */
export interface TeamBoxScoreStats {
  /** Unique identifier for the team. */
  team_id: number;
  /** Team name. */
  team_name: string;
  /** Total points scored by the team. */
  score: number;
  /** Field goal percentage. */
  field_goal_pct: number;
  /** Three-point percentage. */
  three_point_pct: number;
  /** Free throw percentage. */
  free_throw_pct: number;
  /** Total rebounds. */
  rebounds_total: number;
  /** Total assists. */
  assists: number;
  /** Total steals. */
  steals: number;
  /** Total blocks. */
  blocks: number;
  /** Total turnovers. */
  turnovers: number;
  /** List of player stats. */
  players: PlayerBoxScoreStats[];
}

/**
 * Response schema for retrieving the box score of a game.
 */
export interface BoxScoreResponse {
  /** Unique identifier for the game (10-digit ID). */
  game_id: string;
  /** Game status, which can include 'Final', 'Scheduled', or 'Q3 2:50'. */
  status: string;
  /** Home team statistics. */
  home_team: TeamBoxScoreStats;
  /** Away team statistics. */
  away_team: TeamBoxScoreStats;
}

/**
 * Represents an NBA game with details on status, teams, and score.
 */
export interface LiveGame {
  /** Unique identifier for the game. */
  gameId: string;
  /** Current status of the game: 1 = Scheduled, 2 = In Progress, 3 = Final. */
  gameStatus: number;
  /** Text description of the game status ('Final', '4th Qtr'). */
  gameStatusText: string;
  /** Current period of the game (1-4 for quarters, 5+ for overtime). */
  period: number;
  /** Time remaining in the current period (MM:SS format). */
  gameClock?: string;
  /** Scheduled start time in UTC format. */
  gameTimeUTC: string;
  /** Information about the home team. */
  home_Team: Team;
  /** Information about the away team. */
  away_Team: Team;
  /** Top-performing players from each team. */
  gameLeaders?: GameLeaders;
}

/**
 * Represents the scoreboard for a specific game date.
 */
export interface Scoreboard {
  /** Date of the games in YYYY-MM-DD format. */
  gameDate: string;
  /** List of games played on the specified date. */
  games: LiveGame[];
}

/**
 * Represents a key moment detected in a game.
 */
export interface KeyMoment {
  /** Type of key moment (game_tying_shot, lead_change, scoring_run, clutch_play, big_shot). */
  type: string;
  /** Play-by-play event that triggered the moment. */
  play: any;
  /** ISO timestamp when moment was detected. */
  timestamp: string;
  /** AI-generated context explaining why the moment matters. */
  context?: string;
}

/**
 * Response schema for key moments.
 */
export interface KeyMomentsResponse {
  /** Game ID. */
  game_id: string;
  /** List of recent key moments. */
  moments: KeyMoment[];
}

/**
 * Represents win probability data for a game at a specific point in time.
 */
export interface WinProbability {
  /** Home team win probability (0.0-1.0). */
  home_win_prob: number;
  /** Away team win probability (0.0-1.0). */
  away_win_prob: number;
  /** ISO timestamp when probability was calculated. */
  timestamp: string;
  /** History of probability changes (last N plays). */
  probability_history?: any[];
}

/**
 * Response schema for win probability data.
 */
export interface WinProbabilityResponse {
  /** Game ID. */
  game_id: string;
  /** Current win probability data, or null if not available. */
  win_probability?: WinProbability;
}

/**
 * Response schema for retrieving live NBA scores.
 */
export interface ScoreboardResponse {
  /** Scoreboard data containing game details. */
  scoreboard: Scoreboard;
}

// Joi validation schemas
export const playByPlayEventSchema = Joi.object({
  action_number: Joi.number().integer().required(),
  clock: Joi.string().required(),
  period: Joi.number().integer().required(),
  team_id: Joi.number().integer().optional(),
  team_tricode: Joi.string().optional(),
  action_type: Joi.string().required(),
  description: Joi.string().required(),
  player_id: Joi.number().integer().optional(),
  player_name: Joi.string().optional(),
  score_home: Joi.string().optional(),
  score_away: Joi.string().optional(),
});

export const playByPlayResponseSchema = Joi.object({
  game_id: Joi.string().pattern(/^\d{10}$/).required(),
  plays: Joi.array().items(playByPlayEventSchema).required(),
});

export const teamSchema = Joi.object({
  teamId: Joi.number().integer().required(),
  teamName: Joi.string().allow('').required(),
  teamCity: Joi.string().allow('').required(),
  teamTricode: Joi.string().allow('').required(),
  wins: Joi.number().integer().optional(),
  losses: Joi.number().integer().optional(),
  score: Joi.number().integer().optional(),
  timeoutsRemaining: Joi.number().integer().optional(),
});

export const liveGameSchema = Joi.object({
  gameId: Joi.string().required(),
  gameStatus: Joi.number().integer().required(),
  gameStatusText: Joi.string().required(),
  period: Joi.number().integer().required(),
  gameClock: Joi.string().optional(),
  gameTimeUTC: Joi.string().required(),
  home_Team: teamSchema.required(),
  away_Team: teamSchema.required(),
  gameLeaders: Joi.object({
    homeLeaders: Joi.object().optional(),
    awayLeaders: Joi.object().optional(),
  }).optional(),
});

export const scoreboardSchema = Joi.object({
  gameDate: Joi.string().required(),
  games: Joi.array().items(liveGameSchema).required(),
});

export const scoreboardResponseSchema = Joi.object({
  scoreboard: scoreboardSchema.required(),
});

/**
 * Scoreboard response interface
 */
export interface ScoreboardResponse {
  scoreboard: {
    gameDate: string;
    games: LiveGame[];
  };
}