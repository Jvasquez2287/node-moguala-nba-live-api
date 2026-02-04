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
exports.gamesResponseSchema = exports.gameSummarySchema = exports.gameLeadersSchema = exports.gameLeaderSchema = exports.topScorerSchema = exports.teamSummarySchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.teamSummarySchema = Joi.object({
    team_id: Joi.number().integer().required(),
    team_abbreviation: Joi.string().required(),
    points: Joi.number().integer().allow(null).optional(),
});
exports.topScorerSchema = Joi.object({
    player_id: Joi.number().integer().required(),
    player_name: Joi.string().required(),
    team_id: Joi.number().integer().required(),
    points: Joi.number().integer().required(),
    rebounds: Joi.number().integer().required(),
    assists: Joi.number().integer().required(),
});
exports.gameLeaderSchema = Joi.object({
    personId: Joi.number().integer().required(),
    name: Joi.string().required(),
    jerseyNum: Joi.string().optional(),
    position: Joi.string().optional(),
    teamTricode: Joi.string().optional(),
    points: Joi.number().required(),
    rebounds: Joi.number().required(),
    assists: Joi.number().required(),
});
exports.gameLeadersSchema = Joi.object({
    homeLeaders: exports.gameLeaderSchema.optional(),
    awayLeaders: exports.gameLeaderSchema.optional(),
});
exports.gameSummarySchema = Joi.object({
    game_id: Joi.string().required(),
    game_date: Joi.string().required(),
    game_time_utc: Joi.string().allow(null).optional(),
    matchup: Joi.string().required(),
    game_status: Joi.string().required(),
    arena: Joi.string().allow(null).optional(),
    home_team: exports.teamSummarySchema.required(),
    away_team: exports.teamSummarySchema.required(),
    top_scorer: exports.topScorerSchema.optional(),
    gameLeaders: exports.gameLeadersSchema.optional(),
    win_probability: Joi.number().min(0).max(1).optional(),
});
exports.gamesResponseSchema = Joi.object({
    date: Joi.string().required(),
    games: Joi.array().items(exports.gameSummarySchema).required(),
});
//# sourceMappingURL=schedule.js.map