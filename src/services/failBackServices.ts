import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';
import {
  BoxScoreResponse,
  PlayByPlayResponse,
  ScoreboardResponse,
  Team,
  GameLeaders,
  PlayerStats,
  PlayerBoxScoreStats,
  TeamBoxScoreStats,
  PlayByPlayEvent
} from '../schemas/scoreboard';


/**
 *  Daily Lineups: https://stats.nba.com/js/data/leaders/00_daily_lineups_20241121.json
It looks like you can replace that date with anything less than or equal to today's date.

Player Transactions: https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json

edit: I just found the full regular and preseason schedule as well! https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json

My already known endpoints are:

Gambling Odds: https://cdn.nba.com/static/json/liveData/odds/odds_todaysGames.json
Today's Scoreboard (12pm EST refresh): https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json
*Play by Play: https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_0022400247.json
*Box Score: https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0022400247.json
*Playoff Picture: https://stats.nba.com/stats/playoffbracket?LeagueID=00&SeasonYear=2024&State=0
https://stats.nba.com/stats/playoffbracket?LeagueID=00&SeasonYear=2024&State=1
https://stats.nba.com/stats/playoffbracket?LeagueID=00&SeasonYear=2024&State=2
Broadcasts: https://cdn.nba.com/static/json/liveData/channels/v2/channels_00.json

*Box Score and Play By Play: Replace 22400247 with game_id of desired game For example, to view the Cavs/Celtics game from the other night, replace with 22400021. In most cases, the game_id will be between 2__00001 and - 2__01230. replace __ with the last two digits of the year the season ends in (24, 23, 22, etc...). These two endpoints only go back to 2019-2020 I believe.
Some examples:
https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0022400176.json
https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_0022400196.json
2023: https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0022301170.json
2022: https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_0022200879.json 
 */
const dailyLineupsUrl = (date: string) => `https://stats.nba.com/js/data/leaders/00_daily_lineups_${date}.json`;
const playerTransactionsUrl = 'https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json';
const fullScheduleUrl = 'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json';
const gamblingOddsUrl = 'https://cdn.nba.com/static/json/liveData/odds/odds_todaysGames.json';
const todaysScoreboardUrl = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
const broadcastsUrl = 'https://cdn.nba.com/static/json/liveData/channels/v2/channels_00.json';
const playByPlayUrl = (gameId: string) => `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`;
const boxScoreUrl = (gameId: string) => `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
const playoffPictureUrl = (seasonYear: string, state: string) => `https://stats.nba.com/stats/playoffbracket?LeagueID=00&SeasonYear=${seasonYear}&State=${state}`;

// Generic function to fetch data from a given URL with error handling
async function fetchData(url: string) {
  try {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
    } catch (error) {
        console.error(`Failed to fetch data from ${url}:`, error);
        throw error;
    }
}

// Placeholder for any future data formatting needs
async function formatData(data: any) {
    // Switch case or if-else logic can be added here to format data based on the endpoint
    switch (data.type) {
     case 'scoreboard':
        // Example: Format scoreboard data if needed
        return data; // Return formatted data
     case 'schedule':
        // Example: Format schedule data if needed
        return data; // Return formatted data
     default:
        return data; // Return raw data if no formatting is needed
    }
 
}

// Exported service functions to fetch data from NBA endpoints
export const failBackServices = {
    fetchDailyLineups: (date: string) => fetchData(dailyLineupsUrl(date)),
    fetchPlayerTransactions: () => fetchData(playerTransactionsUrl),
    fetchFullSchedule: () => fetchData(fullScheduleUrl),
    fetchGamblingOdds: () => fetchData(gamblingOddsUrl),
    fetchTodaysScoreboard: () => fetchData(todaysScoreboardUrl),
    fetchBroadcasts: () => fetchData(broadcastsUrl),
    fetchPlayByPlay: (gameId: string) => fetchData(playByPlayUrl(gameId)),
    fetchBoxScore: (gameId: string) => fetchData(boxScoreUrl(gameId)),
    fetchPlayoffPicture: (seasonYear: string, state: string) => fetchData(playoffPictureUrl(seasonYear, state)),
};