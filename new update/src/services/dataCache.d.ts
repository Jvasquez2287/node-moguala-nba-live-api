/**
 * Data cache service for NBA API data.
 *
 * Polls the NBA API in the background and caches the latest data.
 * WebSocket handlers read from this cache instead of making API calls directly.
 */
import { ScoreboardResponse, PlayByPlayResponse } from '../schemas/scoreboard';
import { LeagueLeadersResponse } from '../schemas/league';
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
import { GamesResponse } from '../schemas/schedule';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';
export declare class DataCache {
    private scoreboardCache;
    private playbyplayCache;
    private activeGameIds;
    private scoreChangeCallbacks;
    private leagueLeadersCache;
    private playerCache;
    private playerSearchCache;
    private seasonLeadersCache;
    private leagueRosterCache;
    private scheduleCache;
    private teamCache;
    private teamRosterCache;
    private allTeamsCache;
    private boxScoreCache;
    private readonly SCOREBOARD_POLL_INTERVAL;
    private readonly PLAYBYPLAY_POLL_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private scoreboardTimer;
    private playbyplayTimer;
    private cleanupTimer;
    constructor();
    onScoreChange(callback: () => Promise<void>): void;
    private triggerScoreChangeCallbacks;
    getScoreboard(): Promise<ScoreboardResponse | null>;
    getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null>;
    getLeagueLeaders(category: string, season?: string): Promise<LeagueLeadersResponse | null>;
    getPlayer(playerId: string): Promise<PlayerSummary | null>;
    searchPlayers(query: string): Promise<PlayerSummary[] | null>;
    getSeasonLeaders(season: string): Promise<SeasonLeadersResponse | null>;
    getLeagueRoster(): Promise<PlayerSummary[] | null>;
    getGamesForDate(date: string): Promise<GamesResponse | null>;
    getTeam(teamId: number): Promise<TeamDetailsResponse | null>;
    getTeamRoster(teamId: number, season: string): Promise<TeamRoster | null>;
    getAllTeams(): Promise<TeamDetailsResponse[] | null>;
    getBoxScore(gameId: string): Promise<any | null>;
    setLeagueLeaders(category: string, season: string | undefined, data: LeagueLeadersResponse): void;
    setPlayer(playerId: string, data: PlayerSummary): void;
    setPlayerSearch(query: string, data: PlayerSummary[]): void;
    setSeasonLeaders(season: string, data: SeasonLeadersResponse): void;
    setLeagueRoster(data: PlayerSummary[]): void;
    setGamesForDate(date: string, data: GamesResponse): void;
    setTeam(teamId: number, data: TeamDetailsResponse): void;
    setTeamRoster(teamId: number, season: string, data: TeamRoster): void;
    setAllTeams(data: TeamDetailsResponse[]): void;
    setBoxScore(gameId: string, data: any): void;
    private cleanupFinishedGames;
    private periodicCleanup;
    private pollScoreboard;
    private pollPlaybyplay;
    startPolling(): Promise<void>;
    stopPolling(): Promise<void>;
    isPolling(): boolean;
}
export declare const dataCache: DataCache;
//# sourceMappingURL=dataCache.d.ts.map