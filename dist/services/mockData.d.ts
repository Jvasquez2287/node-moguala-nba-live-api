/**
 * Mock NBA Game Data Service
 *
 * This module provides realistic mock data for NBA games, including:
 * - Team information and statistics
 * - Player data and stats
 * - Play-by-play events
 * - Live game scoreboard data
 * - Box scores with player and team statistics
 * - Game leaders (top performers)
 * - Key moments in games
 * - Win probability calculations
 *
 * Usage:
 * - Use createMockScoreboard() to get today's scoreboard with live games
 * - Use createMockPlayByPlay(gameId) to get play-by-play events for a specific game
 * - Use createMockBoxScore(gameId) to get detailed box scores
 * - Use createMockKeyMoments(gameId) to get significant game moments
 * - Use createMockWinProbability(gameId) to get win probability data
 *
 * These mock functions are used as fallback data when the NBA API is unavailable.
 * They provide realistic data structures that match the actual API responses.
 */
import { PlayByPlayResponse, GameLeaders, BoxScoreResponse, KeyMomentsResponse, WinProbabilityResponse } from '../schemas/scoreboard';
import { LiveGame as TypesLiveGame, Scoreboard as TypesScoreboard } from '../types';
export declare const mockTeams: {
    LAL: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    BOS: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    GSW: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    MIA: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    NYK: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    DEN: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    PHI: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    DAL: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    NOP: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    MIL: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    CHI: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    MEM: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    CLE: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    HOU: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
    SAS: {
        teamId: number;
        teamName: string;
        teamCity: string;
        teamTricode: string;
        wins: number;
        losses: number;
    };
};
export declare const mockPlayers: {
    LAL: {
        personId: number;
        name: string;
        jerseyNum: string;
        position: string;
        teamTricode: string;
        points: number;
        rebounds: number;
        assists: number;
    }[];
    BOS: {
        personId: number;
        name: string;
        jerseyNum: string;
        position: string;
        teamTricode: string;
        points: number;
        rebounds: number;
        assists: number;
    }[];
    GSW: {
        personId: number;
        name: string;
        jerseyNum: string;
        position: string;
        teamTricode: string;
        points: number;
        rebounds: number;
        assists: number;
    }[];
};
export declare const createMockPlayByPlay: (gameId: string) => PlayByPlayResponse;
export declare const createMockBoxScore: (gameId: string) => BoxScoreResponse;
export declare const createMockGameLeaders: () => GameLeaders;
export declare const createMockPeriods: () => Array<{
    period: number;
    score: number;
}>;
export declare const createMockLiveGames: (gameDate: string) => TypesLiveGame[];
export declare const createMockScoreboard: () => TypesScoreboard;
export declare const createMockKeyMoments: (gameId: string) => KeyMomentsResponse;
export declare const createMockWinProbability: (gameId: string) => WinProbabilityResponse;
declare const _default: {
    mockTeams: {
        LAL: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        BOS: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        GSW: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        MIA: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        NYK: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        DEN: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        PHI: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        DAL: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        NOP: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        MIL: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        CHI: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        MEM: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        CLE: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        HOU: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
        SAS: {
            teamId: number;
            teamName: string;
            teamCity: string;
            teamTricode: string;
            wins: number;
            losses: number;
        };
    };
    mockPlayers: {
        LAL: {
            personId: number;
            name: string;
            jerseyNum: string;
            position: string;
            teamTricode: string;
            points: number;
            rebounds: number;
            assists: number;
        }[];
        BOS: {
            personId: number;
            name: string;
            jerseyNum: string;
            position: string;
            teamTricode: string;
            points: number;
            rebounds: number;
            assists: number;
        }[];
        GSW: {
            personId: number;
            name: string;
            jerseyNum: string;
            position: string;
            teamTricode: string;
            points: number;
            rebounds: number;
            assists: number;
        }[];
    };
    createMockPlayByPlay: (gameId: string) => PlayByPlayResponse;
    createMockBoxScore: (gameId: string) => BoxScoreResponse;
    createMockGameLeaders: () => GameLeaders;
    createMockLiveGames: (gameDate: string) => TypesLiveGame[];
    createMockScoreboard: () => TypesScoreboard;
    createMockKeyMoments: (gameId: string) => KeyMomentsResponse;
    createMockWinProbability: (gameId: string) => WinProbabilityResponse;
};
export default _default;
//# sourceMappingURL=mockData.d.ts.map