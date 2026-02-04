import * as Joi from 'joi';

/**
 * Coach information
 */
export interface Coach {
  coach_id: number;
  name: string;
  role: string;
  is_assistant: boolean;
}

// Joi validation schema
export const coachSchema = Joi.object({
  coach_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  role: Joi.string().required(),
  is_assistant: Joi.boolean().required(),
});