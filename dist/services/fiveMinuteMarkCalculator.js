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
const expoNotificationSystem_1 = __importDefault(require("./expoNotificationSystem"));
// Cache for checkAtSevenMinuteMark results - persists for 2 hours
const checkAtSevenMinuteMarkCache = new Map();
const CACHE_TTL_2HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
/**
 * Get cached result for checkAtSevenMinuteMark
 * Returns null if cache miss or entry expired
 */
function getCheckAtSevenMinuteMarkCache(cacheKey) {
    const entry = checkAtSevenMinuteMarkCache.get(cacheKey);
    if (!entry) {
        return null;
    }
    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_2HOURS) {
        checkAtSevenMinuteMarkCache.delete(cacheKey);
        console.log(`[FiveMinuteMarkCalculator] Cache entry expired for key: ${cacheKey}`);
        return null;
    }
    console.log(`[FiveMinuteMarkCalculator] Cache HIT for key: ${cacheKey}, result: ${entry.result}`);
    return entry.result;
}
/**
 * Store result in checkAtSevenMinuteMark cache
 */
function setCheckAtSevenMinuteMarkCache(cacheKey, teamId, result) {
    checkAtSevenMinuteMarkCache.set(cacheKey, {
        teamId,
        result,
        timestamp: Date.now()
    });
    console.log(`[FiveMinuteMarkCalculator] Cache stored for key: ${cacheKey}, teamId: ${teamId}, result: ${result}`);
}
/**
 * Create cache key from team data
 */
function createCheckAtSevenMinuteMarkCacheKey(homeTeamId, awayTeamId, gameId) {
    return `check_7min_${gameId}_${homeTeamId}_${awayTeamId}`;
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
    static checkAtSevenMinuteMark(homeQ4, awayQ4, homePeriodArray, awayPeriodArray, homeTeamId, awayTeamId, gameId) {
        // Create cache key if team IDs and game ID provided
        let cacheKey = null;
        if (homeTeamId && awayTeamId && gameId) {
            cacheKey = createCheckAtSevenMinuteMarkCacheKey(homeTeamId, awayTeamId, gameId);
            // Check cache first
            const cachedResult = getCheckAtSevenMinuteMarkCache(cacheKey);
            if (cachedResult !== null) {
                return cachedResult;
            }
        }
        // Criterion 7.3: Check for inconsistent scoring patterns in Q4
        // Calculate average of Q1-Q3 for both teams
        const homeQ1 = typeof homePeriodArray[0] === 'object' ? homePeriodArray[0].score : homePeriodArray[0];
        const homeQ2 = typeof homePeriodArray[1] === 'object' ? homePeriodArray[1].score : homePeriodArray[1];
        const homeQ3 = typeof homePeriodArray[2] === 'object' ? homePeriodArray[2].score : homePeriodArray[2];
        const homeAverage = (homeQ1 + homeQ2 + homeQ3) / 3;
        const awayQ1 = typeof awayPeriodArray[0] === 'object' ? awayPeriodArray[0].score : awayPeriodArray[0];
        const awayQ2 = typeof awayPeriodArray[1] === 'object' ? awayPeriodArray[1].score : awayPeriodArray[1];
        const awayQ3 = typeof awayPeriodArray[2] === 'object' ? awayPeriodArray[2].score : awayPeriodArray[2];
        const awayAverage = (awayQ1 + awayQ2 + awayQ3) / 3;
        // Check if Q4 scoring is inconsistent with Q1-Q3 trend
        // If a team is scoring significantly faster than their average, it breaks consistency
        const homeQ4Pace = homeQ4 / (5 / 12); // Adjust for 5 minutes out of 12
        const awayQ4Pace = awayQ4 / (5 / 12);
        // If Q4 pace at 5-minute mark differs by more than 50% from average, it's inconsistent
        const homeInconsistency = Math.abs(homeQ4Pace - homeAverage) / homeAverage;
        const awayInconsistency = Math.abs(awayQ4Pace - awayAverage) / awayAverage;
        // Determine result
        let result = true;
        // Log inconsistency metrics for debugging
        if (homeInconsistency > 0.5 || awayInconsistency > 0.5) {
            console.log(`[FiveMinuteMarkCalculator] Prediction rejected (7.3): Inconsistent scoring pattern - Home inconsistency: ${(homeInconsistency * 100).toFixed(1)}%, Away inconsistency: ${(awayInconsistency * 100).toFixed(1)}% (threshold: 50%)`);
            result = false;
        }
        // Store in cache if cache key is available
        if (cacheKey && homeTeamId && awayTeamId) {
            // Store for both teams
            setCheckAtSevenMinuteMarkCache(cacheKey, homeTeamId, result);
        }
        return result;
    }
    /**
     * Validate if prediction should be shown based on game criteria
     *
     * Criteria:
     * 7.1: Never show prediction if teams are under 10 points apart
     * 7.2: Never show prediction if teams are 6+ points away from predicted score at 5-minute mark
     * 7.3: Never show prediction if there's inconsistent scoring in Q4
     *
     * @param homeCalculated Predicted home team Q4 score
     * @param awayCalculated Predicted away team Q4 score
     * @param homeQ4 Actual home team Q4 score at 5-minute mark
     * @param awayQ4 Actual away team Q4 score at 5-minute mark
     * @param homePeriodArray Home team period scores
     * @param awayPeriodArray Away team period scores
     * @returns Boolean indicating if prediction should be shown
     */
    static shouldShowPrediction(homeCalculated, awayCalculated, homeQ4, awayQ4, homePeriodArray, awayPeriodArray) {
        /*
             7.1. It should never give predictions on games where the teams are under 10 points from each other.
             
             7.2. It should never give predictions when the teams are 6 points apart from where they are supposed to be at the 5 minute mark.
                For example if at the 5 minute mark the lakers are supposed to be at 17 points and the Knicks are supposed to be at 15 points but in
                reality Lakers are at 24 points and Knicks are at 9 points. When the teams are 6 points or more from where they are supposed to be at
                the 5 minute mark then it should cancel the prediction.

             7.3. It should not give predictions on games where In the 4th quarter all of a sudden the teams are not scoring with a consistent flow of
                either scoring or missing. For example If the Lakers have been averaging 30 points each quarter and all of a sudden in the 4th quarter they
                start scoring rapidly and are at there 5 minute mark estimation by the 8th minute then it should cancel that game.
        
        */
        // Criterion 7.1: Check if teams are under 6 points apart at 5-minute mark
        const scoreDifferential = Math.abs(homeQ4 - awayQ4);
        if (scoreDifferential < 4) {
            console.log(`[FiveMinuteMarkCalculator] Prediction rejected (7.1): Score differential ${scoreDifferential} is less than 4 points`);
            return false;
        }
        // Criterion 7.2: Check if teams are 4+ points away from predicted score
        const homeDeviation = Math.abs(homeQ4 - homeCalculated);
        const awayDeviation = Math.abs(awayQ4 - awayCalculated);
        if (homeDeviation >= 4 || awayDeviation >= 4) {
            console.log(`[FiveMinuteMarkCalculator] Prediction rejected (7.2): Team deviation too large - Home: ${homeDeviation}pts, Away: ${awayDeviation}pts (threshold: 4)`);
            return false;
        }
        return true;
    }
    /**
     * Calculate betting prediction for a single game
     *
     * This function:
     * 1. Validates that game data exists and has proper team data
     * 2. Calculates predicted scores based on Q1-Q3 performance
     * 3. At the 5-minute mark of Q4, compares Q4 score to prediction
     * 4. Assigns OVER/UNDER betting status based on the comparison
     * 5. Validates prediction using criteria 7.1, 7.2, 7.3
     *
     * @param game Single game object from NBA API (can be any game format with team and period data)
     * @returns BetPrediction with status and risk level
     */
    static async calculateBetStatus(game) {
        const inValidResponse = () => ({
            visitorOveral: 0,
            homeOveral: 0,
            visitorStatus: 'UNKNOW',
            homeStatus: 'UNKNOW',
            riskLevel: 'UNKNOW',
            status: 'UNKNOW',
            showPrediction: false, // Show prediction at halftime
        });
        if (game && (game.gameStatus === 1 || game.gameStatus === 3)) {
            return inValidResponse();
        }
        // Validate input
        if (!game || !game.homeTeam) {
            return inValidResponse();
        }
        // Get away team - API returns either awayTeam or visitorTeam
        const awayTeam = game.awayTeam || game.visitorTeam;
        if (!awayTeam) {
            return inValidResponse();
        }
        const period = game.period;
        const gameClock = game.gameClock?.toUpperCase().replace('PT', '').replace('M', ':').replace('S', '');
        if (!gameClock) {
            return inValidResponse();
        }
        const clockParts = gameClock.trimStart().split(':');
        const [minutes, seconds] = clockParts.map(Number);
        let cacheKey = null;
        cacheKey = createCheckAtSevenMinuteMarkCacheKey(game.homeTeam.teamId, awayTeam.teamId, game.gameId);
        // Check cache first
        /* const sevenMinutesCheck = getCheckAtSevenMinuteMarkCache(cacheKey);
 
 
         if (!sevenMinutesCheck && period === 4) {
             console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} failed 7-minute mark check, skipping prediction`);
             return inValidResponse();
         }
 */
        switch (period) {
            case 1:
            case 2:
            case 3:
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is in period ${period}, waiting until 5-minute mark of Q4 for prediction`);
                return inValidResponse();
            case 4:
                if (minutes > 5 && minutes <= 7) {
                    // At 7-minute mark: send notification and validation
                    if (process.env.USE_MOCK_DATA === 'false') {
                        await expoNotificationSystem_1.default.addToNotificationQueue(game.gameId, game, 'game_five_minutes_mark');
                    }
                    await this.checkAtSevenMinuteMark(game.homeTeam.score, awayTeam.score, game.homeTeam.periods || game.homeTeam.linescore, awayTeam.periods || awayTeam.linescore, game.homeTeam.teamId, awayTeam.teamId, game.gameId);
                    return inValidResponse();
                }
                if (minutes > 5) {
                    // More than 5 minutes remaining, not yet at prediction window
                    console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} has ${minutes} minutes remaining in Q4, waiting for 5-minute mark for prediction`);
                    return inValidResponse();
                }
                break;
            default:
                console.log(`[FiveMinuteMarkCalculator] Game ${game.gameId} is in period ${period}, skipping prediction`);
                break;
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
                    // Validate prediction based on criteria 7.1, 7.2, 7.3
                    /*   const showPrediction = FiveMinuteMarkCalculator.shouldShowPrediction(
                           homeCalculated,
                           awayCalculated,
                           homeQ4,
                           awayQ4,
                           homePeriodArray,
                           awayPeriodArray
                       ) && prediction.homeStatus !== 'UNKNOW' && prediction.visitorStatus !== 'UNKNOW';*/
                    const showPrediction = prediction.homeStatus !== 'UNKNOW' &&
                        prediction.visitorStatus !== 'UNKNOW' && prediction.status !== 'UNKNOW';
                    //  console.log(`\n\n\n[FiveMinuteMarkCalculator] Game ${game.gameId} - Show Prediction: ${showPrediction}, Prediction:`, prediction);
                    return {
                        ...prediction,
                        showPrediction: showPrediction
                    };
                }
                else {
                    // Q4 not yet available 
                    return inValidResponse();
                }
            }
            else {
                // Not enough data for prediction 
                return inValidResponse();
            }
        }
        else {
            // Before 5-minute mark of Q3 
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