/**
 * Mock data service for testing WebSocket broadcasts
 * Generates realistic NBA scoreboard and play-by-play data
 */

import * as winston from 'winston';


const TEAMS = [
  { id: '1610612738', name: 'Boston Celtics', abbreviation: 'BOS' },
  { id: '1610612751', name: 'Brooklyn Nets', abbreviation: 'BRK' },
  { id: '1610612752', name: 'New York Knicks', abbreviation: 'NYK' },
  { id: '1610612761', name: 'Toronto Raptors', abbreviation: 'TOR' },
  { id: '1610612741', name: 'Chicago Bulls', abbreviation: 'CHI' },
  { id: '1610612739', name: 'Cleveland Cavaliers', abbreviation: 'CLE' },
  { id: '1610612765', name: 'Detroit Pistons', abbreviation: 'DET' },
  { id: '1610612754', name: 'Indiana Pacers', abbreviation: 'IND' },
  { id: '1610612749', name: 'Milwaukee Bucks', abbreviation: 'MIL' },
  { id: '1610612953', name: 'New Orleans Pelicans', abbreviation: 'NOP' },
  { id: '1610612762', name: 'Utah Jazz', abbreviation: 'UTA' },
  { id: '1610612744', name: 'Los Angeles Lakers', abbreviation: 'LAL' },
  { id: '1610612746', name: 'Los Angeles Clippers', abbreviation: 'LAC' },
  { id: '1610612743', name: 'Denver Nuggets', abbreviation: 'DEN' },
  { id: '1610612937', name: 'Atlanta Hawks', abbreviation: 'ATL' },
];

export function generateMockScoreboard() {
  const gameDate = new Date().toISOString().split('T')[0];
  const games = [];

  // Generate 3-5 mock games
  const gameCount = Math.floor(Math.random() * 3) + 3;

  for (let i = 0; i < gameCount; i++) {
    const homeTeamIndex = Math.floor(Math.random() * TEAMS.length);
    let awayTeamIndex = Math.floor(Math.random() * TEAMS.length);
    
    // Ensure different teams
    while (awayTeamIndex === homeTeamIndex) {
      awayTeamIndex = Math.floor(Math.random() * TEAMS.length);
    }

    const homeTeam = TEAMS[homeTeamIndex];
    const awayTeam = TEAMS[awayTeamIndex];

    const gameStatuses = ['1', '2', '3', '4']; // 1=not started, 2=in progress, 3=halftime, 4=final
    const gameStatus = gameStatuses[Math.floor(Math.random() * gameStatuses.length)];

    const game = {
      gameId: `${gameDate}_${homeTeam.abbreviation}_${awayTeam.abbreviation}`,
      gameDate,
      gameTime: `${String(Math.floor(Math.random() * 12) + 7).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      gameStatus: parseInt(gameStatus),
      period: gameStatus === '1' ? 0 : gameStatus === '2' ? Math.floor(Math.random() * 4) + 1 : gameStatus === '3' ? 2 : 4,
      gameTimeUTC: new Date().toISOString(),
      homeTeam: {
        teamId: homeTeam.id,
        teamName: homeTeam.name,
        teamAbbreviation: homeTeam.abbreviation,
        score: Math.floor(Math.random() * 50) + 50,
      },
      awayTeam: {
        teamId: awayTeam.id,
        teamName: awayTeam.name,
        teamAbbreviation: awayTeam.abbreviation,
        score: Math.floor(Math.random() * 50) + 50,
      },
    };

    games.push(game);
  }

  return {
    scoreboard: {
      gameDate,
      games,
    },
  };
}

export function generateMockPlaybyplay(gameId: string) {
  const plays = [];
  const playCount = Math.floor(Math.random() * 30) + 10;

  const playTypes = ['2pt', '3pt', 'FT', 'FOUL', 'REB', 'TO', 'AST', 'STL', 'BLK'];

  for (let i = 0; i < playCount; i++) {
    const playType = playTypes[Math.floor(Math.random() * playTypes.length)];
    const period = Math.floor(Math.random() * 4) + 1;
    const minutes = Math.floor(Math.random() * 12);
    const seconds = Math.floor(Math.random() * 60);

    plays.push({
      action_number: i + 1,
      game_id: gameId,
      period,
      period_type: 'Regular Period',
      game_clock: `${String(11 - minutes).padStart(2, '0')}:${String(60 - seconds).padStart(2, '0')}`,
      play_type: playType,
      player_id: Math.floor(Math.random() * 999999) + 1,
      player_name: `Player ${i + 1}`,
      team_id: TEAMS[Math.floor(Math.random() * TEAMS.length)].id,
      home_score: Math.floor(Math.random() * 100),
      away_score: Math.floor(Math.random() * 100),
      description: `${playType} made by Player ${i + 1}`,
    });
  }

  return {
    game_id: gameId,
    plays,
  };
}

console.log('Mock data service initialized');
