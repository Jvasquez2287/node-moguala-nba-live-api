/*
 Daily Lineups: https://stats.nba.com/js/data/leaders/00_daily_lineups_20241121.json
It looks like you can replace that date with anything less than or equal to today's date.

Player Transactions: https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json

schedule  https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json
 
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

import axios from 'axios';

