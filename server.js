import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { getTeams } from './queries.js';
import { updateScores } from './scores-tracking.js';
import { populateTeams } from './db-utils.js';

const app = express();
const PORT = process.env.PORT;

// populateTeams(2024, 3, 21, 22);

// updateScores();

// setInterval(() => {
//   updateScores();
// }, 5 * 60 * 1000);

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