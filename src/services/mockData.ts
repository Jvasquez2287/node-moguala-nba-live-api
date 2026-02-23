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

import { random } from 'lodash';
import {
    PlayByPlayEvent,
    PlayByPlayResponse,
    Team,
    PlayerStats,
    GameLeaders,
    PlayerBoxScoreStats,
    TeamBoxScoreStats,
    BoxScoreResponse,
    LiveGame,
    Scoreboard,
    KeyMoment,
    KeyMomentsResponse,
    WinProbability,
    WinProbabilityResponse
} from '../schemas/scoreboard';
import { LiveGame as TypesLiveGame, Scoreboard as TypesScoreboard } from '../types';

// ============================================================================
// MOCK TEAMS DATA
// ============================================================================

export const mockTeams = {
    LAL: {
        teamId: 1610612747,
        teamName: 'Los Angeles Lakers',
        teamCity: 'Los Angeles',
        teamTricode: 'LAL',
        wins: 28,
        losses: 18
    },
    BOS: {
        teamId: 1610612738,
        teamName: 'Boston Celtics',
        teamCity: 'Boston',
        teamTricode: 'BOS',
        wins: 32,
        losses: 14
    },
    GSW: {
        teamId: 1610612744,
        teamName: 'Golden State Warriors',
        teamCity: 'Golden State',
        teamTricode: 'GSW',
        wins: 25,
        losses: 21
    },
    MIA: {
        teamId: 1610612748,
        teamName: 'Miami Heat',
        teamCity: 'Miami',
        teamTricode: 'MIA',
        wins: 24,
        losses: 22
    },
    NYK: {
        teamId: 1610612752,
        teamName: 'New York Knicks',
        teamCity: 'New York',
        teamTricode: 'NYK',
        wins: 27,
        losses: 19
    },
    DEN: {
        teamId: 1610612743,
        teamName: 'Denver Nuggets',
        teamCity: 'Denver',
        teamTricode: 'DEN',
        wins: 29,
        losses: 17
    }
};

// ============================================================================
// MOCK PLAYERS DATA
// ============================================================================

export const mockPlayers = {
    LAL: [
        {
            personId: 2544,
            name: 'LeBron James',
            jerseyNum: '23',
            position: 'F',
            teamTricode: 'LAL',
            points: 28,
            rebounds: 9,
            assists: 8
        },
        {
            personId: 203078,
            name: 'Anthony Davis',
            jerseyNum: '3',
            position: 'F',
            teamTricode: 'LAL',
            points: 24,
            rebounds: 12,
            assists: 2
        },
        {
            personId: 2738,
            name: 'Austin Reaves',
            jerseyNum: '15',
            position: 'G',
            teamTricode: 'LAL',
            points: 18,
            rebounds: 3,
            assists: 5
        }
    ],
    BOS: [
        {
            personId: 2544951,
            name: 'Jayson Tatum',
            jerseyNum: '0',
            position: 'F',
            teamTricode: 'BOS',
            points: 32,
            rebounds: 10,
            assists: 4
        },
        {
            personId: 2544952,
            name: 'Jaylen Brown',
            jerseyNum: '7',
            position: 'F',
            teamTricode: 'BOS',
            points: 26,
            rebounds: 8,
            assists: 3
        },
        {
            personId: 2544953,
            name: 'Derrick White',
            jerseyNum: '9',
            position: 'G',
            teamTricode: 'BOS',
            points: 14,
            rebounds: 4,
            assists: 6
        }
    ],
    GSW: [
        {
            personId: 201939,
            name: 'Stephen Curry',
            jerseyNum: '30',
            position: 'G',
            teamTricode: 'GSW',
            points: 31,
            rebounds: 4,
            assists: 9
        },
        {
            personId: 201950,
            name: 'Klay Thompson',
            jerseyNum: '11',
            position: 'G',
            teamTricode: 'GSW',
            points: 22,
            rebounds: 3,
            assists: 2
        },
        {
            personId: 201142,
            name: 'Draymond Green',
            jerseyNum: '23',
            position: 'F',
            teamTricode: 'GSW',
            points: 8,
            rebounds: 7,
            assists: 5
        }
    ]
};

// ============================================================================
// MOCK PLAY-BY-PLAY EVENTS
// ============================================================================

export const createMockPlayByPlay = (gameId: string): PlayByPlayResponse => {
    const plays: PlayByPlayEvent[] = [
        {
            action_number: 1,
            clock: '12:00',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'jumpball',
            description: 'LeBron James vs Jayson Tatum Jump Ball',
            score_home: '0',
            score_away: '0'
        },
        {
            action_number: 2,
            clock: '11:56',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'shot',
            description: 'Anthony Davis Makes Dunk',
            player_id: 203078,
            player_name: 'Anthony Davis',
            score_home: '0',
            score_away: '2'
        },
        {
            action_number: 3,
            clock: '11:43',
            period: 1,
            team_id: 1610612738,
            team_tricode: 'BOS',
            action_type: 'shot',
            description: 'Jayson Tatum Makes 3PT Shot',
            player_id: 2544951,
            player_name: 'Jayson Tatum',
            score_home: '3',
            score_away: '2'
        },
        {
            action_number: 4,
            clock: '11:20',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'shot',
            description: 'LeBron James Makes Shot',
            player_id: 2544,
            player_name: 'LeBron James',
            score_home: '3',
            score_away: '4'
        },
        {
            action_number: 5,
            clock: '10:58',
            period: 1,
            team_id: 1610612738,
            team_tricode: 'BOS',
            action_type: 'shot',
            description: 'Jaylen Brown Makes Layup',
            player_id: 2544952,
            player_name: 'Jaylen Brown',
            score_home: '5',
            score_away: '4'
        },
        {
            action_number: 6,
            clock: '10:35',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'turnover',
            description: 'Austin Reaves Turnover',
            player_id: 2738,
            player_name: 'Austin Reaves',
            score_home: '5',
            score_away: '4'
        },
        {
            action_number: 7,
            clock: '10:31',
            period: 1,
            team_id: 1610612738,
            team_tricode: 'BOS',
            action_type: 'shot',
            description: 'Derrick White Makes Layup',
            player_id: 2544953,
            player_name: 'Derrick White',
            score_home: '7',
            score_away: '4'
        },
        {
            action_number: 8,
            clock: '10:08',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'shot',
            description: 'Anthony Davis Makes Free Throw',
            player_id: 203078,
            player_name: 'Anthony Davis',
            score_home: '7',
            score_away: '5'
        },
        {
            action_number: 9,
            clock: '9:45',
            period: 1,
            team_id: 1610612738,
            team_tricode: 'BOS',
            action_type: 'foul',
            description: 'Jayson Tatum Defensive Foul',
            player_id: 2544951,
            player_name: 'Jayson Tatum',
            score_home: '7',
            score_away: '5'
        },
        {
            action_number: 10,
            clock: '9:22',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'shot',
            description: 'LeBron James Makes 3PT Shot',
            player_id: 2544,
            player_name: 'LeBron James',
            score_home: '7',
            score_away: '8'
        },
        {
            action_number: 11,
            clock: '8:55',
            period: 1,
            team_id: 1610612738,
            team_tricode: 'BOS',
            action_type: 'shot',
            description: 'Jaylen Brown Makes 3PT Shot',
            player_id: 2544952,
            player_name: 'Jaylen Brown',
            score_home: '10',
            score_away: '8'
        },
        {
            action_number: 12,
            clock: '8:30',
            period: 1,
            team_id: 1610612747,
            team_tricode: 'LAL',
            action_type: 'timeout',
            description: 'Lakers Timeout',
            score_home: '10',
            score_away: '8'
        }
    ];

    return {
        game_id: gameId,
        plays
    };
};

// ============================================================================
// MOCK BOX SCORE DATA
// ============================================================================

export const createMockBoxScore = (gameId: string): BoxScoreResponse => {
    const homeTeam: TeamBoxScoreStats = {
        team_id: 1610612738,
        team_name: 'Boston Celtics',
        score: 112,
        field_goal_pct: 0.456,
        three_point_pct: 0.385,
        free_throw_pct: 0.789,
        rebounds_total: 48,
        assists: 28,
        steals: 8,
        blocks: 5,
        turnovers: 14,
        players: [
            {
                player_id: 2544951,
                name: 'Jayson Tatum',
                position: 'F',
                minutes: '38:22',
                points: 32,
                rebounds: 10,
                assists: 4,
                steals: 2,
                blocks: 1,
                turnovers: 3
            },
            {
                player_id: 2544952,
                name: 'Jaylen Brown',
                position: 'F',
                minutes: '36:15',
                points: 26,
                rebounds: 8,
                assists: 3,
                steals: 1,
                blocks: 0,
                turnovers: 2
            },
            {
                player_id: 2544953,
                name: 'Derrick White',
                position: 'G',
                minutes: '28:45',
                points: 14,
                rebounds: 4,
                assists: 6,
                steals: 2,
                blocks: 1,
                turnovers: 1
            },
            {
                player_id: 203999,
                name: 'Al Horford',
                position: 'C',
                minutes: '24:30',
                points: 12,
                rebounds: 8,
                assists: 2,
                steals: 0,
                blocks: 2,
                turnovers: 1
            },
            {
                player_id: 2544954,
                name: 'Sam Hauser',
                position: 'F',
                minutes: '22:15',
                points: 10,
                rebounds: 3,
                assists: 1,
                steals: 1,
                blocks: 0,
                turnovers: 0
            }
        ]
    };

    const awayTeam: TeamBoxScoreStats = {
        team_id: 1610612747,
        team_name: 'Los Angeles Lakers',
        score: 108,
        field_goal_pct: 0.441,
        three_point_pct: 0.362,
        free_throw_pct: 0.756,
        rebounds_total: 45,
        assists: 26,
        steals: 6,
        blocks: 4,
        turnovers: 16,
        players: [
            {
                player_id: 2544,
                name: 'LeBron James',
                position: 'F',
                minutes: '39:18',
                points: 28,
                rebounds: 9,
                assists: 8,
                steals: 1,
                blocks: 1,
                turnovers: 4
            },
            {
                player_id: 203078,
                name: 'Anthony Davis',
                position: 'C',
                minutes: '36:25',
                points: 24,
                rebounds: 12,
                assists: 2,
                steals: 2,
                blocks: 2,
                turnovers: 2
            },
            {
                player_id: 2738,
                name: 'Austin Reaves',
                position: 'G',
                minutes: '32:40',
                points: 18,
                rebounds: 3,
                assists: 5,
                steals: 1,
                blocks: 0,
                turnovers: 3
            },
            {
                player_id: 2544955,
                name: 'Rui Hachimura',
                position: 'F',
                minutes: '26:35',
                points: 16,
                rebounds: 7,
                assists: 1,
                steals: 1,
                blocks: 0,
                turnovers: 2
            },
            {
                player_id: 2544956,
                name: 'D\'Angelo Russell',
                position: 'G',
                minutes: '24:12',
                points: 12,
                rebounds: 2,
                assists: 6,
                steals: 0,
                blocks: 0,
                turnovers: 3
            }
        ]
    };

    return {
        game_id: gameId,
        status: '4th Qtr 3:45',
        home_team: homeTeam,
        away_team: awayTeam
    };
};

// ============================================================================
// MOCK GAME LEADERS
// ============================================================================

export const createMockGameLeaders = (): GameLeaders => {
    return {
        homeLeaders: {
            personId: 2544951,
            name: 'Jayson Tatum',
            jerseyNum: '0',
            position: 'F',
            teamTricode: 'BOS',
            points: 32,
            rebounds: 10,
            assists: 4
        },
        awayLeaders: {
            personId: 2544,
            name: 'LeBron James',
            jerseyNum: '23',
            position: 'F',
            teamTricode: 'LAL',
            points: 28,
            rebounds: 9,
            assists: 8
        }
    };
};


export const createMockPeriods = (): Array<{ period: number; score: number }> => {
    return [
        { period: 1, score: random(8, 30) },
        { period: 2, score: random(8, 30) },
        { period: 3, score: random(8, 30) },
        { period: 4, score: random(8, 30) }
    ];
};

// ============================================================================
// MOCK LIVE GAMES
// ============================================================================

export const createMockLiveGames = (gameDate: string): TypesLiveGame[] => {
    return [
        {
            gameId: '0022500301',
            gameStatus: 2,
            gameStatusText: '4th Qtr 5:00',
            period: 4,
            gameClock: '5:00',
            gameTimeUTC: new Date().toISOString(),
            homeTeam: {
                ...mockTeams.BOS,
                score: 112,
                periods: createMockPeriods()
            } as Team,
            awayTeam: {
                ...mockTeams.LAL,
                score: 108,
                periods: createMockPeriods()
            } as Team,
            gameLeaders: createMockGameLeaders()
        },
        {
            gameId: '0022500302',
            gameStatus: 2,
            gameStatusText: '4th Qtr 7:00',
            period: 4,
            gameClock: '7:00',
            gameTimeUTC: new Date().toISOString(),
            homeTeam: {
                ...mockTeams.GSW,
                score: 98,
                periods: createMockPeriods()
            } as Team,
            awayTeam: {
                ...mockTeams.DEN,
                score: 95,
                periods: createMockPeriods()
            } as Team,
            gameLeaders: {
                homeLeaders: {
                    personId: 201939,
                    name: 'Stephen Curry',
                    jerseyNum: '30',
                    position: 'G',
                    teamTricode: 'GSW',
                    points: 31,
                    rebounds: 4,
                    assists: 9
                },
                awayLeaders: {
                    personId: 201950,
                    name: 'Jamal Murray',
                    jerseyNum: '27',
                    position: 'G',
                    teamTricode: 'DEN',
                    points: 28,
                    rebounds: 3,
                    assists: 7
                }
            }
        },
        {
            gameId: '0022500303',
            gameStatus: 2,
            gameStatusText: '4th Qtr 8:00',
            period: 4,
            gameClock: '8:00',
            gameTimeUTC: new Date().toISOString(),
            homeTeam: {
                ...mockTeams.NYK,
                score: 105,
                periods: createMockPeriods()
            } as Team,
            awayTeam: {
                ...mockTeams.MIA,
                score: 102,
                periods: createMockPeriods()
            } as Team,
            gameLeaders: {
                homeLeaders: {
                    personId: 2544950,
                    name: 'Jalen Brunson',
                    jerseyNum: '11',
                    position: 'G',
                    teamTricode: 'NYK',
                    points: 32,
                    rebounds: 3,
                    assists: 8
                },
                awayLeaders: {
                    personId: 2544951,
                    name: 'Jimmy Butler',
                    jerseyNum: '22',
                    position: 'F',
                    teamTricode: 'MIA',
                    points: 28,
                    rebounds: 7,
                    assists: 4
                }
            }
        }
    ];
};

// ============================================================================
// MOCK SCOREBOARD
// ============================================================================

export const createMockScoreboard = (): TypesScoreboard => {
    const gameDate = new Date().toISOString().split('T')[0];
    return {
        gameDate,
        games: createMockLiveGames(gameDate)
    };
};

// ============================================================================
// MOCK KEY MOMENTS
// ============================================================================

export const createMockKeyMoments = (gameId: string): KeyMomentsResponse => {
    const moments: KeyMoment[] = [
        {
            type: 'big_shot',
            play: {
                action_number: 45,
                clock: '2:34',
                period: 4,
                player_name: 'Jayson Tatum',
                action_type: 'shot',
                description: 'Jayson Tatum Makes 3PT Shot'
            },
            timestamp: new Date(Date.now() - 600000).toISOString(),
            context: 'Tatum hits crucial 3-pointer with 2:34 remaining in the 4th quarter to extend the Celtics lead'
        },
        {
            type: 'lead_change',
            play: {
                action_number: 38,
                clock: '4:12',
                period: 4,
                player_name: 'LeBron James',
                action_type: 'shot',
                description: 'LeBron James Makes Layup'
            },
            timestamp: new Date(Date.now() - 900000).toISOString(),
            context: 'Lakers take the lead 105-104 on LeBron\'s layup'
        },
        {
            type: 'scoring_run',
            play: {
                action_number: 32,
                clock: '5:45',
                period: 4,
                player_name: 'Multiple',
                action_type: 'sequence',
                description: 'Celtics Score on 4 Straight Possessions'
            },
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            context: 'Celtics go on 12-0 run to take control of the game in the 4th quarter'
        },
        {
            type: 'game_tying_shot',
            play: {
                action_number: 25,
                clock: '8:30',
                period: 4,
                player_name: 'Austin Reaves',
                action_type: 'shot',
                description: 'Austin Reaves Makes 3PT Shot'
            },
            timestamp: new Date(Date.now() - 1500000).toISOString(),
            context: 'Austin Reaves ties the game at 92-92 with a three-pointer'
        }
    ];

    return {
        game_id: gameId,
        moments
    };
};

// ============================================================================
// MOCK WIN PROBABILITY
// ============================================================================

export const createMockWinProbability = (gameId: string): WinProbabilityResponse => {
    return {
        game_id: gameId,
        win_probability: {
            home_win_prob: 0.658,
            away_win_prob: 0.342,
            timestamp: new Date().toISOString(),
            probability_history: [
                { timestamp: new Date(Date.now() - 300000).toISOString(), home: 0.624, away: 0.376 },
                { timestamp: new Date(Date.now() - 240000).toISOString(), home: 0.640, away: 0.360 },
                { timestamp: new Date(Date.now() - 180000).toISOString(), home: 0.648, away: 0.352 },
                { timestamp: new Date(Date.now() - 120000).toISOString(), home: 0.652, away: 0.348 },
                { timestamp: new Date(Date.now() - 60000).toISOString(), home: 0.655, away: 0.345 }
            ]
        }
    };
};

// ============================================================================
// EXPORT ALL MOCK DATA GENERATOR FUNCTIONS
// ============================================================================

export default {
    mockTeams,
    mockPlayers,
    createMockPlayByPlay,
    createMockBoxScore,
    createMockGameLeaders,
    createMockLiveGames,
    createMockScoreboard,
    createMockKeyMoments,
    createMockWinProbability
};
