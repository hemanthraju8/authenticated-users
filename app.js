const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const DbPath = path.join(__dirname, "userData.db");
let db = null;
app.use(express.json());

const InitialDbAndServer = async () => {
  try {
    db = await open({ filename: DbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
InitialDbAndServer();

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, "Hemanth", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access Token");
      } else {
        console.log("Your token is valid");
        request.username = user.username;
        next();
      }
    });
  } else {
    response.status(401);
    response.send("Invalid Access Token");
  }
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const checkQuery = `SELECT * FROM user WHERE username="${username}";`;
  const checkUser = await db.get(checkQuery);
  const HashedPassword = await bcrypt.hash(password, 10);
  if (checkUser === undefined) {
    if (password.length >= 5) {
      const creatUserQuery = `INSERT INTO user (username,name, password,gender, location) 
          VALUES ('${username}','${name}','${HashedPassword}','${gender}','${location}');`;
      const createdResponse = await db.run(creatUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkQuery = `SELECT * FROM user WHERE username='${username}';`;
  const checkUser = await db.get(checkQuery);
  if (checkUser !== undefined) {
    const passwordMatched = await bcrypt.compare(password, checkUser.password);
    if (passwordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "Hemanth");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkQuery = `SELECT * FROM user WHERE username='${username}';`;
  const checkUser = await db.get(checkQuery);
  if (checkUser !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      checkUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length >= 5) {
        const HashedPassword = bcrypt.hash(newPassword, 10);
        const updateQuery = `UPDATE user SET password='${HashedPassword}' WHERE username="${username}";`;
        const updateUser = await db.run(updateQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(401);
      response.send("Invalid current password");
    }
  } else {
    response.status(401);
    response.send("Invalid user");
  }
});

app.get("/users", authenticateToken, async (request, response) => {
  const query = `SELECT * FROM user;`;
  const result = await db.all(query);
  response.send(result);
});

app.get("/profile", authenticateToken, async (request, response, next) => {
  const { username } = request;
  const profileQuery = `SELECT * FROM user WHERE username='${username}'`;
  const profile = await db.get(profileQuery);
  response.status(200);
  response.send(profile);
});

module.exports = app;
