/**
 * Key moments detection service for NBA games.
 *
 * This service watches live games and automatically spots the important plays that change
 * the game - things like shots that tie the game, when the lead switches hands, scoring
 * runs, clutch plays in the final minutes, and big shots that change momentum.
 *
 * We analyze play-by-play data in real-time to find these moments, then use AI to explain
 * why each moment matters. AI context is generated in batches for efficiency.
 *
 * The moments are cached so users can see recent highlights even if they just
 * tuned in. Key moments are sent to the frontend via WebSocket so they appear instantly
 * when detected.
 */
/**
 * Types of key moments that can be detected
 */
declare enum KeyMomentType {
    GAME_TYING_SHOT = "game_tying_shot",
    LEAD_CHANGE = "lead_change",
    SCORING_RUN = "scoring_run",
    CLUTCH_PLAY = "clutch_play",
    BIG_SHOT = "big_shot"
}
interface KeyMoment {
    type: KeyMomentType;
    play: any;
    timestamp: string;
    context?: string;
}
/**
 * Clean up finished games from caches
 */
declare function cleanupFinishedGames(): Promise<void>;
/**
 * Detect key moments for a game by analyzing play-by-play events
 */
declare function detectKeyMoments(gameId: string): Promise<KeyMoment[]>;
/**
 * Get recent key moments for a game with AI context
 */
declare function getKeyMomentsForGame(gameId: string): Promise<KeyMoment[]>;
/**
 * Process live games to detect key moments
 */
declare function processLiveGames(): Promise<void>;
export declare function startCleanupTask(): void;
export declare function startProcessingTask(): void;
export declare function stopCleanupTask(): void;
export declare function stopProcessingTask(): void;
export declare const keyMomentsService: {
    detectKeyMoments: typeof detectKeyMoments;
    getKeyMomentsForGame: typeof getKeyMomentsForGame;
    processLiveGames: typeof processLiveGames;
    cleanupFinishedGames: typeof cleanupFinishedGames;
    KeyMomentType: typeof KeyMomentType;
};
export default keyMomentsService;
//# sourceMappingURL=keyMoments.d.ts.map