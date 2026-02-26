import { ScoreboardResponse, PlayByPlayResponse, LastPlayByPlayActionNumber } from '../types';
import { GamesResponse } from '../schemas/schedule';
import { LeagueLeadersResponse } from '../schemas/league';
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
import { TeamDetailsResponse } from '../schemas/team';
export declare class DataCache {
    private dbCache;
    private lock;
    private activeGameIds;
    private scoreChangeCallbacks;
    private readonly SCOREBOARD_POLL_INTERVAL;
    private readonly PLAYBYPLAY_POLL_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private readonly CACHE_TTL_24H;
    private readonly CACHE_TTL_10M;
    private readonly CACHE_TTL_1MONTH;
    private scoreboardTask;
    private playbyplayTask;
    private cleanupTask;
    onScoreChange(callback: () => Promise<void>): void;
    private triggerScoreChangeCallbacks;
    /**
     * Generic cache get method
     * @param key Cache key
     * @returns Cached value or null if not found/expired
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Generic cache set method
     * @param key Cache key
     * @param value Value to cache
     * @param ttlMs Time to live in milliseconds
     */
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    getScoreboard(): Promise<ScoreboardResponse | null>;
    refreshScoreboard(): Promise<ScoreboardResponse | null>;
    getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null>;
    setGamesForDate(date: string, data: GamesResponse): void;
    getGamesForDate(date: string): Promise<GamesResponse | null>;
    setScheduleData<T>(data: T): void;
    getScheduleData<T>(): Promise<T | null>;
    setStandingsData<T>(season: string, data: T): void;
    getStandingsData<T>(season: string): Promise<T | null>;
    setAllTeams(data: TeamDetailsResponse[]): void;
    getAllTeams(): Promise<TeamDetailsResponse[] | null>;
    setTeam(teamId: number, data: TeamDetailsResponse): void;
    getTeam(teamId: number): Promise<TeamDetailsResponse | null>;
    setLastPlayByPlay(gameId: string, data: LastPlayByPlayActionNumber): void;
    getLastPlayByPlay(gameId: string): Promise<LastPlayByPlayActionNumber | null>;
    setTeamPlayByPlay(teamId: number, data: PlayByPlayResponse): void;
    getTeamPlayByPlay(teamId: number): Promise<PlayByPlayResponse | null>;
    setLeagueLeaders(category: string, season: string | undefined, data: LeagueLeadersResponse): void;
    setPlayer(playerId: string, data: PlayerSummary): void;
    setPlayerSearch(query: string, data: PlayerSummary[]): void;
    setSeasonLeaders(season: string, data: SeasonLeadersResponse): void;
    setLeagueRoster(data: PlayerSummary[]): void;
    getLeagueLeaders(category: string, season?: string): Promise<LeagueLeadersResponse | null>;
    getPlayer(playerId: string): Promise<PlayerSummary | null>;
    searchPlayers(query: string): Promise<PlayerSummary[] | null>;
    getSeasonLeaders(season: string): Promise<SeasonLeadersResponse | null>;
    getLeagueRoster(): Promise<PlayerSummary[] | null>;
    private cleanupFinishedGames;
    private periodicCleanup;
    private pollScoreboard;
    private pollPlaybyplay;
    startPolling(): void;
    /**
     * Get cached predictions for a specific date
     * @param date Date in YYYY-MM-DD format
     * @returns Cached predictions response or null if not found/expired
     */
    getPredictionsForDate(date: string): Promise<any | null>;
    /**
     * Cache predictions for a specific date
     * @param date Date in YYYY-MM-DD format
     * @param data Predictions response data to cache
     * @param ttl TTL in milliseconds (defaults to 1 month)
     */
    setPredictionsForDate(date: string, data: any, ttl?: number): void;
    stopPolling(): Promise<void>;
}
export declare const dataCache: DataCache;
//# sourceMappingURL=dataCache.d.ts.map