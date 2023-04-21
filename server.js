// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload

// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal

// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');

// our modules loaded from cwd

const { Connection } = require('./connection'); // Olivia's module
const cs304 = require('./cs304');

// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data

app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// ================================================================
// custom routes here

const DB = process.env.USER;
const EMPOWER = 'empower';
const USERS = 'users';
const OPPS = 'opps';
const WMDB = 'wmdb';
const STAFF = 'staff';

// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    /*
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);
    return res.render('index.ejs', {uid, visits});
    */
    return res.render('index.ejs');
});

app.get('/login', (req, res) => {
    return res.render('login.ejs');
});

app.get('/signUp', (req, res) => {
    return res.render('signUp.ejs');
})

app.get('/userForm', (req, res) => {
    return res.render('userForm.ejs');
})

app.get('/postings', async (req, res) => {
    const db = await Connection.open(mongoUri, EMPOWER);
    let allOpps = await db.collection(OPPS).find({}).toArray();
    // let currentUser = await db.collection(USERS).find({}).toArray(); // must figure out how to find currentUser
    let userUID = 1;
    let userName = 'Alexa Halim';
    // need user name and uid for navbar
    return res.render('postings.ejs', {list: allOpps, userUID: userUID, userName: userName});
})

app.get('/oppForm', (req, res) => {
    let userUID = 1;
    let userName = 'Alexa Halim';
    // need user name and uid for navbar
    return res.render('oppForm.ejs', {userUID: userUID, userName: userName});
})

app.get('/post/:oid', async (req, res) => {
    // need data from corresponding opportunity doc
    let postOID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    // need user name and uid for navbar
    let userUID = 1;
    let userName = 'Alexa Halim';
    return res.render('postPage.ejs', {post: opp[0], userUID: userUID, userName: userName});
})

app.get('/user/:uid', async (req, res) => {
    // need data from corresponding userProfile
    let currUserUID = parseInt(req.params.uid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let user = await db.collection(USERS).find({uid: currUserUID}).toArray(); //not finding anybody, are we sure the user database has been created?
    console.log(user);
    // need user name and uid for navbar
    let userUID = 1;
    let userName = 'Alexa Halim';
    return res.render('userProfile.ejs', {user: user[0], userUID: userUID, userName: userName});
})

app.get('/post/update/:oid', async (req, res) => {
    // need data from corresponding opportunity doc
    let postOID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    // need user name and uid for navbar
    let userUID = 1;
    let userName = 'Alexa Halim';
    return res.render('updateOpp.ejs', {opp: opp[0], userUID: userUID, userName: userName});
})

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/login', (req, res) => {
    // adding confirmation of user
    res.redirect('/postings');
})

app.post('/signUp', (req, res) => {
    res.redirect('/userForm/');
})

app.post('/userForm', (req, res) => {
    // make sure necessary fields are filled
    let uid = req.body.uid;
    res.redirect('user/' + uid);
})

app.post('/oppForm', (req, res) => {
    let oid = req.body.oid;
    res.redirect('/post/' + oid)
})

app.post('/user/<%= user.uid %>', (req, res) => {
    let uid = parseInt(req.params.uid);
    res.redirect('/user/' + uid)
})

app.post('/post/update/:oid', () => {
    let oid = parseInt(req.params.oid);
    // checking if user is author of post
    // need to write how to update the information with the edits
    res.redirect('/post/' + oid)
})

app.post('/set-uid/', (req, res) => {
    console.log('in set-uid');
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    res.redirect('/');
});

// shows how logins might work via Ajax
app.post('/set-uid-ajax/', (req, res) => {
    console.log(Object.keys(req.body));
    console.log(req.body);
    let uid = req.body.uid;
    if(!uid) {
        res.send({error: 'no uid'}, 400);
        return;
    }
    req.session.uid = req.body.uid;
    req.session.logged_in = true;
    console.log('logged in via ajax as ', req.body.uid);
    res.send({error: false});
});

// conventional non-Ajax logout, so redirects
app.post('/logout/', (req, res) => {
    console.log('in logout');
    req.session.uid = false;
    req.session.logged_in = false;
    res.redirect('/');
});

// two kinds of forms (GET and POST), both of which are pre-filled with data
// from previous request, including a SELECT menu. Everything but radio buttons

app.get('/form/', (req, res) => {
    console.log('get form');
    return res.render('form.ejs', {action: '/form/', data: req.query });
});

app.post('/form/', (req, res) => {
    console.log('post form');
    return res.render('form.ejs', {action: '/form/', data: req.body });
});

app.get('/staffList/', async (req, res) => {
    const db = await Connection.open(mongoUri, WMDB);
    let all = await db.collection(STAFF).find({}).toArray();
    console.log('len', all.length, 'first', all[0]);
    return res.render('list.ejs', {listDescription: 'all staff', list: all});
});

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
