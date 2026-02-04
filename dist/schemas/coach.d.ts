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
export declare const coachSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=coach.d.ts.map