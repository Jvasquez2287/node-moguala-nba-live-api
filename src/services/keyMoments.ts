/**
 * Key moments detection service for NBA games.
 *
 * This service watches live games and automatically spots the important plays that change
 * the game - things like shots that tie the game, when the lead switches hands, scoring
 * runs, clutch plays in the final minutes, and big shots that change momentum.
 *
 * We analyze play-by-play data in real-time to find these moments, then use AI to explain
 * why each moment matters. AI context is generated in batches for efficiency.
 *
 * The moments are cached so users can see recent highlights even if they just
 * tuned in. Key moments are sent to the frontend via WebSocket so they appear instantly
 * when detected.
 */

import { dataCache } from './dataCache';
import { webSocketManager } from './websocketManager';

/**
 * Types of key moments that can be detected
 */
enum KeyMomentType {
  GAME_TYING_SHOT = 'game_tying_shot',
  LEAD_CHANGE = 'lead_change',
  SCORING_RUN = 'scoring_run',
  CLUTCH_PLAY = 'clutch_play',
  BIG_SHOT = 'big_shot'
}

interface KeyMoment {
  type: KeyMomentType;
  play: any;
  timestamp: string;
  context?: string;
}

interface GameInfo {
  game_id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  period: number;
  clock: string;
}

interface MomentWithGameInfo {
  moment_id: string;
  moment: KeyMoment;
  game_info: GameInfo;
}

// Cache for recent key moments per game (stores last 5 minutes of moments)
const keyMomentsCache = new Map<string, KeyMoment[]>();
const lastCheckedPlays = new Map<string, number>(); // game_id -> last action_number checked

// LRU cache for AI context of key moments: key = moment_id
interface MomentContextCacheEntry {
  context: string;
  timestamp: number;
}

const momentContextCache = new Map<string, MomentContextCacheEntry>();
const MOMENT_CONTEXT_MAX_SIZE = 1000;

let cleanupTask: NodeJS.Timeout | null = null;
let processingTask: NodeJS.Timeout | null = null;

/**
 * Get moment context from LRU cache
 */
function getMomentContext(momentId: string): string | null {
  const entry = momentContextCache.get(momentId);
  return entry ? entry.context : null;
}

/**
 * Set moment context in LRU cache with eviction if needed
 */
function setMomentContext(momentId: string, context: string): void {
  momentContextCache.set(momentId, {
    context: context,
    timestamp: Date.now()
  });

  // Evict oldest if over limit
  if (momentContextCache.size > MOMENT_CONTEXT_MAX_SIZE) {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of momentContextCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      momentContextCache.delete(oldestKey);
      console.log(`[KeyMoments] LRU eviction: removed moment context ${oldestKey}`);
    }
  }
}

/**
 * Clean up finished games from caches
 */
async function cleanupFinishedGames(): Promise<void> {
  try {
    const scoreboardData = await dataCache.getScoreboard();
    if (!scoreboardData?.scoreboard?.games) {
      return;
    }

    const finishedGameIds = scoreboardData.scoreboard.games
      .filter((game: any) => game.gameStatus === 3) // Final
      .map((game: any) => game.gameId);

    let removedMoments = 0;
    let removedContexts = 0;

    for (const gameId of finishedGameIds) {
      // Remove from key moments cache
      if (keyMomentsCache.has(gameId)) {
        removedMoments += keyMomentsCache.get(gameId)?.length || 0;
        keyMomentsCache.delete(gameId);
      }

      // Remove from last checked plays
      lastCheckedPlays.delete(gameId);

      // Remove moment contexts for this game
      const momentIdsToRemove: string[] = [];
      for (const key of momentContextCache.keys()) {
        if (key.startsWith(`${gameId}:`)) {
          momentIdsToRemove.push(key);
        }
      }

      for (const momentId of momentIdsToRemove) {
        momentContextCache.delete(momentId);
        removedContexts++;
      }
    }

    if (removedMoments > 0 || removedContexts > 0) {
      console.log(
        `[KeyMoments] Cleaned up finished games: ${finishedGameIds.length} games, ` +
        `${removedMoments} moments, ${removedContexts} contexts`
      );
    }
  } catch (error) {
    console.error('[KeyMoments] Error cleaning up finished games:', error);
  }
}

/**
 * Parse clock string (ISO 8601 format like "PT12M00S") to [minutes, seconds]
 */
function parseClock(clockStr: string | null | undefined): [number, number] | null {
  if (!clockStr) {
    return null;
  }

  try {
    // Handle ISO 8601 format: PT12M00S
    let match = clockStr.match(/PT(\d+)M(\d+)S/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return [minutes, seconds];
    }

    // Handle MM:SS format
    match = clockStr.match(/(\d+):(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return [minutes, seconds];
    }
  } catch (error) {
    // Ignore parse errors
  }

  return null;
}

/**
 * Parse score string to integer
 */
function parseScore(scoreStr: string | null | undefined): number | null {
  if (!scoreStr) {
    return null;
  }

  try {
    const score = parseInt(scoreStr, 10);
    return isNaN(score) ? null : score;
  } catch {
    return null;
  }
}

/**
 * Detect if a play resulted in a game-tying shot
 */
function detectGameTyingShot(
  play: any,
  previousHomeScore: number,
  previousAwayScore: number,
  currentHomeScore: number,
  currentAwayScore: number
): boolean {
  const isTiedNow = currentHomeScore === currentAwayScore;
  const wasTiedBefore = previousHomeScore === previousAwayScore;

  if (isTiedNow && !wasTiedBefore) {
    const actionType = (play.action_type || '').toLowerCase();
    if (actionType.includes('shot') || actionType.includes('free throw')) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if the lead changed between plays
 */
function detectLeadChange(
  previousHomeScore: number,
  previousAwayScore: number,
  currentHomeScore: number,
  currentAwayScore: number
): boolean {
  let previousLeader: 'home' | 'away' | null = null;
  if (previousHomeScore > previousAwayScore) {
    previousLeader = 'home';
  } else if (previousAwayScore > previousHomeScore) {
    previousLeader = 'away';
  }

  let currentLeader: 'home' | 'away' | null = null;
  if (currentHomeScore > currentAwayScore) {
    currentLeader = 'home';
  } else if (currentAwayScore > currentHomeScore) {
    currentLeader = 'away';
  }

  return previousLeader !== null && currentLeader !== null && previousLeader !== currentLeader;
}

/**
 * Detect if a team has scored 6+ points in quick succession
 */
function detectScoringRun(
  recentPlays: any[],
  teamTricode: string,
  period: number
): boolean {
  if (recentPlays.length < 2) {
    return false;
  }

  const playsToCheck = recentPlays.slice(0, 15);
  let teamPoints = 0;
  let consecutiveTeamPlays = 0;

  for (const play of playsToCheck) {
    const playTeam = play.team_tricode || '';
    const actionType = (play.action_type || '').toLowerCase();

    if (playTeam === teamTricode && (actionType.includes('shot') || actionType.includes('free throw'))) {
      if (actionType.includes('3-pt') || actionType.includes('three')) {
        teamPoints += 3;
      } else if (actionType.includes('free throw')) {
        teamPoints += 1;
      } else {
        teamPoints += 2;
      }

      consecutiveTeamPlays++;
    } else {
      if (actionType.includes('shot') || actionType.includes('free throw')) {
        break;
      }
    }
  }

  return teamPoints >= 6 && consecutiveTeamPlays >= 2;
}

/**
 * Detect clutch play - important play in final minutes of close game
 */
function detectClutchPlay(
  play: any,
  period: number,
  clock: [number, number] | null,
  homeScore: number,
  awayScore: number
): boolean {
  // Must be in 4th quarter or later
  if (period < 4) {
    return false;
  }

  // Must be in last 2 minutes
  if (clock) {
    const [minutes, seconds] = clock;
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds > 120) {
      return false;
    }
  } else {
    return false;
  }

  // Score must be within 5 points
  const scoreDiff = Math.abs(homeScore - awayScore);
  if (scoreDiff > 5) {
    return false;
  }

  // Must be a scoring play
  const actionType = (play.action_type || '').toLowerCase();
  return actionType.includes('shot') || actionType.includes('free throw');
}

/**
 * Detect big shot - 3-pointer that changes game situation significantly
 */
function detectBigShot(
  play: any,
  previousHomeScore: number,
  previousAwayScore: number,
  currentHomeScore: number,
  currentAwayScore: number
): boolean {
  const actionType = (play.action_type || '').toLowerCase();

  // Must be a 3-pointer
  if (!actionType.includes('3-pt') && !actionType.includes('three')) {
    return false;
  }

  const playTeam = play.team_tricode || '';
  if (!playTeam) {
    return false;
  }

  const previousDiff = previousHomeScore - previousAwayScore;
  const currentDiff = currentHomeScore - currentAwayScore;

  // Extends lead to 10+ or cuts deficit to 5 or less
  if (Math.abs(currentDiff) >= 10 && Math.abs(previousDiff) < 10) {
    return true;
  }
  if (Math.abs(currentDiff) <= 5 && Math.abs(previousDiff) > 5) {
    return true;
  }

  return false;
}

/**
 * Detect key moments for a game by analyzing play-by-play events
 */
async function detectKeyMoments(gameId: string): Promise<KeyMoment[]> {
  try {
    // Get play-by-play data from cache
    const playbyplayData = await dataCache.getPlaybyplay(gameId);
    if (!playbyplayData?.plays || playbyplayData.plays.length === 0) {
      return [];
    }

    // Get scoreboard data
    const scoreboardData = await dataCache.getScoreboard();
    if (!scoreboardData?.scoreboard?.games) {
      return [];
    }

    // Find the game in scoreboard
    let game = null;
    for (const g of scoreboardData.scoreboard.games) {
      if (g.gameId === gameId) {
        game = g;
        break;
      }
    }

    // Only detect moments for live games (gameStatus == 2)
    if (!game || game.gameStatus !== 2) {
      return [];
    }

    const currentHomeScore = game.homeTeam.score || 0;
    const currentAwayScore = game.awayTeam.score || 0;
    const currentPeriod = game.period;
    const currentClock = parseClock(game.gameClock);

    // Sort plays by action number (most recent first)
    const plays = [...playbyplayData.plays].sort((a, b) => b.action_number - a.action_number);

    // Track which plays we've already checked
    const lastChecked = lastCheckedPlays.get(gameId) || 0;

    // Only check new plays we haven't seen before
    const newPlays = plays.filter((p: any) => p.action_number > lastChecked);

    if (newPlays.length === 0) {
      return [];
    }

    // Remember which plays we've checked
    if (newPlays.length > 0) {
      const maxActionNumber = Math.max(...newPlays.map((p: any) => p.action_number));
      lastCheckedPlays.set(gameId, maxActionNumber);
    }

    const detectedMoments: KeyMoment[] = [];

    // Check each new play
    for (let i = 0; i < newPlays.length; i++) {
      const play = newPlays[i];

      // Current scores after this play
      const playHomeScore = parseScore(play.score_home) || currentHomeScore;
      const playAwayScore = parseScore(play.score_away) || currentAwayScore;

      // Previous scores
      let previousHomeScore = playHomeScore;
      let previousAwayScore = playAwayScore;

      if (i < newPlays.length - 1) {
        // Look at previous play in newPlays
        const prevPlay = newPlays[i + 1];
        previousHomeScore = parseScore(prevPlay.score_home) || playHomeScore;
        previousAwayScore = parseScore(prevPlay.score_away) || playAwayScore;
      } else {
        // Look at all plays for previous play
        const prevAction = play.action_number - 1;
        const prevPlay = plays.find((p: any) => p.action_number === prevAction);
        if (prevPlay) {
          previousHomeScore = parseScore(prevPlay.score_home) || playHomeScore;
          previousAwayScore = parseScore(prevPlay.score_away) || playAwayScore;
        }
      }

      const playPeriod = play.period;
      const playClock = parseClock(play.clock);

      // Detect different moment types
      if (
        detectGameTyingShot(
          play,
          previousHomeScore,
          previousAwayScore,
          playHomeScore,
          playAwayScore
        )
      ) {
        detectedMoments.push({
          type: KeyMomentType.GAME_TYING_SHOT,
          play: play,
          timestamp: new Date().toISOString()
        });
      }

      if (
        detectLeadChange(
          previousHomeScore,
          previousAwayScore,
          playHomeScore,
          playAwayScore
        )
      ) {
        detectedMoments.push({
          type: KeyMomentType.LEAD_CHANGE,
          play: play,
          timestamp: new Date().toISOString()
        });
      }

      if (
        detectClutchPlay(play, playPeriod, playClock, playHomeScore, playAwayScore)
      ) {
        detectedMoments.push({
          type: KeyMomentType.CLUTCH_PLAY,
          play: play,
          timestamp: new Date().toISOString()
        });
      }

      if (
        detectBigShot(
          play,
          previousHomeScore,
          previousAwayScore,
          playHomeScore,
          playAwayScore
        )
      ) {
        detectedMoments.push({
          type: KeyMomentType.BIG_SHOT,
          play: play,
          timestamp: new Date().toISOString()
        });
      }

      // Check for scoring runs
      if (i < newPlays.length - 1) {
        const recentPlays = newPlays.slice(Math.max(0, i - 10), i + 1);
        const playTeam = play.team_tricode;
        if (playTeam && detectScoringRun(recentPlays, playTeam, playPeriod)) {
          detectedMoments.push({
            type: KeyMomentType.SCORING_RUN,
            play: play,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Cache detected moments
    if (!keyMomentsCache.has(gameId)) {
      keyMomentsCache.set(gameId, []);
    }

    const currentMoments = keyMomentsCache.get(gameId) || [];
    currentMoments.push(...detectedMoments);

    // Clean up old moments (older than 5 minutes)
    const cutoffTime = Date.now() - 5 * 60 * 1000;
    const filteredMoments = currentMoments.filter(
      (m) => new Date(m.timestamp).getTime() > cutoffTime
    );
    keyMomentsCache.set(gameId, filteredMoments);

    return detectedMoments;
  } catch (error) {
    console.error(`[KeyMoments] Error detecting moments for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Get recent key moments for a game with AI context
 */
async function getKeyMomentsForGame(gameId: string): Promise<KeyMoment[]> {
  try {
    // Get cached moments
    const moments = keyMomentsCache.get(gameId) || [];

    // Get current game info
    const scoreboardData = await dataCache.getScoreboard();
    if (!scoreboardData?.scoreboard?.games) {
      return moments;
    }

    let game = null;
    for (const g of scoreboardData.scoreboard.games) {
      if (g.gameId === gameId) {
        game = g;
        break;
      }
    }

    if (!game) {
      return moments;
    }

    const gameInfo: GameInfo = {
      game_id: gameId,
      home_team: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`.trim(),
      away_team: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`.trim(),
      home_score: game.homeTeam.score || 0,
      away_score: game.awayTeam.score || 0,
      period: game.period,
      clock: game.gameClock || ''
    };

    // Collect moments needing context
    const momentsNeedingContext: MomentWithGameInfo[] = [];
    for (const moment of moments) {
      if (!moment.context) {
        const momentId = `${gameId}:${moment.timestamp}`;
        momentsNeedingContext.push({
          moment_id: momentId,
          moment: moment,
          game_info: gameInfo
        });
      }
    }

    // Generate context if needed
    if (momentsNeedingContext.length > 0) {
      const contexts = await generateBatchedMomentContexts(momentsNeedingContext);

      // Apply contexts to moments
      for (const item of momentsNeedingContext) {
        if (item.moment_id in contexts) {
          item.moment.context = contexts[item.moment_id];
        }
      }
    }

    return moments;
  } catch (error) {
    console.error(`[KeyMoments] Error getting key moments for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Generate AI context for multiple moments in one batch call
 */
async function generateBatchedMomentContexts(
  momentsWithGameInfo: MomentWithGameInfo[]
): Promise<{ [key: string]: string }> {
  if (momentsWithGameInfo.length === 0) {
    return {};
  }

  const cachedContexts: { [key: string]: string } = {};
  const momentsNeedingContext: MomentWithGameInfo[] = [];

  // Separate cached and uncached moments
  for (const item of momentsWithGameInfo) {
    const momentId = item.moment_id;
    const cachedContext = getMomentContext(momentId);
    if (cachedContext) {
      cachedContexts[momentId] = cachedContext;
      console.log(`[KeyMoments] Using cached context for moment ${momentId}`);
    } else {
      momentsNeedingContext.push(item);
    }
  }

  // Return cached if all are cached
  if (momentsNeedingContext.length === 0) {
    console.log(
      `[KeyMoments] Returning ${Object.keys(cachedContexts).length} cached contexts - skipping Groq calls`
    );
    return cachedContexts;
  }

  if (Object.keys(cachedContexts).length > 0) {
    console.log(
      `[KeyMoments] Found ${Object.keys(cachedContexts).length} cached contexts, ` +
      `generating ${momentsNeedingContext.length} new contexts`
    );
  }

  try {
    // For now, we'll skip Groq integration and just return cached contexts
    // In production, you would integrate with your Groq service here
    console.log('[KeyMoments] Groq context generation disabled - returning cached contexts only');

    return cachedContexts;
  } catch (error) {
    console.warn('[KeyMoments] Error generating batched moment contexts:', error);
    return cachedContexts;
  }
}

/**
 * Process live games to detect key moments
 */
async function processLiveGames(): Promise<void> {
  try {
    // Clean up finished games
    await cleanupFinishedGames();

    const scoreboardData = await dataCache.getScoreboard();
    if (!scoreboardData?.scoreboard?.games) {
      return;
    }

    // Get all live games
    const liveGames = scoreboardData.scoreboard.games
      .filter((game: any) => game.gameStatus === 2)
      .map((game: any) => game.gameId);

    // Clean up caches for games no longer live
    const cachedGameIds = Array.from(keyMomentsCache.keys());
    for (const gameId of cachedGameIds) {
      const game = scoreboardData.scoreboard.games.find((g: any) => g.gameId === gameId);
      if (!game || game.gameStatus !== 2) {
        keyMomentsCache.delete(gameId);
        lastCheckedPlays.delete(gameId);
      }
    }

    // Detect moments for each live game
    const allMomentsNeedingContext: MomentWithGameInfo[] = [];

    for (const gameId of liveGames) {
      try {
        const moments = await detectKeyMoments(gameId);
        if (moments.length > 0) {
          console.log(`[KeyMoments] Detected ${moments.length} key moments for game ${gameId}`);

          // Find game info
          const game = scoreboardData.scoreboard.games.find((g: any) => g.gameId === gameId);
          if (game) {
            const gameInfo: GameInfo = {
              game_id: gameId,
              home_team: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`.trim(),
              away_team: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`.trim(),
              home_score: game.homeTeam.score || 0,
              away_score: game.awayTeam.score || 0,
              period: game.period,
              clock: game.gameClock || ''
            };

            // Collect moments needing context
            for (const moment of moments) {
              if (!moment.context) {
                const momentId = `${gameId}:${moment.timestamp}`;
                allMomentsNeedingContext.push({
                  moment_id: momentId,
                  moment: moment,
                  game_info: gameInfo
                });
              }
            }

            // Broadcast moments via WebSocket
            await webSocketManager.broadcastKeyMomentsToAllClientsScoreBoard({
              type: 'key_Moments',
              moments,
              gameId
            });
          }
        }
      } catch (error) {
        console.warn(`[KeyMoments] Error detecting moments for game ${gameId}:`, error);
      }
    }

    // Batch generate context for all moments that need it
    if (allMomentsNeedingContext.length > 0) {
      console.log(
        `[KeyMoments] Generating batched context for ${allMomentsNeedingContext.length} moments`
      );
      const contexts = await generateBatchedMomentContexts(allMomentsNeedingContext);

      // Apply contexts to cached moments
      for (const item of allMomentsNeedingContext) {
        if (item.moment_id in contexts) {
          item.moment.context = contexts[item.moment_id];

          // Update cache
          const gameId = item.moment_id.split(':')[0];
          const moments = keyMomentsCache.get(gameId);
          if (moments) {
            for (const cachedMoment of moments) {
              if (cachedMoment.timestamp === item.moment.timestamp) {
                cachedMoment.context = contexts[item.moment_id];
                break;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[KeyMoments] Error processing live games:', error);
  }
}

export function startCleanupTask(): void {
  if (cleanupTask) {
    clearInterval(cleanupTask);
  }

  cleanupTask = setInterval(() => {
    cleanupFinishedGames().catch((error) => {
      console.error('[KeyMoments] Warning: Error cleaning up finished games:', error);
    });
  }, 300000); // 5 minutes

  console.log('[KeyMoments] Started periodic cleanup task');
}

export function startProcessingTask(): void {
  if (processingTask) {
    clearInterval(processingTask);
  }

  processingTask = setInterval(() => {
    processLiveGames().catch((error) => {
      console.error('[KeyMoments] Warning: Error processing live games:', error);
    });
  }, 30000); // 30 seconds

  console.log('[KeyMoments] Started key moments detection task');
}

 
export function stopCleanupTask(): void {
  if (cleanupTask) {
    clearInterval(cleanupTask);
    cleanupTask = null;
    console.log('[KeyMoments] Stopped periodic cleanup task');
  }
}

export function stopProcessingTask(): void {
  if (processingTask) {
    clearInterval(processingTask);
    processingTask = null;
    console.log('[KeyMoments] Stopped key moments detection task');
  }
}

export const keyMomentsService = {
  detectKeyMoments,
  getKeyMomentsForGame,
  processLiveGames,
  cleanupFinishedGames,
  KeyMomentType
};

export default keyMomentsService;