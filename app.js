const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();
app.use(express.json());

let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error : ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertPlayerObjToResponseObj = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchObjToResponseObj = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//API 1 -- Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT * FROM player_details;
    `;
  const playersArray = await database.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) => convertPlayerObjToResponseObj(eachPlayer))
  );
});

//API 2 -- Returns a specific player based on the player ID
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT * FROM player_details
        WHERE player_id = ${playerId};
    `;
  const player = await database.get(getPlayerQuery);
  response.send(convertPlayerObjToResponseObj(player));
});

//API 3 -- Updates the details of a specific player based on the player ID
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
        UPDATE player_details
        SET
            player_name = '${playerName}'
        WHERE player_id = ${playerId};
    `;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//API 4 -- Returns the match details of a specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
    SELECT * FROM match_details
    WHERE match_id = ${matchId};
    `;
  const match = await database.get(getMatchDetails);
  response.send(convertMatchObjToResponseObj(match));
});

//API 5 -- Returns a list of all the matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
        SELECT match_details.match_id, match_details.match, match_details.year
        FROM match_details INNER JOIN player_match_score
        ON match_details.match_id = player_match_score.match_id
        WHERE player_match_score.player_id = ${playerId};
    `;
  const playerMatchesArray = await database.all(getPlayerMatchesQuery);
  response.send(
    playerMatchesArray.map((eachMatch) =>
      convertMatchObjToResponseObj(eachMatch)
    )
  );
});

//API 6 -- Returns a list of players of a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
        SELECT player_details.player_id, player_details.player_name
        FROM player_details INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE player_match_score.match_id = ${matchId};
    `;
  const matchPlayersArray = await database.all(getMatchPlayersQuery);
  response.send(
    matchPlayersArray.map((eachPlayer) =>
      convertPlayerObjToResponseObj(eachPlayer)
    )
  );
});

//API 7 -- Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStatsQuery = `
        SELECT 
            player_details.player_id AS playerId,
            player_details.player_name AS playerName,
            SUM(player_match_score.score) AS totalScore,
            SUM(player_match_score.fours) AS totalFours,
            SUM(player_match_score.sixes) AS totalSixes
        FROM player_details INNER JOIN player_match_score
        ON player_details.player_id = player_match_score.player_id
        WHERE player_match_score.player_id = ${playerId};
    `;
  const stats = await database.get(getPlayerStatsQuery);
  response.send(stats);
});

module.exports = app;
