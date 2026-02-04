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
exports.teamGameLogResponseSchema = exports.teamGameLogEntrySchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.teamGameLogEntrySchema = Joi.object({
    game_id: Joi.string().required(),
    game_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    matchup: Joi.string().required(),
    win_loss: Joi.string().optional(),
    points: Joi.number().integer().min(0).default(0),
    rebounds: Joi.number().integer().min(0).default(0),
    assists: Joi.number().integer().min(0).default(0),
    field_goals_made: Joi.number().integer().min(0).optional(),
    field_goals_attempted: Joi.number().integer().min(0).optional(),
    field_goal_pct: Joi.number().min(0).max(1).optional(),
    three_pointers_made: Joi.number().integer().min(0).optional(),
    three_pointers_attempted: Joi.number().integer().min(0).optional(),
    three_point_pct: Joi.number().min(0).max(1).optional(),
    free_throws_made: Joi.number().integer().min(0).optional(),
    free_throws_attempted: Joi.number().integer().min(0).optional(),
    free_throw_pct: Joi.number().min(0).max(1).optional(),
    turnovers: Joi.number().integer().min(0).default(0),
    steals: Joi.number().integer().min(0).default(0),
    blocks: Joi.number().integer().min(0).default(0),
});
exports.teamGameLogResponseSchema = Joi.object({
    team_id: Joi.number().integer().required(),
    season: Joi.string().required(),
    games: Joi.array().items(exports.teamGameLogEntrySchema).required(),
});
//# sourceMappingURL=teamgamelog.js.map