//jshint esversion:6
require("dotenv").config();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
  secret: "This is a REAL secret! ",
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userprofileDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  name: String,
  city: String,
  degree: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/profile",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ username: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function (req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/profile",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect to profile.
    res.redirect("/profile");
  });

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/profile", function (req, res) {
  if (req.isAuthenticated()) {
    User.find({"_id":req.user.id}, function (err, foundUser) {
      console.log('profile',foundUser)
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
                  res.render("profile", { usersWithSecrets: foundUser });
        }
      }
    });

  } else {
    res.render("login");
  }
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {

    User.findById({_id:req.user.id}).then(data=>{
      res.render("submit",{userData:data});
    }).catch(err=>{
      console.log(err);
    });
  } else {
    res.render("login");
  }
});

app.post("/submit", function (req, res) {

  const requestObject = {
    name: req.body.name,
    degree: req.body.degree,
    city: req.body.city
  }

  console.log(req.user.id, requestObject);

  User.findById(req.user.id, function (err, foundUser) {

    if (err) {

      console.error(err);

    } else {

      if (foundUser) {

        User.findByIdAndUpdate({ _id: req.user.id }, requestObject, { upsert: true }).then(data => {
          res.redirect("/profile");
        }).catch(err => {
          console.error(err)
        });

      }

    }

  });

});


app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {

  User.register({ username: req.body.username,name:'',degree:'',city:'' }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      });
    }
  });
});

app.post("/login", function (req, res) {


  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      });
    }
  })

});



app.listen(3000, function (req, res) {
  console.log("Server Started on port 3000!");
});
