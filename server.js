const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const userService = require('./user-service.js');

const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

console.log('MONGO_URL:', process.env.MONGO_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

// JWT strategy options
let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
  secretOrKey: process.env.JWT_SECRET
};

// JWT strategy
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

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// ------------------ ROUTES ------------------

// Register a new user
app.post('/api/user/register', (req, res) => {
  userService.registerUser(req.body)
    .then(msg => res.json({ message: msg }))
    .catch(msg => res.status(422).json({ message: msg }));
});

// Login and return JWT token
app.post('/api/user/login', (req, res) => {
  userService.checkUser(req.body)
    .then(user => {
      let payload = {
        _id: user._id,
        userName: user.userName
      };

      let token = jwt.sign(payload, process.env.JWT_SECRET);

      res.json({ message: 'login successful', token: token });
    })
    .catch(msg => res.status(422).json({ message: msg }));
});

// Get user favourites (protected route)
app.get('/api/user/favourites',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.getFavourites(req.user._id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

// Add a favourite (protected route)
app.put('/api/user/favourites/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.addFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

// Remove a favourite (protected route)
app.delete('/api/user/favourites/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id)
      .then(data => res.json(data))
      .catch(msg => res.status(422).json({ error: msg }));
  }
);

// ------------------ SERVER START ------------------
// Locally: use listen()
if (process.env.NODE_ENV !== 'production') {
  userService.connect()
    .then(() => {
      app.listen(HTTP_PORT, () => console.log(`API listening on port ${HTTP_PORT}`));
    })
    .catch(err => {
      console.log('Unable to start server:', err);
      process.exit(1);
    });
}

// ------------------ EXPORT FOR VERCEL ------------------
module.exports = async (req, res) => {
  try {
    // Ensure DB connection before each request
    await userService.connect();
    app(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', details: err.toString() });
  }
};
