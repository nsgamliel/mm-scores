import { ensureTeamsExist, forceTwoDig } from "./scores-tracking.js";

// const Pool = require('pg').Pool;
// const pool = new Pool({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT
// });

export const populateTeams = async (year, month, dayStart, dayEnd) => {
  try {
    for (let day=dayStart; day<=dayEnd; day++) {
      const req = await fetch(`https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/${year}/${forceTwoDig(month)}/${forceTwoDig(day)}/scoreboard.json`);
      const json = await req.json();

      for (const game of json.games) {
        if (game.game.bracketRound !== 'First Round') continue;
        const home = game.game.home;
        const away = game.game.away;
        ensureTeamsExist([home, away]);
      }
    }
  } catch (err) {
    throw err;
  }
};