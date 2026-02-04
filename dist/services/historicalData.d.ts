export interface HistoricalGame {
    gameId: string;
    gameDate: string;
    gameStatus: number;
    gameStatusText: string;
    home_Team: {
        teamName: string;
        teamId: number;
        teamTricode: string;
        wins: number;
        losses: number;
        score: number;
    };
    away_Team: {
        teamName: string;
        teamId: number;
        teamTricode: string;
        wins: number;
        losses: number;
        score: number;
    };
}
export declare function getHistoricalGames(date: string): Promise<HistoricalGame[]>;
export declare function getHistoricalBoxScore(gameId: string): Promise<any>;
declare const _default: {
    getHistoricalGames: typeof getHistoricalGames;
    getHistoricalBoxScore: typeof getHistoricalBoxScore;
};
export default _default;
//# sourceMappingURL=historicalData.d.ts.map