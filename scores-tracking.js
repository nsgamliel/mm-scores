import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: true
});

export const dropTables = async () => {
  try {
    const res = await pool.query(`
      DROP TABLE teams;
      DROP TABLE games;
    `);
  } catch (err) {
    throw err;
  }
};

export const createGamesTable = async () => {
  try {
    const res = await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        gameid INT,
        finalscoreprocessed BOOLEAN,
        year INT
      );
    `);
  } catch (err) {
    throw err;
  }
};

export const createTeamsTable = async () => {
  try {
    const res = await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short VARCHAR(255) NOT NULL,
        char6 VARCHAR(7) NOT NULL UNIQUE,
        seed INT,
        intournament BOOLEAN,
        eliminatedon VARCHAR(255),
        confirmedpts INT,
        inprogresspts INT,
        year INT
      );
    `);
  } catch (err) {
    throw err;
  }
};

const createGame = async (id, processed) => {
  try {
    const res = await pool.query('INSERT INTO games (gameid, finalscoreprocessed, year) VALUES ($1, $2, 2024) RETURNING *', [id, processed]);
  } catch (err) {
    throw err;
  }
};

const gameExists = async (id) => {
  try {
    const res = await pool.query('SELECT gameid FROM games WHERE gameid = $1 ORDER BY id ASC', [id]);
    if (res.rows.length === 1) {
      return true;
    }
    if (res.rows.length > 1) {
      throw new Error(`Error: multiple games found with same gameid ${id}`);
    }
    return false;
  } catch (err) {
    throw err;
  }
};

const gameFinalProcessed = async (id) => {
  try {
    const res = await pool.query('SELECT finalscoreprocessed FROM games WHERE gameid = $1 ORDER BY id ASC', [id]);
    if (res.rows.length === 1) {
      return res.rows[0].finalscoreprocessed;
    }
    if (res.rows.length > 1) {
      throw new Error(`Error: multiple games found with same gameid ${id}`);
    }
    return false;
  } catch (err) {
    throw err;
  }
};

const createTeam = async (name, short, char6, seed) => {
  try {
    await pool.query("INSERT INTO teams (name, short, char6, seed, intournament, eliminatedon, confirmedpts, inprogresspts, year) VALUES ($1, $2, $3, $4, true, '', 0, 0, 2024)", [name, short, char6, seed]);
  } catch (err) {
    throw err;
  }
}

const teamExists = async (char6) => {
  try {
    const res = await pool.query('SELECT name FROM teams WHERE char6 = $1 ORDER BY id ASC', [char6]);
    if (res.rows.length === 1) {
      return true;
    }
    if (res.rows.length > 1) {
      throw new Error(`Error: multiple teams found with same char6 ${id}`);
    }
    return false;
  } catch (err) {
    throw err;
  }
};

export const ensureTeamsExist = async (teams) => {
  for (const team of teams) {
    // console.log(team.names);
    if (team.names.char6 !== '' && !(await teamExists(team.names.char6))) {
      // console.log(`creating team ${team.names.char6}`);
      await createTeam(team.names.full, team.names.short, team.names.char6, team.seed);
    }
  }
};

const ensureGameExists = async (gameId, home, away) => {
  if (!(await gameExists(gameId))) {
    // console.log(`creating game ${gameId}`);
    await createGame(gameId, false);
  }
  await ensureTeamsExist([home, away]);
};

const getPoints = async (char6) => {
  try {
    const res = await pool.query('SELECT confirmedpts FROM teams WHERE char6 = $1', [char6]);
    if (res.rows.length === 1) {
      return res.rows[0].confirmedpts;
    }
    if (res.rows.length > 1) {
      throw new Error(`Error: multiple teams found with same char6 ${id}`);
    }
    return false;
  } catch (err) {
    throw err;
  }
}

const finalizeScore = async (team, dateStr) => {
  try {
    const currentPts = await getPoints(team.names.char6);
    // console.log(team.winner, currentPts + Number(team.score), team.names.char6);
    const res = await pool.query(
      'UPDATE teams SET intournament=$1, eliminatedon=$2, confirmedpts=$3, inprogresspts=0 WHERE char6=$4 RETURNING confirmedpts', 
      [team.winner, team.winner ? "" : dateStr, currentPts + Number(team.score), team.names.char6]
    );
    // console.log(res.rows);
  } catch (err) {
    throw err;
  }
};

const closeGame = async (gameId) => {
  try {
    await pool.query('UPDATE games SET finalscoreprocessed = true WHERE gameid = $1', [gameId]);
  } catch (err) {
    throw err;
  }
};

const progressScore = async (team) => {
  // console.log(team);
  try {
    await pool.query("UPDATE teams SET inprogresspts = $1 WHERE char6 = $2", [Number(team.score), team.names.char6]);
  } catch (err) {
    throw err;
  }
};

export const forceTwoDig = num => {
  if (num > 0 && num < 10) {
    return `0${num.toString()}`;
  } else if (num >= 10 && num < 100) {
    return num.toString();
  }
  throw new Error('Error: invalid date.')
};

const roundsNames = ['First Round', 'Second Round', 'Sweet 16&#174;', 'Elite Eight&#174;', 'FINAL FOUR&#174;', 'Championship'];

export const updateScores = async (year, month, day) => {
  console.log('ping...', `${year}/${forceTwoDig(month)}/${forceTwoDig(day)}`);
  const req = await fetch(`https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/${year}/${forceTwoDig(month)}/${forceTwoDig(day)}/scoreboard.json`);
  try {
    const json = await req.json();
    // console.log(json);
    if (json.games) {
      for (const game of json.games) {
        // console.log(game);
        if (!roundsNames.includes(game.game.bracketRound)) continue;
        if (game.game.gameID === '') continue;
        const gameId = game.game.url.split('/')[2];
        const home = game.game.home;
        const away = game.game.away;
        const dateStr = game.game.startDate;
        // console.log(gameId);

        await ensureGameExists(gameId, home, away);

        // console.log(game.game.finalMessage.split(' ')[0]);

        const finalMessage = game.game.finalMessage.split(' ')[0];

        if (finalMessage === "FINAL" && !(await gameFinalProcessed(gameId))) {
          // console.log(`found final game ${gameId}`);
          await finalizeScore(home, dateStr);
          await finalizeScore(away, dateStr);
          await closeGame(gameId);
        } else if (finalMessage !== "FINAL" && game.game.gameState !== 'pre') {
          // console.log(`game ${gameId} still in progress`);
          await progressScore(home);
          await progressScore(away);
        }
      }
    }
    console.log('done.');
  } catch (err) {
    throw err;
  }
};