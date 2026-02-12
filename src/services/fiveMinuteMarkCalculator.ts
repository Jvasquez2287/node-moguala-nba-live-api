/**
 * Five Minute Mark Calculator
 * 
 * Calculates NBA game betting predictions based on the 5-minute mark of the 3rd quarter.
 * Uses historical Q1-Q3 data to predict final game outcomes (OVER/UNDER).
 */

import axios from 'axios';

// Type definitions

interface Period {
    period: number;
    periodType: string;
    score: number;
}

interface TeamData {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    wins: number;
    losses: number;
    score: number;
    seed: number | null;
    inBonus: boolean | null;
    timeoutsRemaining: number;
    periods: Period[];
}

interface GameHeader {
    gameId: string;
    gameCode: string;
    gameStatus: number;
    gameStatusText: string;
    period: number;
    gameClock: string;
    gameTimeUTC: string;
    gameEt: string;
    regulationPeriods: number;
    ifNecessary: boolean;
    seriesGameNumber: string;
    gameLabel: string;
    gameSubLabel: string;
    seriesText: string;
    seriesConference: string;
    poRoundDesc: string;
    gameSubtype: string;
    isNeutral: boolean;
    homeTeam: TeamData;
    awayTeam?: TeamData;
    visitorTeam?: TeamData;
}

interface BetPrediction {
    visitorOveral: number;
    homeOveral: number;
    riskLevel: 'HIGH' | 'LOW' | 'MEDIUM' | 'UNKNOW';
    status: 'OVER' | 'UNDER' | 'UNKNOW';
}

 

 /**
 * DoMath utility class
 * Performs calculations for game predictions
 */
class DoMath {
    /**
     * Calculate prediction score based on first 3 quarters
     * Formula: ((Q1 + Q2 + Q3) / 3 / 12) * 7
     * 
     * @param periods Array of period objects/scores from NBA API
     * @returns Predicted score for the 4th quarter
     */
    static calculateThirdScore(periods: any[]): number {
        if (!Array.isArray(periods) || periods.length < 3) {
            return 0;
        }

        // Extract scores from periods - handle both Period objects and numeric scores
        const scoreQ1 = typeof periods[0] === 'object' ? periods[0].score : periods[0];
        const scoreQ2 = typeof periods[1] === 'object' ? periods[1].score : periods[1];
        const scoreQ3 = typeof periods[2] === 'object' ? periods[2].score : periods[2];

        // Handle undefined/null values
        const q1 = scoreQ1 ?? 0;
        const q2 = scoreQ2 ?? 0;
        const q3 = scoreQ3 ?? 0;

        const sumQs = q1 + q2 + q3;
        const divQs = sumQs / 3;
        const div2Qs = divQs / 12;
        const xQs = div2Qs * 7;

        return xQs;
    }

    /**
     * Calculate betting status (OVER/UNDER) based on predicted vs actual Q4 score
     * 
     * Compares the predicted score (based on Q1-Q3 average) with the actual Q4 score
     * Returns OVER if Q4 > predicted, UNDER if Q4 < predicted, UNKNOW if ambiguous
     * 
     * @param homeCalculated Predicted home team Q4 score
     * @param visitorsCalculated Predicted visitor team Q4 score
     * @param visitorsQ4 Actual visitor team Q4 score
     * @param homeQ4 Actual home team Q4 score
     * @returns BetPrediction object with status and risk level
     */
    static calculateAgainstFourScore(
        homeCalculated: number,
        visitorsCalculated: number,
        visitorsQ4: number,
        homeQ4: number
    ): BetPrediction {
        const h = homeQ4;
        const v = visitorsQ4;
        let homeStatus: 'OVER' | 'UNDER' | 'UNKNOW' = 'UNKNOW';
        let visitorStatus: 'OVER' | 'UNDER' | 'UNKNOW' = 'UNKNOW';

        // Calculate overall difference from predicted score
        const visitorOverall = homeQ4 - h;
        const homeOverall = visitorsQ4 - v;

        // Determine home team status
        if (h >= homeCalculated) {
            if (h + 4 >= homeCalculated) {
                homeStatus = 'OVER';
            } else {
                homeStatus = 'UNKNOW';
            }
            if (h === homeCalculated) {
                homeStatus = 'UNKNOW';
            }
        }
        if (h <= homeCalculated) {
            if (h - 4 <= homeCalculated) {
                homeStatus = 'UNDER';
            } else {
                homeStatus = 'UNKNOW';
            }
            if (h === homeCalculated) {
                homeStatus = 'UNKNOW';
            }
        }

        // Determine visitor team status
        if (v >= visitorsCalculated) {
            if (v + 4 >= visitorsCalculated) {
                visitorStatus = 'OVER';
            } else {
                visitorStatus = 'UNKNOW';
            }
            if (v === visitorsCalculated) {
                visitorStatus = 'UNKNOW';
            }
        }
        if (v <= visitorsCalculated) {
            if (v - 4 <= visitorsCalculated) {
                visitorStatus = 'UNDER';
            } else {
                visitorStatus = 'UNKNOW';
            }
            if (v === visitorsCalculated) {
                visitorStatus = 'UNKNOW';
            }
        }

        // Determine combined bet status and risk level
        let betStatus: 'OVER' | 'UNDER' | 'UNKNOW' = 'UNKNOW';
        let riskLevel: 'HIGH' | 'LOW' | 'MEDIUM' = 'HIGH';

        if (visitorStatus === 'UNDER' && homeStatus === 'UNDER') {
            betStatus = 'UNDER';
            riskLevel = 'MEDIUM';
        } else if (visitorStatus === 'OVER' && homeStatus === 'OVER') {
            betStatus = 'OVER';
            riskLevel = 'LOW';
        } else if (
            (visitorStatus === 'OVER' && homeStatus === 'UNDER') ||
            (visitorStatus === 'UNDER' && homeStatus === 'OVER')
        ) {
            betStatus = 'UNKNOW';
            riskLevel = 'HIGH';
        }

        return {
            visitorOveral: visitorOverall,
            homeOveral: homeOverall,
            riskLevel,
            status: betStatus,
        };
    }
}

/**
 * Five Minute Mark Calculator Service
 * Processes NBA games and calculates betting predictions at the 5-minute mark of Q3
 */
class FiveMinuteMarkCalculator {
    /**
     * Calculate betting prediction for a single game
     * 
     * This function:
     * 1. Validates that game data exists and has proper team data
     * 2. Calculates predicted scores based on Q1-Q3 performance
     * 3. At the 5-minute mark of Q3 (or later), compares Q4 score to prediction
     * 4. Assigns OVER/UNDER betting status based on the comparison
     * 
     * @param game Single game object from NBA API (can be any game format with team and period data)
     * @returns BetPrediction with status and risk level
     */
    static calculateBetStatus(game: any): BetPrediction {
        // Validate input
        if (!game || !game.homeTeam) {
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }

        // Get away team - API returns either awayTeam or visitorTeam
        const awayTeam = game.awayTeam || game.visitorTeam;
        if (!awayTeam) {
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }

        // Get team periods - handle both new schema (periods array) and other formats
        const homeTeamPeriods = game.homeTeam.periods || game.homeTeam.linescore;
        const awayTeamPeriods = awayTeam.periods || awayTeam.linescore;

        // If no periods data available, return unknown
        if (!homeTeamPeriods || !awayTeamPeriods) {
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }

        // Validate we have at least 3 periods of data
        const homePeriodArray = Array.isArray(homeTeamPeriods) ? homeTeamPeriods : [homeTeamPeriods];
        const awayPeriodArray = Array.isArray(awayTeamPeriods) ? awayTeamPeriods : [awayTeamPeriods];

        if (homePeriodArray.length < 3 || awayPeriodArray.length < 3) {
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }

        // Calculate predicted points for both teams based on first 3 quarters
        const homeCalculated = DoMath.calculateThirdScore(homePeriodArray as Period[]);
        const awayCalculated = DoMath.calculateThirdScore(awayPeriodArray as Period[]);

        // Skip halftime processing
        if (game.gameStatusText && game.gameStatusText.toLowerCase().includes('halftime')) {
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }

        // Get current game time and period
        const period = game.period;
        const gameClock = game.gameClock;

        // Only calculate betting status if we're in Q3 (period 3) or later
        if (period >= 3 && gameClock) {
            // Parse game clock "mm:ss" format to get minutes
            const clockParts = gameClock.split(':');
            const minutes = parseInt(clockParts[0]) || 0;

            // Check if we've passed the 5-minute mark and have valid Q3 data
            if (minutes <= 5 && homePeriodArray[2] && awayPeriodArray[2]) {
                // Q3 scores exist, now check Q4
                if (homePeriodArray.length > 3 && awayPeriodArray.length > 3) {
                    // Get Q4 scores
                    const homeQ4Period = homePeriodArray[3];
                    const awayQ4Period = awayPeriodArray[3];
                    
                    // Handle both Period objects and numeric scores
                    const homeQ4 = typeof homeQ4Period === 'object' ? homeQ4Period.score : homeQ4Period;
                    const awayQ4 = typeof awayQ4Period === 'object' ? awayQ4Period.score : awayQ4Period;

                    if (homeQ4 === undefined || awayQ4 === undefined) {
                        return {
                            visitorOveral: 0,
                            homeOveral: 0,
                            riskLevel: 'UNKNOW',
                            status: 'UNKNOW',
                        };
                    }

                    // Calculate betting prediction
                    const prediction = DoMath.calculateAgainstFourScore(
                        homeCalculated,
                        awayCalculated,
                        awayQ4,
                        homeQ4
                    );

                    return prediction;
                } else {
                    // Q4 not yet available
                    return {
                        visitorOveral: 0,
                        homeOveral: 0,
                        riskLevel: 'UNKNOW',
                        status: 'UNKNOW',
                    };
                }
            } else {
                // Not enough data for prediction
                return {
                    visitorOveral: 0,
                    homeOveral: 0,
                    riskLevel: 'UNKNOW',
                    status: 'UNKNOW',
                };
            }
        } else {
            // Before 5-minute mark of Q3
            return {
                visitorOveral: 0,
                homeOveral: 0,
                riskLevel: 'UNKNOW',
                status: 'UNKNOW',
            };
        }
    }

    /**
     * Process all games and calculate betting predictions
     * 
     * @param games Array of game objects from NBA API
     * @returns Array of games with betPrediction added to each game
     */
    static gamesFormulaNBA_All(games: any[]): any[] {
        // Validate input
        if (!Array.isArray(games) || games.length === 0) {
            return [];
        }

        // Process each game
        return games.map((game: any) => {
            const betPrediction = FiveMinuteMarkCalculator.calculateBetStatus(game);
            return {
                ...game,
                betPrediction
            };
        });
    }


    /**
     * Fetch games from the NBA API for today and calculate betting predictions
     * 
     * @returns Game data with calculated betting predictions
     */
    static async getCurrentGamesFromAPI(): Promise<any> {
        try {
            // Fetch from NBA API for today's scoreboard
            const response = await axios.get(
                `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`,
                { timeout: 10000 }
            );

            // Extract the scoreboard data
            const scoreboardData = response.data.scoreboard || {};
            const games = scoreboardData.games || [];

            // Process each game and calculate betting predictions
            const processedGames = games.map((game: any) => {
                const betPrediction = FiveMinuteMarkCalculator.calculateBetStatus(game);
                return {
                    ...game,
                    betPrediction
                };
            });

            return {
                success: true,
                timestamp: new Date().toISOString(),
                gameCount: processedGames.length,
                games: processedGames
            };
        } catch (error) {
            console.error(`[FiveMinuteMarkCalculator] Error fetching games:`,
                error instanceof Error ? error.message : String(error));

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                games: []
            };
        }
    }
}

// Export as singleton service
export default FiveMinuteMarkCalculator;
export { DoMath, FiveMinuteMarkCalculator };

