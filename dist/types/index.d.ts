export interface PlayByPlayEvent {
    action_number: number;
    clock: string;
    period: number;
    team_id?: number;
    team_tricode?: string;
    action_type: string;
    description: string;
    player_id?: number;
    player_name?: string;
    score_home?: string;
    score_away?: string;
}
export interface PlayByPlayResponse {
    game_id: string;
    plays: PlayByPlayEvent[];
}
export interface LastPlayByPlayActionNumber {
    game_id: string;
    last_action_number: number;
}
export interface Team {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    wins?: number;
    losses?: number;
    score?: number;
    timeoutsRemaining?: number;
    periods?: {
        period: number;
        score: number;
    }[];
}
export interface Game {
    gameId: string;
    gameCode: string;
    gameStatus: number;
    gameStatusText: string;
    period?: number;
    gameClock?: string;
    gameTimeUTC: string;
    gameEt?: string;
    regulationPeriods?: number;
    home_Team: Team;
    away_Team: Team;
    gameLeaders?: {
        homeLeaders: GameLeaderStats | null;
        awayLeaders: GameLeaderStats | null;
    };
}
export interface GameLeaderStats {
    personId?: number | null;
    playerId?: number | null;
    name: string | null;
    jerseyNum?: string | null;
    position?: string | null;
    teamTricode?: string | null;
    teamId?: number | null;
    points: number | null;
    rebounds: number | null;
    assists: number | null;
    periods?: Array<{
        period: number;
        score: number;
    }>;
}
export interface GameLeaders {
    homeLeaders?: GameLeaderStats | null;
    awayLeaders?: GameLeaderStats | null;
}
export interface BetPrediction {
    visitorOveral: number | null;
    visitorStatus: 'OVER' | 'UNDER' | 'UNKNOW';
    homeOveral: number | null;
    homeStatus: 'OVER' | 'UNDER' | 'UNKNOW';
    riskLevel: 'HIGH' | 'LOW' | 'MEDIUM' | 'UNKNOW';
    status: 'OVER' | 'UNDER' | 'UNKNOW';
    showPrediction?: boolean | false;
}
export interface LiveGame {
    gameId: string;
    gameDate?: string;
    gameStatus: number;
    gameStatusText: string;
    period: number;
    gameClock?: string;
    gameTimeUTC: string;
    homeTeam: Team;
    awayTeam: Team;
    gameLeaders?: GameLeaders | null;
    BetPrediction?: BetPrediction | null;
}
export interface Scoreboard {
    gameDate: string;
    games: LiveGame[];
}
export interface ScoreboardResponse {
    scoreboard: Scoreboard;
}
export interface PlayerStats {
    personId: number;
    firstName: string;
    familyName: string;
    nameI: string;
    playerSlug: string;
    position: string;
    comment: string;
    jerseyNum: string;
    minutes: string;
    points: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    foulsPersonal: number;
    plusMinusPoints: number;
}
export interface TeamBoxScoreStats {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    score: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    foulsPersonal: number;
    plusMinusPoints: number;
    players: PlayerStats[];
}
export interface BoxScoreResponse {
    game: Game;
    home_team: TeamBoxScoreStats;
    away_team: TeamBoxScoreStats;
}
export interface KeyMoment {
    period: number;
    clock: string;
    description: string;
    score_home: string;
    score_away: string;
    importance: 'high' | 'medium' | 'low';
}
export interface KeyMomentsResponse {
    game_id: string;
    key_moments: KeyMoment[];
}
export interface WinProbabilityData {
    time: string;
    home_win_probability: number;
    away_win_probability: number;
}
export interface WinProbabilityResponse {
    game_id: string;
    data: WinProbabilityData[];
}
export interface LeagueLeader {
    player_id: number;
    name: string;
    team: string;
    stat_value: number;
    rank: number;
    games_played: number;
}
export interface LeagueLeadersResponse {
    category: string;
    season: string;
    leaders: LeagueLeader[];
}
export interface Player {
    personId: number;
    firstName: string;
    lastName: string;
    temporaryDisplayName?: string;
    playerSlug: string;
    teamId: number;
    teamSlug: string;
    isDefunct: boolean;
    teamCity: string;
    teamName: string;
    teamTricode: string;
    jerseyNum: string;
    position: string;
    heightFeet: string;
    heightInches: string;
    heightMeters: string;
    weightPounds: string;
    weightKilograms: string;
    dateOfBirthUTC: string;
    nbaDebutYear: string;
    yearsPro: number;
    collegeName: string;
    lastAffiliation: string;
    country: string;
}
export interface TeamInfo {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    teamSlug: string;
    conference: string;
    division: string;
}
export interface StandingsTeam {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    wins: number;
    losses: number;
    winPct: number;
    gamesBehind: number;
    confRank: number;
    divRank: number;
    homeWins: number;
    homeLosses: number;
    awayWins: number;
    awayLosses: number;
    lastTenWins: number;
    lastTenLosses: number;
    streak: number;
    isWinStreak: boolean;
}
export interface StandingsResponse {
    season: string;
    league: {
        standard: {
            conference: {
                east: StandingsTeam[];
                west: StandingsTeam[];
            };
        };
    };
}
export interface GameSchedule {
    gameId: string;
    gameCode: string;
    gameStatus: number;
    gameStatusText: string;
    gameTimeUTC: string;
    gameEt: string;
    home_Team: Team;
    away_Team: Team;
}
export interface ScheduleResponse {
    games: GameSchedule[];
}
export interface SearchResult {
    id: number;
    name: string;
    type: 'player' | 'team';
    team?: string;
}
export interface Prediction {
    game_id: string;
    predicted_winner: string;
    winner_confidence: number;
    projected_home_score: number;
    projected_away_score: number;
    key_factors: string[];
    last_updated: string;
}
export interface PredictionsResponse {
    predictions: Prediction[];
}
export interface LeadChangeExplanation {
    game_id: string;
    summary: string;
    key_factors: string[];
}
export interface LeadChangeDialogProps {
    open: boolean;
    onClose: () => void;
    explanation: LeadChangeExplanation | null;
}
//# sourceMappingURL=index.d.ts.map