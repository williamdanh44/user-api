const express = require('express');
const app = express();
const cors = require("cors");
const userService = require("./user-service.js");

const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");

console.log("MONGO_URL:", process.env.MONGO_URL);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// JWT setup
let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
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

// Middleware
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// Root route for browser check
app.get("/", (req, res) => {
  res.send("User API is running!");
});

// Registration
app.post("/api/user/register", (req, res) => {
  userService.registerUser(req.body)
    .then((msg) => res.json({ message: msg }))
    .catch((msg) => res.status(422).json({ message: msg }));
});

// Login
app.post("/api/user/login", (req, res) => {
  userService.checkUser(req.body)
    .then((user) => {
      let payload = { _id: user._id, userName: user.userName };
      let token = jwt.sign(payload, process.env.JWT_SECRET);
      res.json({ message: "login successful", token });
    })
    .catch((msg) => res.status(422).json({ message: msg }));
});

// Protected routes
app.get("/api/user/favourites",
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.getFavourites(req.user._id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

app.put("/api/user/favourites/:id",
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.addFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

app.delete("/api/user/favourites/:id",
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

// Start server
userService.connect()
  .then(() => {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  })
  .catch(err => {
    console.log("Unable to start the server: " + err);
    process.exit(1);
  });
