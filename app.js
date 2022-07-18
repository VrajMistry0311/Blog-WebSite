// Config
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config();
}
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const res = require("express/lib/response");

const session = require('express-session');   // -----> Level - 5
const passport = require("passport");   // -----> Level - 5
const passportLocalMongoose = require("passport-local-mongoose");   // -----> Level - 5
const GoogleStrategy = require('passport-google-oauth20').Strategy;   // -----> Level - 6
const findOrCreate = require('mongoose-findorcreate');


mongoose.connect(process.env.DB_URI);

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "This is a long secret String used to authenticate",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const postSchema = new mongoose.Schema({
  title: String,
  content: String
});

const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  posts: [postSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function (req, res) {
  Post.find({}, function (err, posts) {
    res.render("home", {
      homeContent: homeStartingContent,
      posts: posts,
      authentication: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null
    });
  });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  });

app.get("/login", function (req, res) {
  res.render("login",
    {
      authentication: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null
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
        res.redirect("/");
      });
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register",
    {
      authentication: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null
    });
});

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});


app.get("/about", function (req, res) {
  res.render("about",
    {
      aboutContent: aboutContent,
      authentication: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null
    });
});

app.get("/contact", function (req, res) {
  res.render("contact",
    {
      contactContent: contactContent,
      authentication: req.isAuthenticated(),
      username: req.isAuthenticated() ? req.user.username : null
    });
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose",
      {
        authentication: req.isAuthenticated(),
        username: req.isAuthenticated() ? req.user.username : null
      });
  } else {
    res.redirect("/login");
  }

});

app.post("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    const newPost = new Post({
      title: req.body.postTitle,
      content: req.body.postBody
    });

    newPost.save(function (err) {
      if (err) {
        res.redirect("/login");
      }
    });

    User.findOne(
      { username: req.user.username },
      function (err, foundUser) {
        foundUser.posts.push(newPost);
        foundUser.save(function (err) {
          if (err) {
            console.log(err);
            res.redirect("/");
          }
        });
      }
    );
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.post("/:postName", function (req, res) {
  res.render("post", {
    postName: req.params.postName,
    postContent: req.body.postContent,
    authentication: req.isAuthenticated(),
    username: req.isAuthenticated() ? req.user.username : null
  });
});

app.get("/allblogs", function (req, res) {
  if (req.isAuthenticated()) {
    User.findOne({ username: req.user.username }, function (err, foundUser) {
      if (!err) {
        res.render("allPost",
          {
            user: foundUser,
            authentication: req.isAuthenticated(),
            username: req.isAuthenticated() ? req.user.username : null
          });
      } else {
        console.log("else");
        console.log(err);
      }
    })
  } else {
    res.redirect("/login");
  }
})

app.get("/posts/:postName", function (req, res) {
  const postName = req.params.postName;
  Post.findOne({ title: postName }, function (err, post) {
    if (!err) {
      if (!post) {
        console.log("No such Post exists!")
      } else {
        res.render("post", {
          postName: post.title,
          postContent: post.content,
          authentication: req.isAuthenticated(),
          username: req.isAuthenticated() ? req.user.username : null
        });
      }
    }
  });
});

app.listen(process.env.PORT, function () {
  console.log("Server started on port 3000");
});

