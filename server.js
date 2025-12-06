const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");

const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("Bearer"),
  secretOrKey: process.env.JWT_SECRET
};

let strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName
    });
  } else {
    next(null, false);
  }
});

passport.use(strategy);

const app = express();

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// --- Routes ---

app.post("/api/user/register", (req, res) => {
  userService.registerUser(req.body)
    .then(msg => res.json({ message: msg }))
    .catch(msg => res.status(422).json({ message: msg }));
});

app.post("/api/user/login", (req, res) => {
  userService.checkUser(req.body)
    .then(user => {
      let payload = { _id: user._id, userName: user.userName };
      let token = jwt.sign(payload, process.env.JWT_SECRET);
      res.json({ message: "login successful", token });
    })
    .catch(msg => res.status(422).json({ message: msg }));
});

app.get("/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.getFavourites(req.user._id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

app.put("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.addFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

app.delete("/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

// --- MongoDB Connection ---
let dbConnectionPromise;

function connectDB() {
  if (!dbConnectionPromise) {
    dbConnectionPromise = userService.connect()
      .then(() => console.log("MongoDB connected"))
      .catch(err => console.error("MongoDB connection error:", err));
  }
  return dbConnectionPromise;
}

// --- Export as serverless function ---
module.exports = async (req, res) => {
  await connectDB(); // ensure DB is connected
  app(req, res);
};
