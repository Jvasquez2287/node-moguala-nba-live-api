/**
 * Standings service for NBA data operations.
 * Handles fetching and processing NBA team standings.
 */
 
import axios from 'axios';
import { StandingsResponse, StandingRecord } from '../schemas/standings';
import { dataCache } from './dataCache';
 
// Type definition for cache entries
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Cache duration in milliseconds (1 hour for memory cache)
// Database cache stores permanently with no TTL
const CACHE_DURATION = 3600000;

// Cache for standings by season
const standingsCache = new Map<string, CacheEntry<StandingsResponse>>();

/**
 * Retry utility for NBA API calls with exponential backoff
 */
async function retryAxiosRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Don't retry certain types of errors
            if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
           console.log(`NBA API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Get NBA standings for a given season
 */
export async function getSeasonStandings(season: string): Promise<StandingsResponse | null> {
    try {
        const cacheKey = `standings_${season}`;

        // 1. Check in-memory cache first (1 hour TTL)
        const cached = standingsCache.get(season);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
           console.log(`[Standings] Returning cached standings for season ${season} from memory`);
            return cached.data;
        }

        // 2. Check database cache (permanent storage - no TTL)
        try {
            console.log(`[Standings] Checking database cache for season ${season}...`);
            const dbCachedData = await dataCache.getStandingsData<StandingsResponse>(season);
            if (dbCachedData) {
                console.log(`[Standings] Found standings data in database cache for season ${season}`);
                // Also populate memory cache
                standingsCache.set(season, {
                    data: dbCachedData,
                    timestamp: Date.now()
                });
                return dbCachedData;
            }
        } catch (error) {
            console.warn(`[Standings] Database cache lookup failed for season ${season}, will fetch from API:`, error instanceof Error ? error.message : error);
        }

       console.log(`[Standings] Cache miss for standings ${season}, fetching from API`);

        const standingsResponse = await retryAxiosRequest(async () => {
            return await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    LeagueID: '00',
                    Season: season,
                    SeasonType: 'Regular Season'
                },
                timeout: 60000
            });
        });

        if (!standingsResponse.data?.resultSets?.[0]?.rowSet) {
           console.log(`[Standings] No standings data found for season ${season}`);
            return null;
        }

        const headers = standingsResponse.data.resultSets[0].headers;
        const teamsData = standingsResponse.data.resultSets[0].rowSet;

        // Helper function to safely parse values
        const safeInt = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        };

        const safeFloat = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        };

        const safeStr = (value: any, defaultValue: string = ''): string => {
            if (value === null || value === undefined) return defaultValue;
            return String(value).trim() || defaultValue;
        };

        // Convert to StandingRecord objects
        const standings: StandingRecord[] = teamsData.map((row: any[]) => {
            const getValue = (headerName: string) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };

            // Calculate PPG, OPP PPG, and DIFF if available
            let ppg: number | null = null;
            let oppPpg: number | null = null;
            let diff: number | null = null;

            try {
                const ppgRaw = getValue('PointsPG') || getValue('PTS') || getValue('Points');
                const oppPpgRaw = getValue('OppPointsPG') || getValue('OPP_PTS') || getValue('OppPoints');

                if (ppgRaw !== null && ppgRaw !== undefined && ppgRaw !== '') {
                    const ppgVal = Number(ppgRaw);
                    if (!isNaN(ppgVal) && isFinite(ppgVal)) {
                        ppg = ppgVal;
                    }
                }

                if (oppPpgRaw !== null && oppPpgRaw !== undefined && oppPpgRaw !== '') {
                    const oppPpgVal = Number(oppPpgRaw);
                    if (!isNaN(oppPpgVal) && isFinite(oppPpgVal)) {
                        oppPpg = oppPpgVal;
                    }
                }

                if (ppg !== null && oppPpg !== null) {
                    diff = ppg - oppPpg;
                }
            } catch (error) {
               console.log(`[Standings] Could not extract PPG/OPP PPG for team ${getValue('TeamID')}:`, error);
            }

            return {
                season_id: safeStr(getValue('SeasonID'), '0'),
                team_id: safeInt(getValue('TeamID'), 0),
                team_city: safeStr(getValue('TeamCity'), ''),
                team_name: safeStr(getValue('TeamName'), ''),
                conference: safeStr(getValue('Conference'), ''),
                division: safeStr(getValue('Division'), ''),
                conference_record: safeStr(getValue('ConferenceRecord'), ''),
                division_record: safeStr(getValue('DivisionRecord'), ''),
                playoff_rank: safeInt(getValue('PlayoffRank'), 0),
                wins: safeInt(getValue('WINS'), 0),
                losses: safeInt(getValue('LOSSES'), 0),
                win_pct: safeFloat(getValue('WinPCT'), 0),
                home_record: safeStr(getValue('HOME'), ''),
                road_record: safeStr(getValue('ROAD'), ''),
                l10_record: safeStr(getValue('L10'), ''),
                current_streak: safeInt(getValue('CurrentStreak'), 0),
                current_streak_str: safeStr(getValue('strCurrentStreak'), ''),
                games_back: safeStr(getValue('ConferenceGamesBack'), ''),
                ppg: ppg,
                opp_ppg: oppPpg,
                diff: diff
            };
        });

        const result = {
            standings
        };

        // Cache the result in memory
        standingsCache.set(season, {
            data: result,
            timestamp: Date.now()
        });

        // 3. Store in database cache permanently
        try {
            dataCache.setStandingsData(season, result);
            console.log(`[Standings] Stored standings data in database cache for season ${season} (permanent storage)`);
        } catch (cacheError) {
            console.warn(`[Standings] Failed to store in database cache for season ${season}:`, cacheError instanceof Error ? cacheError.message : cacheError);
            // Continue anyway - we have the data in memory
        }

        return result;
    } catch (error) {
       console.log(`[Standings] Error fetching season standings for ${season}:`, error);
        throw new Error(`Failed to fetch season standings: ${error}`);
    }
}