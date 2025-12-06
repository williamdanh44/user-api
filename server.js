const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");

const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const app = express();

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

// ------------------ MIDDLEWARE ------------------
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// ------------------ ROUTES ------------------

// Register a new user
app.post("/api/user/register", async (req, res) => {
    try {
        const msg = await userService.registerUser(req.body);
        res.status(201).json({ message: msg });
    } catch (err) {
        res.status(422).json({ message: err });
    }
});

// Login and return JWT token
app.post("/api/user/login", async (req, res) => {
    try {
        const user = await userService.checkUser(req.body);
        const payload = {
            _id: user._id,
            userName: user.userName
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        res.json({ message: "login successful", token });
    } catch (err) {
        res.status(422).json({ message: err });
    }
});

// Protected: Get user favourites
app.get("/api/user/favourites",
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const data = await userService.getFavourites(req.user._id);
            res.json(data);
        } catch (err) {
            res.status(422).json({ error: err });
        }
    }
);

// Protected: Add favourite
app.put("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const data = await userService.addFavourite(req.user._id, req.params.id);
            res.json(data);
        } catch (err) {
            res.status(422).json({ error: err });
        }
    }
);

// Protected: Remove favourite
app.delete("/api/user/favourites/:id",
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        try {
            const data = await userService.removeFavourite(req.user._id, req.params.id);
            res.json(data);
        } catch (err) {
            res.status(422).json({ error: err });
        }
    }
);

// ------------------ EXPORT APP FOR VERCEL ------------------
// Vercel handles serverless function execution; DO NOT use app.listen()
userService.connect()
    .then(() => {
        console.log("Database connected successfully.");
    })
    .catch(err => {
        console.log("Unable to connect to database: " + err);
        process.exit(1);
    });

module.exports = app;
