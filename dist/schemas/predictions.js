"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionsResponseSchema = exports.gamePredictionSchema = exports.riskFactorSchema = exports.keyDriverSchema = exports.gamePredictionInsightSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.gamePredictionInsightSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    impact: Joi.string().required(),
});
exports.keyDriverSchema = Joi.object({
    factor: Joi.string().required(),
    impact: Joi.string().required(),
    magnitude: Joi.string().valid('High', 'Moderate', 'Low').required(),
});
exports.riskFactorSchema = Joi.object({
    factor: Joi.string().required(),
    explanation: Joi.string().required(),
});
exports.gamePredictionSchema = Joi.object({
    game_id: Joi.string().required(),
    home_team_id: Joi.number().integer().required(),
    home_team_name: Joi.string().required(),
    away_team_id: Joi.number().integer().required(),
    away_team_name: Joi.string().required(),
    game_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    // Predictions
    home_win_probability: Joi.number().min(0).max(1).required(),
    away_win_probability: Joi.number().min(0).max(1).required(),
    predicted_home_score: Joi.number().min(0).required(),
    predicted_away_score: Joi.number().min(0).required(),
    confidence: Joi.number().min(0).max(1).required(),
    // Insights
    insights: Joi.array().items(exports.gamePredictionInsightSchema).default([]),
    // Team stats used for prediction
    home_team_win_pct: Joi.number().min(0).max(1).required(),
    away_team_win_pct: Joi.number().min(0).max(1).required(),
    home_team_net_rating: Joi.number().optional(),
    away_team_net_rating: Joi.number().optional(),
    // Enhanced AI analysis
    confidence_tier: Joi.string().valid('high', 'medium', 'low').optional(),
    confidence_explanation: Joi.string().optional(),
    key_drivers: Joi.array().items(exports.keyDriverSchema).optional(),
    risk_factors: Joi.array().items(exports.riskFactorSchema).optional(),
    matchup_narrative: Joi.string().optional(),
});
exports.predictionsResponseSchema = Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    predictions: Joi.array().items(exports.gamePredictionSchema).required(),
    season: Joi.string().required(),
});
//# sourceMappingURL=predictions.js.map