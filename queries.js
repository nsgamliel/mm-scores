import pg from "pg";
import { updateScores } from "./scores-tracking.js";
const { Pool } = pg;
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: true
});

export const getTeams = (request, response) => {
  console.log('Fetching all teams.');
  const date = new Date();
  updateScores(2025, date.getMonth() + 1, date.getDate());
  pool.query('SELECT * FROM teams ORDER BY seed ASC', (error, results) => {
    if (error) {
      throw error;
    }
    // console.log(results.rows);
    response.status(200).json(results.rows);
  });
};
