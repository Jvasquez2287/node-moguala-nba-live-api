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
exports.playerSummarySchema = exports.playerGamePerformanceSchema = exports.teamRosterSchema = exports.coachSchema = exports.playerSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.playerSchema = Joi.object({
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
    team_id: Joi.number().integer().optional(),
    season: Joi.string().optional(),
});
exports.coachSchema = Joi.object({
    coach_id: Joi.number().integer().optional(),
    name: Joi.string().required(),
    type: Joi.string().required(),
    is_assistant: Joi.boolean().optional(),
});
exports.teamRosterSchema = Joi.object({
    team_id: Joi.number().integer().required(),
    team_name: Joi.string().required(),
    season: Joi.string().required(),
    players: Joi.array().items(exports.playerSchema).required(),
    coaches: Joi.array().items(exports.coachSchema).optional().default([]),
});
exports.playerGamePerformanceSchema = Joi.object({
    game_id: Joi.string().required(),
    date: Joi.string().required(),
    opponent_team_abbreviation: Joi.string().required(),
    points: Joi.number().integer().required(),
    rebounds: Joi.number().integer().required(),
    assists: Joi.number().integer().required(),
    steals: Joi.number().integer().required(),
    blocks: Joi.number().integer().required(),
});
exports.playerSummarySchema = Joi.object({
    PERSON_ID: Joi.number().integer().required(),
    PLAYER_LAST_NAME: Joi.string().required(),
    PLAYER_FIRST_NAME: Joi.string().required(),
    PLAYER_SLUG: Joi.string().optional(),
    TEAM_ID: Joi.number().integer().optional(),
    TEAM_SLUG: Joi.string().optional(),
    IS_DEFUNCT: Joi.number().integer().optional(),
    TEAM_CITY: Joi.string().optional(),
    TEAM_NAME: Joi.string().optional(),
    TEAM_ABBREVIATION: Joi.string().optional(),
    JERSEY_NUMBER: Joi.string().optional(),
    POSITION: Joi.string().optional(),
    HEIGHT: Joi.string().optional(),
    WEIGHT: Joi.number().integer().optional(),
    COLLEGE: Joi.string().optional(),
    COUNTRY: Joi.string().optional(),
    ROSTER_STATUS: Joi.string().optional(),
    PTS: Joi.number().optional(),
    REB: Joi.number().optional(),
    AST: Joi.number().optional(),
    STL: Joi.number().optional(),
    BLK: Joi.number().optional(),
    STATS_TIMEFRAME: Joi.string().optional(),
    FROM_YEAR: Joi.number().integer().optional(),
    TO_YEAR: Joi.number().integer().optional(),
    recent_games: Joi.array().items(exports.playerGamePerformanceSchema).optional().default([]),
});
//# sourceMappingURL=player.js.map