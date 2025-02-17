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
  await populateGames(2024,3,21,31);
  await populateGames(2024,4,1,8);
}; 
// seedData();

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