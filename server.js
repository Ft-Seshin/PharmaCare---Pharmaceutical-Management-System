if (process.env.NODE_ENV !== "production") {
    require("dotenv").config()
    }
    const express = require("express")
    const app = express()
    const bcrypt = require("bcrypt")
    const initializePassport = require("./passport-config")
    const passport = require("passport")
    const flash = require("express-flash")
    const session = require("express-session")
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());
    initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
    )
    const users = []
    app.use(express.urlencoded({extended:false}))
    app.use(flash())
    app.use(session({
    secret: 'arya,abishek,madhavan'
    ,
    resave: false,
    saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.post('/login', passport.authenticate('local', {
    successRedirect: '/index',
    failureRedirect: '/login',
    failureFlash: true
    }), (req, res) => {
    const { id, username } = req.user;
    res.cookie('user', { id, email });
    res.redirect('/index');
    });
    app.post("/register", async (req, res) => {
    try {
    const hashPassword = await bcrypt.hash(req.body.password, 10)
    users.push({
    id: Date.now().toString(),
    username: req.body.username,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    email: req.body.email,
    password: hashPassword,
    })
    console.log(users);
    res.redirect("/login")
    } catch (e) {
    console.log(e);
    res.redirect("/register")
    }
    })
    app.get('/', (req, res) => {
    res.render("login.ejs")
    })
    app.get('/index', (req, res) => {
    res.render("index.ejs")
    })
    app.get('/login', (req,res) => {
    res.render("login.ejs")
    })
    app.get('/register', (req,res) => {
    res.render("register.ejs")
    })
    app.get('/customerinfo', (req, res) => {
    res.render("customerinfo.ejs")
    })
    app.get('/supplierinfo', (req, res) => {
    res.render("supplierinfo.ejs")
    })
    app.listen(3000)