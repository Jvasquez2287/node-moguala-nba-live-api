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
exports.teamPlayerStatsResponseSchema = exports.teamPlayerStatSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.teamPlayerStatSchema = Joi.object({
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
exports.teamPlayerStatsResponseSchema = Joi.object({
    team_id: Joi.number().integer().required(),
    season: Joi.string().required(),
    players: Joi.array().items(exports.teamPlayerStatSchema).required(),
});
//# sourceMappingURL=teamplayerstats.js.map