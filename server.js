const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.post("/api/user/register", (req, res) => {
    userService.registerUser(req.body)
    .then((msg) => {
        res.json({ "message": msg });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
    });
});

// Route for user login
app.post("/api/user/login", (req, res) => {
    userService.checkUser(req.body)  // Check user credentials
        .then((user) => {
            if (user) {
                // Create JWT payload with user info
                const payload = {
                    _id: user._id,
                    userName: user.userName
                };

                // Sign the payload to create a token
                const token = jwt.sign(payload, process.env.JWT_SECRET, {
                    expiresIn: '1h' // Token expires in 1 hour
                });

                // Send the signed token back to the client
                res.json({
                    message: "Login successful",
                    token: token
                });
            } else {
                res.status(422).json({ message: "Invalid username or password" });
            }
        })
        .catch(msg => {
            res.status(422).json({ message: msg });
        });
});

// Protect /api/user/favourites route
app.get("/api/user/favourites", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.getFavourites(req.user._id)
        .then(data => {
            res.json(data);
        })
        .catch(msg => {
            res.status(422).json({ error: msg });
        });
});

// Protect /api/user/favourites/:id route
app.put("/api/user/favourites/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.addFavourite(req.user._id, req.params.id)
        .then(data => {
            res.json(data);
        })
        .catch(msg => {
            res.status(422).json({ error: msg });
        });
});

// Protect /api/user/favourites/:id route for DELETE
app.delete("/api/user/favourites/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
    userService.removeFavourite(req.user._id, req.params.id)
        .then(data => {
            res.json(data);
        })
        .catch(msg => {
            res.status(422).json({ error: msg });
        });
});


userService.connect()
.then(() => {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
})
.catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
});



