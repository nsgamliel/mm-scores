import pg from "pg";
const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT
});

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

const createTeam = async (name, char6, seed) => {
  try {
    await pool.query('INSERT INTO teams (name, char6, seed, intournament, confirmedpts, inprogresspts, year) VALUES ($1, $2, $3, true, 0, 0, 2024)', [name, char6, seed]);
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
    if (!(await teamExists(team.names.char6))) {
      createTeam(team.names.full, team.names.char6, team.seed);
    }
  }
}

const ensureGameExists = async (gameId, home, away) => {
  if (!(await gameExists(gameId))) {
    createGame(gameId, false);
  }
  ensureTeamsExist([home, away]);
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

const finalizeScore = async (team) => {
  try {
    const currentPts = await getPoints(team.names.char6);
    await pool.query('UPDATE teams SET intournament = $1, confirmedpts = $2, inprogresspts = 0 WHERE char6 = $3', [team.winner, currentPts + Number(team.score), team.names.char6]);
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
  try {
    await pool.query('UPDATE teams SET inprogresspts = $1 WHERE char6 = $2', [Number(team.score), team.names.char6]);
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

export const updateScores = async () => {
  console.log('ping...');
  const req = await fetch(`https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/2024/03/21/scoreboard.json`);
  try {
    const json = await req.json();
    for (const game of json.games) {
      if (!roundsNames.includes(game.game.bracketRound)) continue;
      const gameId = game.game.url.split('/')[2];
      const home = game.game.home;
      const away = game.game.away;
      // console.log(gameId);

      await ensureGameExists(gameId, home, away);

      if (game.game.finalMessage === "FINAL" && !(await gameFinalProcessed(gameId))) {
        finalizeScore(home);
        finalizeScore(away);
        closeGame(gameId);
      } else if (game.game.finalMessage !== "FINAL") {
        progressScore(home);
        progressScore(away);
      }
    }
    console.log('done.');
  } catch (err) {
    throw err;
  }
};