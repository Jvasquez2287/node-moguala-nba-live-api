/**
 * Players service for NBA player operations.
 * Handles fetching player details, stats, and game logs.
 */
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
/**
 * Get player information including stats and recent games
 */
export declare function getPlayer(playerId: string): Promise<PlayerSummary>;
/**
 * Search for players by name
 */
export declare function searchPlayers(query: string): Promise<PlayerSummary[]>;
/**
 * Get season leaders for various stat categories
 */
export declare function getSeasonLeaders(season?: string): Promise<SeasonLeadersResponse>;
/**
 * Get the complete league roster (all active players)
 */
export declare function getLeagueRoster(): Promise<PlayerSummary[]>;
//# sourceMappingURL=players.d.ts.map