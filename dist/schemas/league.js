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
exports.leagueLeadersResponseSchema = exports.leagueLeaderSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.leagueLeaderSchema = Joi.object({
    player_id: Joi.number().integer().required(),
    name: Joi.string().required(),
    team: Joi.string().required(),
    stat_value: Joi.number().required(),
    rank: Joi.number().integer().min(1).max(5).required(),
    games_played: Joi.number().integer().min(0).required(),
});
exports.leagueLeadersResponseSchema = Joi.object({
    category: Joi.string().valid('PTS', 'REB', 'AST', 'STL', 'BLK').required(),
    season: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    leaders: Joi.array().items(exports.leagueLeaderSchema).default([]),
});
//# sourceMappingURL=league.js.map