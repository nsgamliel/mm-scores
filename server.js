import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getTeams } from './queries.js';
import { updateScores, dropTables, createGamesTable, createTeamsTable } from './scores-tracking.js';
import { populateTeams, populateGames } from './db-utils.js';

const app = express();
const PORT = process.env.PORT;

// populateTeams(2024, 3, 21, 22);

const seedData = async () => {
  await dropTables();
  await createTeamsTable();
  await createGamesTable();
  await populateGames(2025,3,20,31);
  await populateGames(2025,4,1,8);
}; 
// seedData();

setInterval(() => updateScores(2025, (new Date()).getMonth() + 1, (new Date()).getDate()), 1000 * 60 * 10);

app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' });
});

app.get('/teams', getTeams);

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}.`);
});