import * as Joi from 'joi';
/**
 * Insight about why the prediction was made
 */
export interface GamePredictionInsight {
    title: string;
    description: string;
    impact: string;
}
/**
 * Key factor driving the prediction
 */
export interface KeyDriver {
    factor: string;
    impact: string;
    magnitude: 'High' | 'Moderate' | 'Low';
}
/**
 * Risk or uncertainty factor that could affect the prediction
 */
export interface RiskFactor {
    factor: string;
    explanation: string;
}
/**
 * Prediction for a single game
 */
export interface GamePrediction {
    game_id: string;
    home_team_id: number;
    home_team_name: string;
    away_team_id: number;
    away_team_name: string;
    game_date: string;
    home_win_probability: number;
    away_win_probability: number;
    predicted_home_score: number;
    predicted_away_score: number;
    confidence: number;
    insights: GamePredictionInsight[];
    home_team_win_pct: number;
    away_team_win_pct: number;
    home_team_net_rating?: number;
    away_team_net_rating?: number;
    confidence_tier?: 'high' | 'medium' | 'low';
    confidence_explanation?: string;
    key_drivers?: KeyDriver[];
    risk_factors?: RiskFactor[];
    matchup_narrative?: string;
}
/**
 * Response for game predictions
 */
export interface PredictionsResponse {
    date: string;
    predictions: GamePrediction[];
    season: string;
}
export declare const gamePredictionInsightSchema: Joi.ObjectSchema<any>;
export declare const keyDriverSchema: Joi.ObjectSchema<any>;
export declare const riskFactorSchema: Joi.ObjectSchema<any>;
export declare const gamePredictionSchema: Joi.ObjectSchema<any>;
export declare const predictionsResponseSchema: Joi.ObjectSchema<any>;
//# sourceMappingURL=predictions.d.ts.map