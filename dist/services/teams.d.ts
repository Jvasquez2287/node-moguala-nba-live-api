/**
 * Teams service for NBA team operations.
 * Handles fetching team details, rosters, and team information.
 */
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';
/**
 * Get detailed information about a specific NBA team
 */
export declare function getTeam(teamId: number): Promise<TeamDetailsResponse>;
/**
 * Get team roster with players and coaches
 */
export declare function getTeamRoster(teamId: number, season: string): Promise<TeamRoster>;
/**
 * Get all NBA teams
 */
export declare function getAllTeams(): Promise<TeamDetailsResponse[]>;
/**
 * Get team player statistics for a specific season
 */
export declare function getTeamPlayerStats(teamId: number, season: string): Promise<any>;
//# sourceMappingURL=teams.d.ts.map