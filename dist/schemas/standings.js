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
exports.standingsResponseSchema = exports.standingRecordSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.standingRecordSchema = Joi.object({
    season_id: Joi.string().required(),
    team_id: Joi.number().integer().required(),
    team_city: Joi.string().required(),
    team_name: Joi.string().required(),
    conference: Joi.string().valid('East', 'West').required(),
    division: Joi.string().required(),
    // Performance
    wins: Joi.number().integer().min(0).required(),
    losses: Joi.number().integer().min(0).required(),
    win_pct: Joi.number().min(0).max(1).required(),
    // Rankings
    playoff_rank: Joi.number().integer().min(1).required(),
    // Records
    home_record: Joi.string().required(),
    road_record: Joi.string().required(),
    conference_record: Joi.string().required(),
    division_record: Joi.string().required(),
    l10_record: Joi.string().required(),
    // Streak & GB
    current_streak: Joi.number().integer().required(),
    current_streak_str: Joi.string().required(),
    games_back: Joi.string().required(),
    // Offense/Defense stats
    ppg: Joi.number().optional(),
    opp_ppg: Joi.number().optional(),
    diff: Joi.number().optional(),
});
exports.standingsResponseSchema = Joi.object({
    standings: Joi.array().items(exports.standingRecordSchema).required(),
});
//# sourceMappingURL=standings.js.map