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
const { slice } = require('lodash');

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


// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    /*
    let uid = req.session.uid || 'unknown';
    console.log('uid', uid);
    */
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    return res.render('index.ejs');
});

app.get('/login', (req, res) => {
    return res.render('login.ejs');
});

app.get('/signUp', (req, res) => {
    return res.render('signUp.ejs');
})

// delete once user sessions are figured out
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

app.get('/do-postings', async (req, res) => {
    const db = await Connection.open(mongoUri, EMPOWER);
    let showOpps = await db.collection(OPPS).find({}).toArray();
    let btnClicked = req.query.button;
    if (btnClicked == "allOpBtn"){
        showOpps = await db.collection(OPPS).find({}).toArray();
    }
    else if (btnClicked == "internshipBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /internship/i }}).toArray();
    }
    else if (btnClicked == "jobBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /job/i }}).toArray();
    }
    else if (btnClicked == "researchBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /research/i }}).toArray();
    }
    else if (btnClicked == "remoteBtn"){
        showOpps = await db.collection(OPPS).find({location:{$regex: /remote/i }}).toArray();
    }

    // let currentUser = await db.collection(USERS).find({}).toArray(); // must figure out how to find currentUser
    let userUID = 1;
    let userName = 'Alexa Halim';
    // need user name and uid for navbar
    return res.render('postings.ejs', {list: showOpps, userUID: userUID, userName: userName});
})

app.get('/oppForm', (req, res) => {
    let userUID = "1";
    let userName = 'Alexa Halim';
    // need user name and uid for navbar
    return res.render('oppForm.ejs', {userUID: userUID, userName: userName});
})

app.get('/post/:oid', async (req, res) => {
    // need data from corresponding opportunity doc
    let postOID = parseInt(req.params.oid);
    console.log(postOID);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    console.log(opp);
    let addedByUID = opp[0].addedBy.uid;
    console.log(addedByUID);
    let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();
    console.log(addedBy);
    // need user name and uid for navbar
    let userUID = 1;
    let userName = 'Alexa Halim';
    return res.render('postPage.ejs', {post: opp[0], addedBy: addedBy[0], userUID: userUID, userName: userName});
})

app.get('/user/:uid', async (req, res) => {
    // need data from corresponding userProfile
    let currUserUID = req.params.uid;
    const db = await Connection.open(mongoUri, EMPOWER);
    let user = await db.collection(USERS).find({uid: currUserUID}).toArray(); //not finding anybody, are we sure the user database has been created?
    console.log(user);
    // need user name and uid for navbar
    let userUID = "1";
    let userName = 'Alexa Halim';
    return res.render('userProfile.ejs', {user: user[0], userUID: userUID, userName: userName, statuses: ["Alumn", "Professor", "Staff", "Student", "Affiliate"]});
})

app.get('/updatePost/:oid', async (req, res) => {
    // need data from corresponding opportunity doc
    let postOID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    let addedByUID = opp[0].addedBy.uid;
    console.log(addedByUID);
    let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();
    console.log(addedBy);
    //testing for pre-select checkbox
    console.log(opp[0].subfield);
    let isCheckedArr = opp[0].subfield;
    let isCheckedBio = false;
    let isCheckedCloud = false;
    let isCheckedCompVision = false;
    let isCheckedDataScience = false;
    let isCheckedGraphics = false;
    let isCheckedHci = false;
    let isCheckedML = false;
    let isCheckedProdDesign = false;
    let isCheckedProdMgmt = false;
    let isCheckedSWE = false;
    let isCheckedSystems = false;
    let isCheckedUiUx = false;
    let isCheckedOther = false;

    if (isCheckedArr.includes("bioinformatics")){
        isCheckedBio = true;
    }
    if (isCheckedArr.includes("cloud")){
        isCheckedCloud = true;
    }
    if (isCheckedArr.includes("compVision")){
        isCheckedCompVision = true;
    }
    if (isCheckedArr.includes("dataScience")){
        isCheckedDataScience = true;
    }
    if (isCheckedArr.includes("graphics")){
        isCheckedGraphics = true;
    }
    if (isCheckedArr.includes("hci")){
        isCheckedHci = true;
    }
    if (isCheckedArr.includes("ml")){
        isCheckedML = true;
    }
    if (isCheckedArr.includes("prodDesign")){
        isCheckedProdDesign = true;
    }
    if (isCheckedArr.includes("prodMgmt")){
        isCheckedProdMgmt = true;
    }
    if (isCheckedArr.includes("swe")){
        isCheckedSWE = true;
    }
    if (isCheckedArr.includes("systems")){
        isCheckedSystems = true;
    }
    if (isCheckedArr.includes("uiux")){
        isCheckedUiUx = true;
    }
    if (isCheckedArr.includes("other")){
        isCheckedOther = true;
    }
    // need user name and uid for navbar
    let userUID = "1";
    let userName = 'Alexa Halim';
    return res.render('updateOpp.ejs', {opp: opp[0], 
                                        addedBy: addedBy[0], 
                                        userUID: userUID, 
                                        userName: userName,
                                        isCheckedBio: isCheckedBio,
                                        isCheckedCloud: isCheckedCloud,
                                        isCheckedCompVision: isCheckedCompVision,
                                        isCheckedDataScience: isCheckedDataScience,
                                        isCheckedGraphics: isCheckedGraphics,
                                        isCheckedHci: isCheckedHci,
                                        isCheckedML: isCheckedML,
                                        isCheckedProdDesign: isCheckedProdDesign,
                                        isCheckedProdMgmt: isCheckedProdMgmt,
                                        isCheckedSWE: isCheckedSWE,
                                        isCheckedSystems: isCheckedSystems,
                                        isCheckedUiUx: isCheckedUiUx,
                                        isCheckedOther: isCheckedOther});
                                    })

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/login', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    try {
        var username = req.body.uname;
        var password = req.body.psw;
        var existingUser = await db.collection(USERS).findOne({email: username});
        if (!existingUser) {
            req.flash('error', `User with email ${username} does not exist, please try again.`);
            return res.redirect('/login');
        }
        const match = await bcrypt.compare(password, existingUser.hash);
        if (!match) {
            req.flash('error', `Incorrect username or password. Please try again.`);
            return res.redirect('/login');
        }
        req.flash('info', `Logged in as ` + username);
        req.session.username = username;
        req.session.logged_in = true;
        return res.redirect('/postings');
    }   catch (error) {
        req.flash('error', `Something went wrong: ${error}`);
        return res.redirect('/login');
    }
});

app.post('/signUp', async (req, res) => {
    let email = req.body.uname;
    let users = await DB.collection(USERS).find({email: email}).toArray();
    if (users.length != 0) {
        req.flash('error', `User with email ${email} already in use! Please log in.`)
    }
    else if (email.slice(-14) != '@wellesley.edu') {
        req.flash('error', `Error: Email must be a "@wellesley.edu" email!`)
        return res.render('signUp.ejs');
    }
    else {
        return res.render('userForm.ejs', {email: uname}); 
    }
})

app.post('/userForm', async (req, res) => {
    // make sure necessary fields are filled
    console.log(req.body);
    let name = req.body.fullName;
    let uid = req.body.uid;
    // let email = req.body.email;
    let status = req.body.userStatus;
    let industry = req.body.industry;
    let year = parseInt(req.body.classYear); // fix when user doesn't have a class year
    let majors = req.body.majors.split(", ")
    let minors = req.body.minors;
    const db = await Connection.open(mongoUri, EMPOWER);
    const inserted = await db.collection(USERS).updateOne(
        {uid: uid}, // changed to email. how do we do that?ß
        { $setOnInsert:
            {
                uid: uid,
                name: name,
                // email: email,
                status: status,
                classYear: year,
                major: majors,
                minor: minors,
                industry: industry,
                favorited: [],
            }
        },
        { upsert: true }
    )
    console.log(inserted);
    res.redirect('/user/' + uid);
})

app.post('/oppForm', async (req, res) => {
    console.log(req.body);
    let name = req.body.opportunityName;
    let oid = parseInt(req.body.oid); // how to do if oid is not an integer, how to flash
    let location = req.body.location;
    let type = req.body.oppType;
    let org = req.body.org;
    let subfield = req.body.subfield; // multiple things
    let appLink = req.body.applicationLink;
    let spam = req.body.spam; //
    let expiration = req.body.due; //
    let refLink = req.body.referralLink; // is this the right name?
    let description = req.body.description; //
    let addedByUID = req.body.addedBy;

    const db = await Connection.open(mongoUri, EMPOWER);
    const opps = await db.collection(OPPS);
    let addedByName = await db.collection(USERS).find({uid: addedByUID}).toArray();
    let inserted = await opps.updateOne(
        { oid: oid },
        { $setOnInsert: 
            {
                name: name,
                oid: oid, 
                location: location,
                type: type,
                org: org,
                subfield: subfield,
                link: appLink,
                spam: spam,
                expiration: expiration,
                referralLink: refLink,
                description: description,
                addedBy: {uid: addedByUID, name: addedByName},
                comments: null
            }
        },
        { upsert: true }
    )
    console.log(inserted);
    if (inserted.upsertedCount == 1) {
        // opp successfully inserted --> redirect to post
        return res.redirect('/post/' + oid)
    }
    else {
        // oid in use --> flash error, rerender form page
        req.flash('error', `Opportunity with oid ${oid} is already in our database!`)
        return res.render('oppForm.ejs');
    }
})

app.post('/user/:uid', async (req, res) => {
    let uid = req.params.uid;
    console.log(req.body);
    let name = req.body.fullName;
    let email = req.body.email;
    let status = req.body.userStatus;
    let industry = req.body.industry;
    let year = parseInt(req.body.classYear); // fix when user doesn't have a class year
    let majors = req.body.majors.split(", ")
    let minors = req.body.minors;
    const db = await Connection.open(mongoUri, EMPOWER);
    const edited = await db.collection(USERS).updateOne(
        {uid: uid},
        { $set:
            {
                name: name,
                email: email,
                status: status,
                classYear: year,
                major: majors,
                minor: minors,
                industry: industry,
            }
        });
    console.log(edited);
    let updatedUser = await db.collection(USERS).find({uid: uid}).toArray();
    console.log(updatedUser[0]); // shows up as undefined
    res.redirect('/user/' + uid); // goes to correct link tho
})

app.post('/user/delete/:uid', async (req, res) => {
    const userUID = req.params.uid;
    const db = await Connection.open(mongoUri, EMPOWER);
    const deletion = await db.collection(USERS).deleteOne({uid: userUID});
    console.log(deletion.acknowledged);
    // req.flash(`info`, `User (${userUID}) was deleted successfully.`);
    return res.redirect("/");
})

app.post('/post/delete/:oid', async (req, res) => {
    const oppID = req.params.oid;
    const db = await Connection.open(mongoUri, EMPOWER);
    const deletion = await db.collection(OPPS).deleteOne({oid: oppID});
    console.log(deletion.acknowledged);
    // req.flash(`info`, `Opportunity (${oppID}) was deleted successfully.`);
    return res.redirect("/postings");
});

app.post('/updatePost/:oid', async (req, res) => {
    let oid = parseInt(req.params.oid);
    // checking if user is author of post
    let userUID = 1;
    let userName = 'Alexa Halim';
    // need to write how to update the information with the edits
    console.log(req.body);
    let name = req.body.opportunityName;
    let location = req.body.location;
    let type = req.body.oppType;
    let otherType = req.body.otherOppType; // if there's something here, this should be what renders
    let org = req.body.org;
    let subfield = req.body.subfield
    let otherSubfield = req.body.otherOppSubfield; // same as other "other"
    let appLink = req.body.applicationLink;
    let refLink; // confused on what the name is
    let expiration = req.body.due;
    let description = req.body.description;

    const db = await Connection.open(mongoUri, EMPOWER);
    const edited = await db.collection(OPPS).updateOne(
        {oid: oid},
        { $set:
            {
                name: name,
                location: location,
                type: type,
                org: org,
                subfield: subfield,
                link: appLink,
                expiration: expiration,
                referralLink: refLink,
                description: description,
            }
        });
    console.log(edited);
    let updatedOpp = await db.collection(OPPS).find({oid: oid}).toArray();
    console.log(updatedOpp[0]); // shows up as undefined
    let addedByUID = updatedOpp[0].addedBy;
    let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();
    res.render('updateOpp.ejs', {opp: updatedOpp[0], addedBy: addedBy[0], userUID: userUID, userName: userName})
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
app.post('/logout', (req,res) => {
    if (req.session.uid) {
      req.session.email = null;
      req.session.name = null;
      req.session.logged_in = false;
        // eventually, flash and redirect to /
        req.flash('info', `<p>Logged out.`);
        return res.redirect('/')
    } else {
        // eventually, flash and redirect to /
        req.flash('error', `<p>You are not logged in; please login.`);
        return res.redirect('/login');
    }
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
