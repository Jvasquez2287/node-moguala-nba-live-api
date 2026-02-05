import sql from 'mssql';
export declare function connectToDatabase(): Promise<sql.ConnectionPool>;
export declare function getConnection(): sql.ConnectionPool | null;
export declare function executeQuery(query: string, params?: Record<string, any>): Promise<any>;
export declare function closeDatabase(): Promise<void>;
declare const _default: {
    connectToDatabase: typeof connectToDatabase;
    getConnection: typeof getConnection;
    executeQuery: typeof executeQuery;
    closeDatabase: typeof closeDatabase;
};
export default _default;
//# sourceMappingURL=database.d.ts.map