import { ScoreboardResponse, PlayByPlayResponse } from '../types';
import { GamesResponse } from '../schemas/schedule';
export declare class DataCache {
    private scoreboardCache;
    private playbyplayCache;
    private lock;
    private activeGameIds;
    private scheduleCache;
    private readonly SCOREBOARD_POLL_INTERVAL;
    private readonly PLAYBYPLAY_POLL_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private scoreboardTask;
    private playbyplayTask;
    private cleanupTask;
    getScoreboard(): Promise<ScoreboardResponse | null>;
    refreshScoreboard(): Promise<ScoreboardResponse | null>;
    getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null>;
    setGamesForDate(date: string, data: GamesResponse): void;
    getGamesForDate(date: string): Promise<GamesResponse | null>;
    private cleanupFinishedGames;
    private periodicCleanup;
    private pollScoreboard;
    private pollPlaybyplay;
    startPolling(): void;
    stopPolling(): Promise<void>;
}
export declare const dataCache: DataCache;
//# sourceMappingURL=dataCache.d.ts.map