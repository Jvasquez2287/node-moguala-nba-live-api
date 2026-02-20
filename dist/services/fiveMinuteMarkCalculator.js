"use strict";
/**
 * Five Minute Mark Calculator
 *
 * Calculates NBA game betting predictions based on the 5-minute mark of the 3rd quarter.
 * Uses historical Q1-Q3 data to predict final game outcomes (OVER/UNDER).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiveMinuteMarkCalculator = exports.DoMath = void 0;
const axios_1 = __importDefault(require("axios"));
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
    static calculateThirdScore(periods) {
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
        return Math.round(xQs);
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
    static calculateAgainstFourScore(homeCalculated, visitorsCalculated, visitorsQ4, homeQ4) {
        const h = homeQ4;
        const v = visitorsQ4;
        let homeStatus = 'UNKNOW';
        let visitorStatus = 'UNKNOW';
        // Calculate overall difference from predicted score
        const visitorOverall = visitorsCalculated;
        const homeOverall = homeCalculated;
        // Determine home team status
        if (h >= homeCalculated) {
            if (h + 4 >= homeCalculated) {
                homeStatus = 'OVER';
            }
            else {
                homeStatus = 'UNKNOW';
            }
            if (h === homeCalculated) {
                homeStatus = 'UNKNOW';
            }
        }
        if (h <= homeCalculated) {
            if (h - 4 <= homeCalculated) {
                homeStatus = 'UNDER';
            }
            else {
                homeStatus = 'UNKNOW';
            }
            if (h === homeCalculated) {
                homeStatus = 'UNKNOW';
            }
        }
        console.log(`[DoMath] Home Q4: ${h}, Predicted Home Q4: ${homeCalculated}, Home Status: ${homeStatus}`);
        // Determine visitor team status
        if (v >= visitorsCalculated) {
            if (v + 4 >= visitorsCalculated) {
                visitorStatus = 'OVER';
            }
            else {
                visitorStatus = 'UNKNOW';
            }
            if (v === visitorsCalculated) {
                visitorStatus = 'UNKNOW';
            }
        }
        if (v <= visitorsCalculated) {
            if (v - 4 <= visitorsCalculated) {
                visitorStatus = 'UNDER';
            }
            else {
                visitorStatus = 'UNKNOW';
            }
            if (v === visitorsCalculated) {
                visitorStatus = 'UNKNOW';
            }
        }
        // Determine combined bet status and risk level
        let betStatus = 'UNKNOW';
        let riskLevel = 'HIGH';
        if (visitorStatus === 'UNDER' && homeStatus === 'UNDER') {
            betStatus = 'UNDER';
            riskLevel = 'MEDIUM';
        }
        else if (visitorStatus === 'OVER' && homeStatus === 'OVER') {
            betStatus = 'OVER';
            riskLevel = 'LOW';
        }
        else if ((visitorStatus === 'OVER' && homeStatus === 'UNDER') ||
            (visitorStatus === 'UNDER' && homeStatus === 'OVER')) {
            betStatus = 'UNKNOW';
            riskLevel = 'HIGH';
        }
        return {
            visitorOveral: visitorOverall,
            visitorStatus,
            homeOveral: homeOverall,
            homeStatus,
            riskLevel,
            status: betStatus,
        };
    }
}
exports.DoMath = DoMath;
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
    static calculateBetStatus(game) {
        const inValidResponse = () => ({
            visitorOveral: 0,
            homeOveral: 0,
            visitorStatus: 'UNKNOW',
            homeStatus: 'UNKNOW',
            riskLevel: 'UNKNOW',
            status: 'UNKNOW',
            showPrediction: false, // Show prediction at halftime
        });
        // Validate input
        if (!game || !game.homeTeam) {
            console.log(`[FiveMinuteMarkCalculator] Invalid game data for game ${game.gameId}`);
            return inValidResponse();
        }
        // Get away team - API returns either awayTeam or visitorTeam
        const awayTeam = game.awayTeam || game.visitorTeam;
        if (!awayTeam) {
            console.log(`[FiveMinuteMarkCalculator] No away team data available for game ${game.gameId}`);
            return inValidResponse();
        }
        const period = game.period;
        const gameClock = game.gameClock;
        // Only calculate betting status if we're in Q3 (period 3) or later
        if (period <= 3) {
            const clockParts = gameClock.split(':');
            const minutes = parseInt(clockParts[0]) || 0;
            if (period === 0) {
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} has not started yet, skipping prediction`);
                return inValidResponse();
            }
            else if (period === 1) {
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is in Q1, skipping prediction`);
                return inValidResponse();
            }
            else if (period === 2) {
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is in Q2, skipping prediction`);
                return inValidResponse();
            }
            else if (period === 3 && minutes < 5) {
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is in Q3 but before 5-minute mark, skipping prediction (Minutes: ${minutes})`);
                return inValidResponse();
            }
        }
        // Get team periods - handle both new schema (periods array) and other formats
        const homeTeamPeriods = game.homeTeam.periods || game.homeTeam.linescore;
        const awayTeamPeriods = awayTeam.periods || awayTeam.linescore;
        // If no periods data available, return unknown
        if (!homeTeamPeriods || !awayTeamPeriods) {
            console.log(`[FiveMinuteMarkCalculator] No periods data available for game ${game.gameId}`);
            return inValidResponse();
        }
        // Validate we have at least 3 periods of data
        const homePeriodArray = Array.isArray(homeTeamPeriods) ? homeTeamPeriods : [homeTeamPeriods];
        const awayPeriodArray = Array.isArray(awayTeamPeriods) ? awayTeamPeriods : [awayTeamPeriods];
        if (homePeriodArray.length < 3 || awayPeriodArray.length < 3) {
            console.log(`[FiveMinuteMarkCalculator] Not enough period data for game ${game.gameId} (Home periods: ${homePeriodArray.length}, Away periods: ${awayPeriodArray.length})`);
            return inValidResponse();
        }
        // Calculate predicted points for both teams based on first 3 quarters
        const homeCalculated = DoMath.calculateThirdScore(homePeriodArray);
        const awayCalculated = DoMath.calculateThirdScore(awayPeriodArray);
        // Skip halftime processing
        if (game.gameStatusText && game.gameStatusText.toLowerCase().includes('halftime')) {
            console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is at halftime, skipping prediction`);
            return inValidResponse();
        }
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
                        console.log(`[FiveMinuteMarkCalculator] Q4 score data is missing for game ${game.gameId}`);
                        return inValidResponse();
                    }
                    // Calculate betting prediction
                    const prediction = DoMath.calculateAgainstFourScore(homeCalculated, awayCalculated, awayQ4, homeQ4);
                    return {
                        ...prediction,
                        showPrediction: true
                    };
                }
                else {
                    // Q4 not yet available
                    console.log(`[FiveMinuteMarkCalculator] Q4 not yet available for game ${game.gameId}`);
                    return inValidResponse();
                }
            }
            else {
                // Not enough data for prediction
                console.log(`[FiveMinuteMarkCalculator] Not at 5-minute mark of Q3 yet for game ${game.gameId} (Minutes: ${minutes})`);
                return inValidResponse();
            }
        }
        else {
            // Before 5-minute mark of Q3
            console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is before 5-minute mark of Q3, skipping prediction`);
            return inValidResponse();
        }
    }
    /**
     * Process all games and calculate betting predictions
     *
     * @param games Array of game objects from NBA API
     * @returns Array of games with betPrediction added to each game
     */
    static gamesFormulaNBA_All(games) {
        // Validate input
        if (!Array.isArray(games) || games.length === 0) {
            return [];
        }
        // Process each game
        return games.map((game) => {
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
    static async getCurrentGamesFromAPI() {
        try {
            // Fetch from NBA API for today's scoreboard
            const response = await axios_1.default.get(`https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`, { timeout: 10000 });
            // Extract the scoreboard data
            const scoreboardData = response.data.scoreboard || {};
            const games = scoreboardData.games || [];
            // Process each game and calculate betting predictions
            const processedGames = games.map((game) => {
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
        }
        catch (error) {
            console.error(`[FiveMinuteMarkCalculator] Error fetching games:`, error instanceof Error ? error.message : String(error));
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                games: []
            };
        }
    }
}
exports.FiveMinuteMarkCalculator = FiveMinuteMarkCalculator;
// Export as singleton service
exports.default = FiveMinuteMarkCalculator;
//# sourceMappingURL=fiveMinuteMarkCalculator.js.map