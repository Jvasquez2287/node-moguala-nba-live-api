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
exports.teamRosterSchema = exports.playerSchema = exports.teamDetailsResponseSchema = void 0;
const Joi = __importStar(require("joi"));
// Joi validation schemas
exports.teamDetailsResponseSchema = Joi.object({
    team_id: Joi.number().integer().required(),
    team_name: Joi.string().required(),
    team_city: Joi.string().required(),
    abbreviation: Joi.string().optional(),
    year_founded: Joi.number().integer().optional(),
    arena: Joi.string().optional(),
    arena_capacity: Joi.number().integer().optional(),
    owner: Joi.string().optional(),
    general_manager: Joi.string().optional(),
    head_coach: Joi.string().optional(),
});
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
});
exports.teamRosterSchema = Joi.object({
    team_id: Joi.number().integer().required(),
    team_name: Joi.string().required(),
    season: Joi.string().required(),
    players: Joi.array().items(exports.playerSchema).required(),
    coaches: Joi.array().items(Joi.any()).optional(), // Import Coach schema when available
});
//# sourceMappingURL=team.js.map