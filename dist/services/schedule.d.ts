import { GamesResponse } from '../schemas/schedule';
interface GameDateData {
    gameDate: string;
    games?: any[];
}
interface ScheduleData {
    season: number;
    games: GameDateData[];
    lastUpdated: string;
}
declare function getSchedules(): Promise<GameDateData[]>;
declare function getTodaysSchedule(): Promise<GameDateData>;
declare function getScheduleByDate(date: string): Promise<GameDateData>;
declare function refreshSchedule(): Promise<ScheduleData>;
declare function clearScheduleCache(): void;
export declare const scheduleService: {
    getSchedules: typeof getSchedules;
    getTodaysSchedule: typeof getTodaysSchedule;
    getScheduleByDate: typeof getScheduleByDate;
    refreshSchedule: typeof refreshSchedule;
    clearScheduleCache: typeof clearScheduleCache;
};
/**
 * Get all NBA games for a specific date
 */
export declare function getGamesForDate(date: string): Promise<GamesResponse>;
export {};
//# sourceMappingURL=schedule.d.ts.map