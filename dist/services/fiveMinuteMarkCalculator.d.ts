/**
 * Five Minute Mark Calculator
 *
 * Calculates NBA game betting predictions based on the 5-minute mark of the 3rd quarter.
 * Uses historical Q1-Q3 data to predict final game outcomes (OVER/UNDER).
 */
interface BetPrediction {
    visitorOveral: number;
    visitorStatus: 'OVER' | 'UNDER' | 'UNKNOW';
    homeOveral: number;
    homeStatus: 'OVER' | 'UNDER' | 'UNKNOW';
    riskLevel: 'HIGH' | 'LOW' | 'MEDIUM' | 'UNKNOW';
    status: 'OVER' | 'UNDER' | 'UNKNOW';
    showPrediction?: boolean;
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
    static shouldShowPrediction(homeCalculated: number, awayCalculated: number, homeQ4: number, awayQ4: number, homePeriodArray: any[], awayPeriodArray: any[]): boolean;
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
    static calculateBetStatus(game: any): Promise<BetPrediction>;
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