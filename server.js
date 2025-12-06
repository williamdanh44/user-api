const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");

const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const HTTP_PORT = process.env.PORT || 8080;

// ------------------ PASSPORT JWT SETUP ------------------
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

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// ------------------ ROUTES ------------------

// Register a new user
app.post("/api/user/register", (req, res) => {
    userService.registerUser(req.body)
        .then(msg => res.json({ message: msg }))
        .catch(msg => res.status(422).json({ message: msg }));
});

// Login and return JWT token
app.post("/api/user/login", (req, res) => {
    userService.checkUser(req.body)
        .then(user => {
            // Create JWT payload
            let payload = {
                _id: user._id,
                userName: user.userName
            };
            // Sign token with secret from .env
            let token = jwt.sign(payload, process.env.JWT_SECRET);
            res.json({ message: "login successful", token: token });
        })
        .catch(msg => res.status(422).json({ message: msg }));
});

// Protected: Get user favourites
app.get("/api/user/favourites",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.getFavourites(req.user._id)
            .then(data => res.json(data))
            .catch(msg => res.status(422).json({ error: msg }));
    }
);

// Protected: Add favourite
app.put("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.addFavourite(req.user._id, req.params.id)
            .then(data => res.json(data))
            .catch(msg => res.status(422).json({ error: msg }));
    }
);

// Protected: Remove favourite
app.delete("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        userService.removeFavourite(req.user._id, req.params.id)
            .then(data => res.json(data))
            .catch(msg => res.status(422).json({ error: msg }));
    }
);

// ------------------ SERVER START ------------------
userService.connect()
    .then(() => {
        app.listen(HTTP_PORT, () => {
            console.log("API listening on: " + HTTP_PORT);
        });
    })
    .catch(err => {
        console.log("Unable to start server: " + err);
        process.exit(1);
    });

module.exports = app; // Export for Vercel
