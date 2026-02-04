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
exports.scoreboardResponseSchema = exports.scoreboardSchema = exports.liveGameSchema = exports.teamSchema = exports.playByPlayResponseSchema = exports.playByPlayEventSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.playByPlayEventSchema = Joi.object({
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
exports.playByPlayResponseSchema = Joi.object({
    game_id: Joi.string().pattern(/^\d{10}$/).required(),
    plays: Joi.array().items(exports.playByPlayEventSchema).required(),
});
exports.teamSchema = Joi.object({
    teamId: Joi.number().integer().required(),
    teamName: Joi.string().allow('').required(),
    teamCity: Joi.string().allow('').required(),
    teamTricode: Joi.string().allow('').required(),
    wins: Joi.number().integer().optional(),
    losses: Joi.number().integer().optional(),
    score: Joi.number().integer().optional(),
    timeoutsRemaining: Joi.number().integer().optional(),
});
exports.liveGameSchema = Joi.object({
    gameId: Joi.string().required(),
    gameStatus: Joi.number().integer().required(),
    gameStatusText: Joi.string().required(),
    period: Joi.number().integer().required(),
    gameClock: Joi.string().optional(),
    gameTimeUTC: Joi.string().required(),
    home_Team: exports.teamSchema.required(),
    away_Team: exports.teamSchema.required(),
    gameLeaders: Joi.object({
        homeLeaders: Joi.object().optional(),
        awayLeaders: Joi.object().optional(),
    }).optional(),
});
exports.scoreboardSchema = Joi.object({
    gameDate: Joi.string().required(),
    games: Joi.array().items(exports.liveGameSchema).required(),
});
exports.scoreboardResponseSchema = Joi.object({
    scoreboard: exports.scoreboardSchema.required(),
});
//# sourceMappingURL=scoreboard.js.map