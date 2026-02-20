/**
 * Predictions service for NBA data operations.
 * Handles game outcome predictions based on team statistics.
 */
import { PredictionsResponse } from '../schemas/predictions';
export declare function calculatePredictionsAccuracyForLastMonth(): Promise<{
    accuracy: string;
} | undefined>;
/**
 * Predict games for a specific date
 */
export declare function predictGamesForDate(date: string, season: string): Promise<PredictionsResponse | null>;
//# sourceMappingURL=predictions.d.ts.map