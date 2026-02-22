/**
 * Predictions service for NBA data operations.
 * Handles game outcome predictions based on team statistics with AI insights.
 */
import { PredictionsResponse } from '../schemas/predictions';
export declare function calculatePredictionsAccuracyForLastMonth(): Promise<{
    accuracy: string;
} | undefined>;
/**
 * Predict games for a specific date with AI insights
 */
export declare function predictGamesForDate(date: string, season: string): Promise<PredictionsResponse | null>;
//# sourceMappingURL=predictions.d.ts.map