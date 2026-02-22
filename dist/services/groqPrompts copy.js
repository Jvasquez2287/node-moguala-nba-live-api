"use strict";
/**
 * Prompt generation for Groq LLM for NBA game insights and analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemMessage = getSystemMessage;
exports.buildInsightPrompt = buildInsightPrompt;
exports.getLiveGameSystemMessage = getLiveGameSystemMessage;
exports.buildLiveGameInsightPrompt = buildLiveGameInsightPrompt;
exports.getBatchedInsightsSystemMessage = getBatchedInsightsSystemMessage;
exports.buildBatchedInsightsPrompt = buildBatchedInsightsPrompt;
exports.getKeyMomentSystemMessage = getKeyMomentSystemMessage;
exports.buildKeyMomentContextPrompt = buildKeyMomentContextPrompt;
exports.getBatchedMomentContextSystemMessage = getBatchedMomentContextSystemMessage;
exports.buildBatchedMomentContextPrompt = buildBatchedMomentContextPrompt;
/**
 * Get the system message for Groq LLM
 */
function getSystemMessage() {
    return ('You are an NBA game analysis assistant. Turn provided numbers into short, clear insights. ' +
        'Do NOT calculate, invent, or contradict numbers. Only explain what the numbers say. ' +
        'Stay neutral if unclear. No hype, no opinions. ' +
        'Return only valid JSON arrays in format: [{"title": "...", "description": "..."}]. ' +
        'No markdown, no explanations outside JSON.');
}
/**
 * Build the user prompt for generating AI insights
 */
function buildInsightPrompt(options) {
    const { homeTeamName, awayTeamName, homeWinProbPct, awayWinProbPct, predictedHomeScore, predictedAwayScore, netRatingDiffStr = '' } = options;
    const scoreDiff = Math.abs(predictedHomeScore - predictedAwayScore);
    const probDiff = Math.abs(homeWinProbPct - awayWinProbPct);
    const homeIsFavored = homeWinProbPct > awayWinProbPct;
    const favoredTeam = homeIsFavored ? homeTeamName : awayTeamName;
    const underdogTeam = homeIsFavored ? awayTeamName : homeTeamName;
    const favoredProb = homeIsFavored ? homeWinProbPct : awayWinProbPct;
    const underdogProb = homeIsFavored ? awayWinProbPct : homeWinProbPct;
    const winningTeamByScore = predictedHomeScore > predictedAwayScore ? homeTeamName : awayTeamName;
    let efficiencyExample = '';
    if (netRatingDiffStr) {
        const teamMatch = netRatingDiffStr.match(/\(([^)]+)\)/);
        const teamWithBetterRating = teamMatch ? teamMatch[1].trim() : '';
        if (teamWithBetterRating) {
            efficiencyExample =
                `- "Efficiency Edge" | "Net rating data favors ${teamWithBetterRating} in overall team performance."`;
        }
        else {
            efficiencyExample =
                '- "Efficiency Edge" | "Net rating data favors the favored team in overall team performance."';
        }
    }
    return `You are an NBA game analysis assistant.

Your job is to TURN PROVIDED NUMBERS into short, clear, human-readable insights.

Rules (non-negotiable):
- You MUST NOT calculate probabilities, scores, or stats.
- You MUST NOT invent numbers or change provided values.
- You MUST NOT contradict the inputs.
- You MUST NOT label teams as underdogs/favorites unless the probabilities clearly support it.
- You ONLY explain what the numbers already say.
- If information is unclear, stay neutral.
- No hype, no opinions, no predictions beyond the data.

NBA context:
- Home teams usually have a small advantage.
- Large probability gaps (>15%) indicate a clear favorite.
- Small gaps (<10%) indicate a competitive game.
- Score differences of 5–8 points = moderate margin.
- Do not restate numbers unless explaining them.

PROVIDED DATA:
Home Team: ${homeTeamName}
Away Team: ${awayTeamName}

Home Win Probability: ${homeWinProbPct.toFixed(1)}%
Away Win Probability: ${awayWinProbPct.toFixed(1)}%

Predicted Score:
${homeTeamName} ${predictedHomeScore.toFixed(0)}
${awayTeamName} ${predictedAwayScore.toFixed(0)}${netRatingDiffStr}

CRITICAL - VERIFY BEFORE WRITING:
- Favored team: ${favoredTeam} (${favoredProb.toFixed(1)}% win probability)
- Underdog team: ${underdogTeam} (${underdogProb.toFixed(1)}% win probability)
- Predicted winner by score: ${winningTeamByScore} (${Math.max(predictedHomeScore, predictedAwayScore).toFixed(0)} points)
- Score difference: ${scoreDiff.toFixed(0)} points
- Probability difference: ${probDiff.toFixed(1)} percentage points

CONSISTENCY REQUIREMENTS:
- ALL insights must agree: ${favoredTeam} is favored (if prob_diff >= 5%).
- NEVER say ${underdogTeam} is favored when ${favoredTeam} has higher probability.
- NEVER contradict the win probabilities or predicted scores.
- If probability gap is <5%, stay neutral about favorites.

OUTPUT FORMAT:
Return JSON array: [{"title": "Short title", "description": "1-2 line explanation"}]

Example format:
- "Clear Win Probability" | "${favoredTeam} holds a strong advantage based on win probability."
- "Moderate Margin Expected" | "The predicted score suggests a steady but competitive win."
${efficiencyExample ? efficiencyExample : ''}

Generate 2-3 insights. INTERPRET the data, don't repeat numbers.`;
}
/**
 * Get system message for live game insights
 */
function getLiveGameSystemMessage() {
    return ('You are an NBA live-game interpreter. Convert game data into short, factual insights. ' +
        'Use ONLY provided data. Do NOT calculate, predict, or invent anything. ' +
        'Return only valid JSON in format: {"insight": "..."}. ' +
        'No markdown, no explanations outside JSON.');
}
/**
 * Build the user prompt for generating live game insights
 */
function buildLiveGameInsightPrompt(options) {
    const { homeTeam, awayTeam, homeScore, awayScore, period, clock, lastThreePlays, topPerformer = '', triggerType = 'score_change' } = options;
    const scoreDiff = Math.abs(homeScore - awayScore);
    const leadingTeam = homeScore > awayScore ? homeTeam : awayTeam;
    const trailingTeam = homeScore > awayScore ? awayTeam : homeTeam;
    const isClose = scoreDiff < 6;
    const hasControl = scoreDiff >= 10;
    const isLateGame = period >= 4 || (period === 3 && clock && clock.includes('2:00'));
    const isOvertime = period >= 5;
    const playsText = lastThreePlays && lastThreePlays.length > 0
        ? lastThreePlays.map((play, i) => `${i + 1}. ${play}`).join('\n')
        : 'No recent plays available.';
    const topPerformerText = topPerformer ? `\n\nTop Performer:\n${topPerformer}` : '';
    const triggerContextMap = {
        score_change: 'A score change has occurred.',
        period_change: 'The period has changed.',
        timeout: 'A timeout has occurred.',
        momentum: 'Multiple consecutive scoring plays by one team indicate momentum.',
        end_of_quarter: 'The quarter has ended.',
        overtime: 'The game has entered overtime.'
    };
    const triggerContext = triggerContextMap[triggerType] || 'A game event has occurred.';
    return `You are an NBA live-game interpreter.

Your ONLY job is to convert live game data into short, accurate, human-readable insights.

CRITICAL RULES:
- You MUST use ONLY the data provided.
- You MUST NOT calculate, predict, or estimate anything.
- You MUST NOT invent stats, trends, or momentum.
- You MUST NOT contradict the score, clock, or play-by-play.
- You MUST NOT speculate about outcomes.
- If information is unclear or neutral, say nothing meaningful rather than guessing.

STYLE RULES:
- 1–2 sentences max
- Neutral, factual, calm
- No hype, no emojis, no opinionated language
- ESPN broadcast tone, not Twitter

GAME STATE SNAPSHOT:

Home Team: ${homeTeam}
Away Team: ${awayTeam}

Score:
${homeTeam}: ${homeScore}
${awayTeam}: ${awayScore}

Period: ${period}
Time Remaining: ${clock}

Last 3 Plays:
${playsText}${topPerformerText}

TRIGGER: ${triggerContext}

KNOWN CONTEXT:
- Lead < 6 points = close game
- Lead >= 10 points = control
- Late game (4th quarter or final 2 minutes) = increased importance
- Repeated scoring plays by same team = momentum
- Fouls, turnovers, timeouts = momentum shifts

CURRENT STATE:
- Score difference: ${scoreDiff} points
- Leading team: ${leadingTeam}
- Game type: ${isClose ? 'Close' : hasControl ? 'Control' : 'Competitive'}
- Time context: ${isLateGame ? 'Late game' : 'Early/Mid game'}
- Period type: ${isOvertime ? 'Overtime' : `Period ${period}`}

TASK:
Generate ONE short insight that explains what is happening RIGHT NOW based on the trigger and current game state.

OUTPUT FORMAT (JSON ONLY):
{"insight": "single clear sentence explaining the current game state"}

Examples:
{"insight":"Philadelphia has opened a small lead late in the second quarter, keeping control heading into halftime."}
{"insight":"Dallas has trimmed the deficit with back-to-back scoring plays, making this a one-possession game."}
{"insight":"The game has slowed down as both teams trade half-court possessions in a tight contest."}
{"insight":"The teams remain evenly matched as play continues without a clear momentum shift."}

Generate ONE insight. Be factual, neutral, and explain what the data shows RIGHT NOW.`;
}
/**
 * Get system message for batched live game insights
 */
function getBatchedInsightsSystemMessage() {
    return ('You are an NBA live-game analyst. Explain changes, not outcomes. ' +
        'Only explain what the numbers already show. ' +
        'If nothing meaningful changed, return type = "none". ' +
        'Return only valid JSON. No markdown, no explanations outside JSON.');
}
/**
 * Build prompt for batched insights across all games
 */
function buildBatchedInsightsPrompt(games) {
    const gamesJson = JSON.stringify(games, null, 2);
    return `Generate live insights for the following NBA games.

Only return insights for games where something meaningful changed since the last update.

GAMES:
${gamesJson}

DATA PROVIDED:
- Scores (home_score, away_score)
- Quarter (1-4, or 5+ for OT)
- Time remaining in quarter
- Last event (game status text)
- Win probabilities (calculated from scores if available)

RULES:
- 1–2 sentences max per insight
- No speculation
- No player praise
- No stats beyond what is provided
- Focus on what changed (score changes, quarter changes, momentum shifts)
- If nothing meaningful changed, return type = "none"

OUTPUT FORMAT (STRICT JSON):
{
  "timestamp": "ISO-8601",
  "insights": [
    {
      "game_id": "string",
      "type": "momentum | lead_change | run | close_game | blowout | none",
      "text": "One sentence explanation of what changed"
    }
  ]
}

IMPORTANT: You MUST return at least one insight for each game provided, even if the change is minimal.
Only use type="none" if the game is not live or has no data.
For live games with scores, always provide an insight describing the current game state.`;
}
/**
 * Get system message for key moment context
 */
function getKeyMomentSystemMessage() {
    return ('You are an NBA game analyst. Explain why a key moment matters in one short sentence. ' +
        'Be factual and neutral. Return only valid JSON in format: {"context": "..."}. ' +
        'No markdown, no explanations outside JSON.');
}
/**
 * Build prompt for key moment context
 */
function buildKeyMomentContextPrompt(options) {
    const { momentType, gameInfo, play } = options;
    const typeDescriptions = {
        game_tying_shot: 'A shot that tied the game',
        lead_change: 'A play that changed which team is leading',
        scoring_run: 'A team scoring multiple times in quick succession',
        clutch_play: 'An important play in the final minutes of a close game',
        big_shot: 'A significant 3-pointer that changes the game situation'
    };
    const momentDescription = typeDescriptions[momentType] || 'An important game moment';
    const scoreDiff = Math.abs(gameInfo.homeScore - gameInfo.awayScore);
    const leadingTeam = gameInfo.homeScore > gameInfo.awayScore ? gameInfo.homeTeam : gameInfo.awayTeam;
    return `You are an NBA game analyst. Explain why this key moment matters.

MOMENT TYPE: ${momentDescription}

GAME STATE:
Home Team: ${gameInfo.homeTeam} (${gameInfo.homeScore})
Away Team: ${gameInfo.awayTeam} (${gameInfo.awayScore})
Period: ${gameInfo.period}
Time: ${gameInfo.clock}
Score Difference: ${scoreDiff} points
Leading: ${leadingTeam}

THE PLAY:
Team: ${play.teamTricode}
Player: ${play.playerName || 'N/A'}
Action: ${play.actionType || 'N/A'}
Description: ${play.description || 'N/A'}

TASK:
Explain in ONE short sentence (max 15 words) why this moment matters in the context of the game.

STYLE:
- Factual and neutral
- No hype or exaggeration
- Focus on game impact
- ESPN broadcast tone

OUTPUT FORMAT (STRICT JSON):
{"context": "one short sentence explaining why this moment matters"}

Examples:
{"context": "This shot tied the game with 2 minutes remaining, setting up a tight finish."}
{"context": "The lead change gives the visiting team momentum heading into the final quarter."}
{"context": "The scoring run extends the lead to double digits, putting pressure on the opponent."}

Generate the context.`;
}
/**
 * Get system message for batched moment context
 */
function getBatchedMomentContextSystemMessage() {
    return ('You are an NBA game analyst. Generate context for multiple key moments. ' +
        'For each moment, explain why it matters in one short sentence. ' +
        'Be factual and neutral. Return only valid JSON. No markdown, no explanations outside JSON.');
}
/**
 * Build prompt for batched moment context
 */
function buildBatchedMomentContextPrompt(momentsWithGameInfo) {
    const typeDescriptions = {
        game_tying_shot: 'A shot that tied the game',
        lead_change: 'A play that changed which team is leading',
        scoring_run: 'A team scoring multiple times in quick succession',
        clutch_play: 'An important play in the final minutes of a close game',
        big_shot: 'A significant 3-pointer that changes the game situation'
    };
    const momentsData = momentsWithGameInfo.map((item) => {
        const { momentId, moment, gameInfo } = item;
        const momentType = moment.type;
        const play = moment.play;
        const scoreDiff = Math.abs(gameInfo.homeScore - gameInfo.awayScore);
        const leadingTeam = gameInfo.homeScore > gameInfo.awayScore ? gameInfo.homeTeam : gameInfo.awayTeam;
        const momentDescription = typeDescriptions[momentType] || 'An important game moment';
        return {
            moment_id: momentId,
            game: `${gameInfo.homeTeam} vs ${gameInfo.awayTeam}`,
            moment_type: momentDescription,
            game_state: {
                home_score: gameInfo.homeScore,
                away_score: gameInfo.awayScore,
                period: gameInfo.period,
                clock: gameInfo.clock,
                score_diff: scoreDiff,
                leading: leadingTeam
            },
            play: {
                team: play.team_tricode || '',
                player: play.player_name || '',
                action: play.action_type || '',
                description: play.description || ''
            }
        };
    });
    const momentsJson = JSON.stringify(momentsData, null, 2);
    return `You are an NBA game analyst. Generate context for multiple key moments.

MOMENTS:
${momentsJson}

TASK:
For each moment, explain in ONE short sentence (max 15 words) why it matters in the context of the game.

STYLE:
- Factual and neutral
- No hype or exaggeration
- Focus on game impact
- ESPN broadcast tone

OUTPUT FORMAT (STRICT JSON):
{
  "contexts": [
    {"moment_id": "moment_1", "context": "one short sentence explaining why this moment matters"},
    {"moment_id": "moment_2", "context": "one short sentence explaining why this moment matters"}
  ]
}

EXAMPLES:
{"moment_id": "moment_1", "context": "This shot tied the game with 2 minutes remaining, setting up a tight finish."}
{"moment_id": "moment_2", "context": "The lead change gives the visiting team momentum heading into the final quarter."}

Generate contexts for all moments.`;
}
exports.default = {
    getSystemMessage,
    buildInsightPrompt,
    getLiveGameSystemMessage,
    buildLiveGameInsightPrompt,
    getBatchedInsightsSystemMessage,
    buildBatchedInsightsPrompt,
    getKeyMomentSystemMessage,
    buildKeyMomentContextPrompt,
    getBatchedMomentContextSystemMessage,
    buildBatchedMomentContextPrompt
};
//# sourceMappingURL=groqPrompts%20copy.js.map