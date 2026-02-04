import * as Joi from 'joi';
import { Coach } from './coach';

/**
 * Team details response
 */
export interface TeamDetailsResponse {
  team_id: number;
  team_name: string;
  team_city: string;
  abbreviation?: string;
  year_founded?: number;
  arena?: string;
  arena_capacity?: number;
  owner?: string;
  general_manager?: string;
  head_coach?: string;
}

/**
 * Player information for roster
 */
export interface Player {
  player_id: number;
  name: string;
  jersey_number?: string;
  position?: string;
  height?: string;
  weight?: number;
  birth_date?: string;
  age?: number;
  experience?: string;
  school?: string;
}

/**
 * Team roster response
 */
export interface TeamRoster {
  team_id: number;
  team_name: string;
  season: string;
  players: Player[];
  coaches?: Coach[];
}

// Joi validation schemas
export const teamDetailsResponseSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  team_name: Joi.string().required(),
  team_city: Joi.string().required(),
  abbreviation: Joi.string().optional(),
  year_founded: Joi.number().integer().optional(),
  arena: Joi.string().optional(),
  arena_capacity: Joi.number().integer().optional(),
  owner: Joi.string().optional(),
  general_manager: Joi.string().optional(),
  head_coach: Joi.string().optional(),
});

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
});

export const teamRosterSchema = Joi.object({
  team_id: Joi.number().integer().required(),
  team_name: Joi.string().required(),
  season: Joi.string().required(),
  players: Joi.array().items(playerSchema).required(),
  coaches: Joi.array().items(Joi.any()).optional(), // Import Coach schema when available
});