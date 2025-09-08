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
    const fs = require('fs')
    const path = require('path')
    
    // Users persistence (JSON file)
    const usersFilePath = path.join(__dirname, 'users.json')
    function loadUsersFromFile(){
    try {
    const raw = fs.readFileSync(usersFilePath, 'utf-8')
    return JSON.parse(raw)
    } catch (e) {
    return []
    }
    }
    function saveUsersToFile(data){
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2))
    }
    let users = loadUsersFromFile()

    // Simple JSON storage for products, orders, invoices
    const dataDir = __dirname
    const productsFile = path.join(dataDir, 'products.json')
    const ordersFile = path.join(dataDir, 'orders.json')
    const invoicesFile = path.join(dataDir, 'invoices.json')
    function loadJsonSafe(file){ try { return JSON.parse(fs.readFileSync(file,'utf-8')) } catch(e){ return [] } }
    function saveJson(file, data){ fs.writeFileSync(file, JSON.stringify(data, null, 2)) }
    let products = loadJsonSafe(productsFile)
    let orders = loadJsonSafe(ordersFile)
    let invoices = loadJsonSafe(invoicesFile)

    // View engine setup
    app.set('view engine', 'ejs')
    app.set('views', __dirname)

    app.use(cookieParser());
    app.use(express.urlencoded({extended:false}))
    app.use(express.json())
    app.use(flash())
    app.use(session({
    secret: 'arya,abishek,madhavan'
    ,
    resave: false,
    saveUninitialized: false
    }));
    // Note: Static assets are served after route definitions to avoid bypassing auth on HTML pages

    // Passport configuration
    initializePassport(
    passport,
    email => {
    const key = (email || '').toString().trim().toLowerCase()
    return users.find(user => user.email === key)
    },
    id => users.find(user => user.id === id)
    )
    app.use(passport.initialize());
    app.use(passport.session());

    // Auth middleware
    function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next()
    }
    return res.redirect('/login')
    }
    function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return res.redirect('/index')
    }
    return next()
    }

    // No-cache helper for protected pages
    function noCache(req, res, next) {
    res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    next()
    }

    // Login
    app.post('/login', (req, res, next) => {
    // Ensure clean state before attempting login
    if (req.isAuthenticated && req.isAuthenticated()) {
    req.logout(function(){
    proceed()
    })
    } else {
    proceed()
    }
    function proceed(){
    const { email, password } = req.body || {}
    if (!email || !password) {
    req.flash('error', 'Email and password are required')
    return res.redirect('/login?error=' + encodeURIComponent('Email and password are required'))
    }
    try { console.log('Login attempt for:', (email||'').toString().trim().toLowerCase()) } catch(e) {}
    passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err) }
    if (!user) {
    return res.redirect('/login?error=' + encodeURIComponent((info && info.message) || 'Invalid credentials'))
    }
    req.logIn(user, (err) => {
    if (err) { return next(err) }
    // Set readable cookie for UI (non-httpOnly so client script can read)
    res.cookie('email', JSON.stringify({ email: user.email }))
    return res.redirect('/index')
    })
    })(req, res, next)
    }
    })

    // Register
    app.post("/register", async (req, res) => {
    try {
    const { username, firstname, lastname, email, password } = req.body
    const emailKey = (email || '').toString().trim().toLowerCase()
    const existing = users.find(u => u.email === emailKey)
    if (existing) {
    // Dev-friendly: update existing user's details and reset password
    existing.username = username
    existing.firstname = firstname
    existing.lastname = lastname
    existing.email = emailKey
    existing.password = await bcrypt.hash(password, 10)
    saveUsersToFile(users)
    return res.redirect('/login?updated=1')
    } else {
    const hashPassword = await bcrypt.hash(password, 10)
    users.push({
    id: Date.now().toString(),
    username: username,
    firstname: firstname,
    lastname: lastname,
    email: emailKey,
    password: hashPassword,
    })
    saveUsersToFile(users)
    return res.redirect('/login?registered=1')
    }
    } catch (e) {
    console.log(e);
    return res.redirect("/register")
    }
    })

    // Routes (serve static HTML pages instead of removed EJS views)
    app.get('/', checkNotAuthenticated, (req, res) => {
    res.clearCookie('email')
    return res.sendFile(path.join(__dirname, 'Login.html'))
    })
    app.get('/login', (req,res,next) => {
    // Always end any existing session before showing login
    if (req.isAuthenticated && req.isAuthenticated()) {
    return req.logout(function(){
    res.clearCookie('email')
    return res.sendFile(path.join(__dirname, 'Login.html'))
    })
    }
    res.clearCookie('email')
    return res.sendFile(path.join(__dirname, 'Login.html'))
    })
    app.get('/register', (req,res) => {
    // Ensure visiting register logs out any existing session
    if (req.isAuthenticated && req.isAuthenticated()) {
    return req.logout(function(){
    res.clearCookie('email')
    return res.sendFile(path.join(__dirname, 'Form2.html'))
    })
    }
    res.clearCookie('email')
    return res.sendFile(path.join(__dirname, 'Form2.html'))
    })
    app.get('/index', checkAuthenticated, noCache, (req, res) => {
    return res.sendFile(path.join(__dirname, 'Demo1.html'))
    })
    app.get('/customerinfo', checkAuthenticated, noCache, (req, res) => {
    return res.sendFile(path.join(__dirname, 'CustomerInfo.html'))
    })
    app.get('/supplierinfo', checkAuthenticated, noCache, (req, res) => {
    return res.sendFile(path.join(__dirname, 'SupplierInfo.html'))
    })
    app.get('/medicine', checkAuthenticated, noCache, (req, res) => {
    return res.redirect('/index#section5')
    })
    app.get('/about', checkAuthenticated, noCache, (req, res) => {
    return res.redirect('/index#section6')
    })

    // Redirect legacy .html routes to proper EJS routes
    app.get('/Login.html', (req, res) => res.redirect('/login'))
    app.get('/login.html', (req, res) => res.redirect('/login'))
    app.get('/index.html', (req, res) => res.redirect('/index'))
    app.get('/Index.html', (req, res) => res.redirect('/index'))
    app.get('/CustomerInfo.html', (req, res) => res.redirect('/customerinfo'))
    app.get('/customerinfo.html', (req, res) => res.redirect('/customerinfo'))
    app.get('/SupplierInfo.html', (req, res) => res.redirect('/supplierinfo'))
    app.get('/supplierinfo.html', (req, res) => res.redirect('/supplierinfo'))
    app.get('/index.ejs', (req, res) => res.redirect('/index'))
    app.get('/Demo1.html', (req, res) => res.redirect('/index'))
    app.get('/customerinfo.ejs', (req, res) => res.redirect('/customerinfo'))
    app.get('/supplierinfo.ejs', (req, res) => res.redirect('/supplierinfo'))

    // Debug helper to list registered emails (no passwords). Disable in prod.
    app.get('/__debug__/users', (req, res) => {
    try {
    const data = users.map(u => ({ email: u.email, username: u.username }))
    res.json(data)
    } catch (e) {
    res.status(500).json({ error: 'debug_error' })
    }
    })

    // Logout
    app.post('/logout', (req, res, next) => {
    req.logout(function(err){
    if (err) { return next(err) }
    res.clearCookie('email')
    return res.redirect('/login')
    })
    })

    // Serve static assets (CSS/JS/images) last
    app.use(express.static(__dirname))

    // --- API: Products ---
    app.get('/api/products', (req,res)=>{
    return res.json(products)
    })
    app.post('/api/products', (req,res)=>{
    const body = req.body || {}
    const item = {
    id: 'P' + Date.now(),
    name: (body.name||'').toString(),
    price: Number(body.price||0),
    stock: Number(body.stock||0),
    moq: Number(body.moq||0),
    category: (body.category||'').toString(),
    brand: (body.brand||'').toString(),
    supplierId: (body.supplierId||'SUP1').toString(),
    expiry: (body.expiry||'').toString(),
    description: (body.description||'').toString(),
    dosage: (body.dosage||'').toString(),
    }
    products.push(item); saveJson(productsFile, products)
    return res.json(item)
    })
    app.put('/api/products/:id', (req,res)=>{
    const idx = products.findIndex(p=>p.id===req.params.id)
    if (idx<0) return res.status(404).json({error:'not_found'})
    products[idx] = { ...products[idx], ...req.body }
    saveJson(productsFile, products)
    return res.json(products[idx])
    })
    app.delete('/api/products/:id', (req,res)=>{
    products = products.filter(p=>p.id!==req.params.id)
    saveJson(productsFile, products)
    return res.json({ok:true})
    })

    // --- API: Orders ---
    // Create order with items: [{productId, name, qty, unitPrice, supplierId}]
    app.post('/api/orders', (req,res)=>{
    const body = req.body || {}
    const id = 'O' + Date.now()
    const order = {
    id,
    customerId: (body.customerId||'CUST').toString(),
    supplierId: (body.supplierId||'SUP1').toString(),
    date: new Date().toISOString().slice(0,10),
    items: Array.isArray(body.items)? body.items : [],
    total: Number(body.total||0),
    status: 'Pending'
    }
    orders.push(order); saveJson(ordersFile, orders)
    return res.json(order)
    })
    app.get('/api/orders', (req,res)=>{
    const { customerId, supplierId } = req.query
    let result = orders
    if (customerId) result = result.filter(o=>o.customerId===customerId)
    if (supplierId) result = result.filter(o=>o.supplierId===supplierId)
    return res.json(result)
    })
    app.put('/api/orders/:id/status', (req,res)=>{
    const idx = orders.findIndex(o=>o.id===req.params.id)
    if (idx<0) return res.status(404).json({error:'not_found'})
    orders[idx].status = (req.body && req.body.status) || orders[idx].status
    saveJson(ordersFile, orders)
    return res.json(orders[idx])
    })

    // --- API: Invoices ---
    app.post('/api/invoices', (req,res)=>{
    const body = req.body || {}
    const invoice = {
    id: 'INV' + Date.now(),
    orderId: (body.orderId||'').toString(),
    customerId: (body.customerId||'CUST').toString(),
    supplierId: (body.supplierId||'SUP1').toString(),
    amount: Number(body.amount||0),
    status: (body.status||'Unpaid').toString(),
    date: new Date().toLocaleDateString(),
    }
    invoices.push(invoice); saveJson(invoicesFile, invoices)
    return res.json(invoice)
    })
    app.get('/api/invoices', (req,res)=>{
    const { customerId, supplierId, orderId } = req.query
    let result = invoices
    if (customerId) result = result.filter(i=>i.customerId===customerId)
    if (supplierId) result = result.filter(i=>i.supplierId===supplierId)
    if (orderId) result = result.filter(i=>i.orderId===orderId)
    return res.json(result)
    })
    app.put('/api/invoices/:id/status', (req,res)=>{
    const idx = invoices.findIndex(i=>i.id===req.params.id)
    if (idx<0) return res.status(404).json({error:'not_found'})
    invoices[idx].status = (req.body && req.body.status) || invoices[idx].status
    saveJson(invoicesFile, invoices)
    return res.json(invoices[idx])
    })

    app.listen(3000)