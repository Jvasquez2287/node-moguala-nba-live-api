/**
 * Five Minute Mark Calculator
 *
 * Calculates NBA game betting predictions based on the 5-minute mark of the 3rd quarter.
 * Uses historical Q1-Q3 data to predict final game outcomes (OVER/UNDER).
 */
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
declare class DoMath {
    /**
     * Calculate prediction score based on first 3 quarters
     * Formula: ((Q1 + Q2 + Q3) / 3 / 12) * 7
     *
     * @param periods Array of period objects/scores from NBA API
     * @returns Predicted score for the 4th quarter
     */
    static calculateThirdScore(periods: any[]): number;
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
    static calculateAgainstFourScore(homeCalculated: number, visitorsCalculated: number, visitorsQ4: number, homeQ4: number): BetPrediction;
}
/**
 * Five Minute Mark Calculator Service
 * Processes NBA games and calculates betting predictions at the 5-minute mark of Q3
 */
declare class FiveMinuteMarkCalculator {
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
    static calculateBetStatus(game: any): BetPrediction;
    /**
     * Process all games and calculate betting predictions
     *
     * @param games Array of game objects from NBA API
     * @returns Array of games with betPrediction added to each game
     */
    static gamesFormulaNBA_All(games: any[]): any[];
    /**
     * Fetch games from the NBA API for today and calculate betting predictions
     *
     * @returns Game data with calculated betting predictions
     */
    static getCurrentGamesFromAPI(): Promise<any>;
}
export default FiveMinuteMarkCalculator;
export { DoMath, FiveMinuteMarkCalculator };
//# sourceMappingURL=fiveMinuteMarkCalculator.d.ts.map