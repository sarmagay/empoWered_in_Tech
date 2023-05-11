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
const bcrypt = require('bcrypt');

// our modules loaded from cwd

const { Connection } = require('./connection'); // Olivia's module
const cs304 = require('./cs304');
const { slice } = require('lodash');
const { find } = require('async');

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
app.use(flash());

// ================================================================
// custom routes here

const DB = process.env.USER;
const EMPOWER = 'empower';
const USERS = 'users';
const OPPS = 'opps';
const ROUNDS = 15;

// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    return res.render('index.ejs');
});

app.get('/login', (req, res) => {
    if (req.session.logged_in) {
        req.flash(`error`, 'You are already logged in.');
        return res.redirect('/user/' + req.session.uid);
    }
    return res.render('login.ejs');
});

app.get('/signUp', (req, res) => {
    if (req.session.logged_in) {
        req.flash(`error`, 'You are already logged in.');
        return res.redirect('/user/' + req.sessionOptions.uid);
    }
    return res.render('signUp.ejs', {action: '/userForm/', data: req.query});
})

app.get('/userForm', (req, res) => {
    return res.render('userForm.ejs', {email: req.session.username});
})

app.get('/search', async (req, res) => {
    const db = await Connection.open(mongoUri, EMPOWER);
    let term = req.query.term;
    let category = req.query.category;
    console.log("submitted= name: " + term + ", type: " + category);
    let findDict = {};
    findDict[category] = (new RegExp(term, "i"));

    // looks for opportunities that match search and displays them. If no matches, flashes that no results were found.
    let results = await db.collection(OPPS).find(findDict).toArray();
    if (results.length == 0) {
        req.flash('error', `Sorry, no results found.`);
    }
    console.log(results);
    return res.render('postings.ejs', {list: results, userUID: req.session.uid, userName: req.session.name});
})

app.get('/postings', async (req, res) => {
    if (req.session.logged_in) {
        const db = await Connection.open(mongoUri, EMPOWER);
        let allOpps = await db.collection(OPPS).find({oid: {$exists: true}}).toArray();
        console.log(req.session.uid, req.session.name);
        return res.render('postings.ejs', {
            list: allOpps, 
            userUID: req.session.uid,
            userName: req.session.name
        });
    } else {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
})

app.get('/do-postings', async (req, res) => {
    const db = await Connection.open(mongoUri, EMPOWER);
    let showOpps = await db.collection(OPPS).find({}).toArray();
    let btnClicked = req.query.button;
    // filters postings by what filter button user selects
    // shows all postings
    if (btnClicked == "allOpBtn"){
        showOpps = await db.collection(OPPS).find({}).toArray();
    }
    // shows internships
    else if (btnClicked == "internshipBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /internship/i }}).toArray();
    }
    // shows jobs
    else if (btnClicked == "jobBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /job/i }}).toArray();
    }
    // shows research
    else if (btnClicked == "researchBtn"){
        showOpps = await db.collection(OPPS).find({type:{$regex: /research/i }}).toArray();
    }
    // shows remote
    else if (btnClicked == "remoteBtn"){
        showOpps = await db.collection(OPPS).find({location:{$regex: /remote/i }}).toArray();
    }
    return res.render('postings.ejs', {
        list: showOpps, 
        userUID: req.session.uid, 
        userName: req.session.name
    });
})

app.get('/oppForm', (req, res) => {
    if (req.session.logged_in) {
        return res.render('oppForm.ejs', {userUID: req.session.uid, userName: req.session.name});
    } else {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
})


app.get('/post/:oid', async (req, res) => {
    let postOID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    if (opp.length != 0) {
        if (req.session.logged_in) {
            // need data from corresponding opportunity doc
            let postOID = parseInt(req.params.oid);
            console.log(postOID);
            req.session.postOID = postOID;
            const db = await Connection.open(mongoUri, EMPOWER);
            let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
            console.log(opp);
            //let addedByUID = opp[0].addedBy.uid;
            let addedByName = opp[0].addedBy.name;
            console.log(addedByName);
            //console.log(addedByUID);
            //let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();
            //console.log(addedBy);
            return res.render('postPage.ejs', {post: opp[0], 
                                               addedByName: addedByName, 
                                               userUID: req.session.uid, 
                                               userName: req.session.name});
        } else {
            req.flash('error', `User must be logged in.`);
            return res.redirect('/login');
        }
    } else {
        req.flash('error', `Post does not exist.`);
        return res.redirect('/postings');
    }
})

app.get('/user/:uid', async (req, res) => {
    // need data from corresponding userProfile
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    let currUserUID = req.params.uid;
    if (req.session.uid === currUserUID) {
        const db = await Connection.open(mongoUri, EMPOWER);
        console.log(req.session.uid);
        let user = await db.collection(USERS).find({uid: req.session.uid}).toArray();
        console.log(user);
        //setting up the checkbox pre-select values to render in the userProfile.ejs
        let isCheckedArr = user[0].industry;
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

        if (isCheckedArr.includes("bioinformatics")){isCheckedBio = true;};
        if (isCheckedArr.includes("cloud")){isCheckedCloud = true;};
        if (isCheckedArr.includes("compVision")){isCheckedCompVision = true;};
        if (isCheckedArr.includes("dataScience")){isCheckedDataScience = true;};
        if (isCheckedArr.includes("graphics")){isCheckedGraphics = true;};
        if (isCheckedArr.includes("hci")){isCheckedHci = true;};
        if (isCheckedArr.includes("ml")){isCheckedML = true;};
        if (isCheckedArr.includes("prodDesign")){isCheckedProdDesign = true;};
        if (isCheckedArr.includes("prodMgmt")){isCheckedProdMgmt = true;};
        if (isCheckedArr.includes("swe")){isCheckedSWE = true;};
        if (isCheckedArr.includes("systems")){isCheckedSystems = true;};
        if (isCheckedArr.includes("uiux")){isCheckedUiUx = true;};
        if (isCheckedArr.includes("other")){isCheckedOther = true;};
        return res.render('userProfile.ejs', {user: user[0], 
                                          userUID: req.session.uid, 
                                          userName: req.session.name, 
                                          statuses: ["Alumn", "Professor", "Staff", "Student", "Affiliate"],
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
    } else {
        req.flash('error', `You do not have permission to view this user`);
        return res.redirect('/user/' + req.session.uid);
    }
});

app.get('/updatePost/:oid', async (req, res) => {
    // need data from corresponding opportunity doc
    let postOID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let opp = await db.collection(OPPS).find({oid: postOID}).toArray();
    if (opp[0].addedBy.name != req.session.name) {
        req.flash('error', `You do not have permission to edit this opp`);
        return res.redirect('/post/' + postOID);
    }
    let addedByUID = opp[0].addedBy.uid;
    console.log(addedByUID);
    let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();
    console.log(addedBy);
    //setting up the drop-down pre-select values to render in the updateOpp.ejs
    let isSelectedStr = opp[0].type;
    let isSelectedConf = false;
    let isSelectedFel = false;
    let isSelectedJob = false;
    let isSelectedInt = false;
    let isSelectedRes = false;
    let isSelectedWork = false;
    let isSelectedOther = false;

    if (isSelectedStr == "Conference" ){isSelectedConf = true;};
    if (isSelectedStr == "Fellowship" ){isSelectedFel = true;};
    if (isSelectedStr == "Full-time Job" ){isSelectedJob = true;};
    if (isSelectedStr == "Internship" ){isSelectedInt = true;};
    if (isSelectedStr == "Research" ){isSelectedRes = true;};
    if (isSelectedStr == "Workshop" ){isSelectedWork = true;};
    if (isSelectedStr == "Other" ){isSelectedOther = true;};

    //setting up the checkbox pre-select values to render in the updateOpp.ejs
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

    if (isCheckedArr.includes("bioinformatics")){isCheckedBio = true;};
    if (isCheckedArr.includes("cloud")){isCheckedCloud = true;};
    if (isCheckedArr.includes("compVision")){isCheckedCompVision = true;};
    if (isCheckedArr.includes("dataScience")){isCheckedDataScience = true;};
    if (isCheckedArr.includes("graphics")){isCheckedGraphics = true;};
    if (isCheckedArr.includes("hci")){isCheckedHci = true;};
    if (isCheckedArr.includes("ml")){isCheckedML = true;};
    if (isCheckedArr.includes("prodDesign")){isCheckedProdDesign = true;};
    if (isCheckedArr.includes("prodMgmt")){isCheckedProdMgmt = true;};
    if (isCheckedArr.includes("swe")){isCheckedSWE = true;};
    if (isCheckedArr.includes("systems")){isCheckedSystems = true;};
    if (isCheckedArr.includes("uiux")){isCheckedUiUx = true;};
    if (isCheckedArr.includes("other")){isCheckedOther = true;};
    return res.render('updateOpp.ejs', {opp: opp[0], 
                                        addedBy: addedBy[0], 
                                        userUID: req.session.uid, 
                                        userName: req.session.name,
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
                                        isCheckedOther: isCheckedOther,
                                        isSelectedConf: isSelectedConf,
                                        isSelectedFel: isSelectedFel,
                                        isSelectedJob: isSelectedJob,
                                        isSelectedInt: isSelectedInt,
                                        isSelectedRes: isSelectedRes,
                                        isSelectedWork: isSelectedWork,
                                        isSelectedOther: isSelectedOther});
});

// shows how logins might work by setting a value in the session
// This is a conventional, non-Ajax, login, so it redirects to main page 
app.post('/login', async (req, res) => {
    const db = await Connection.open(mongoUri, EMPOWER);
    try {
        var username = req.body.uname;
        var password = req.body.psw;
        var existingUser = await db.collection(USERS).findOne({email: username});
        if (!existingUser) {
            req.flash('error', `User with email ${username} does not exist, please try again.`);
            console.log("User with email does not exist")
            return res.redirect('/login');
        }
        console.log(password, existingUser.password);
        const match = await bcrypt.compare(password, existingUser.password);
        console.log(match);
        if (!match) {
            req.flash('error', `Incorrect username or password. Please try again.`);
            console.log("Incorrect username or password")
            return res.redirect('/login');
        }
        req.flash('info', `Logged in as ` + username);
        req.session.username = username;
        req.session.logged_in = true;
        req.session.uid = existingUser.uid;
        req.session.name = existingUser.name;
        return res.redirect('/postings');
    }   catch (error) {
        req.flash('error', `Something went wrong: ${error}`);
        console.log("Something went wrong")
        return res.redirect('/login');
    }
});

app.post('/signUp', async (req, res) => {
    let email = req.body.uname;
    let db = await Connection.open(mongoUri, EMPOWER);
    let users = await db.collection(USERS).find({email: email}).toArray();
    // ADDING PASSWORD FUNCTIONALITY
    let password = req.body.psw.toString();
    let hash = await bcrypt.hash(password, ROUNDS);
    console.log(users);
    if (users.length != 0){
        //console.log("found null");
        req.flash('error', `User with email ${email} already in use! Please log in.`);
        //console.log("passed flash");
        return res.redirect('/login');
    }
    else if (email.slice(-14) != '@wellesley.edu') {
        req.flash('error', `Error: Email must be a "@wellesley.edu" email!`);
        return res.render('signUp.ejs');
    }
    else if (req.body.psw != req.body.psw2) {
        req.flash('error', `Please make sure passwords are matching!`);
        return res.render('signUp.ejs');
    }
    else {
        const newUser = await db.collection(USERS).updateOne(
            {email: email},
            {$setOnInsert:
                {
                    email: email,
                    password: hash
                }
            },
            {upsert: true}
        )
        console.log(newUser);
        req.session.username = email;
        return res.render('userForm.ejs', {email: email}); 
    }
 
})

app.post('/userForm', async (req, res) => {
    try {
        console.log(req.body);
        let name = req.body.fullName;
        let uid = req.body.uid;
        let status = req.body.userStatus;
        let industry = req.body.industry;
        let otherIndustry = req.body.otherInterest;
        if (Array.isArray(industry) && (otherIndustry != '' || otherIndustry != null)){
            industry.unshift(otherIndustry);
        }
        else if (typeof(industry) == "string" && (otherIndustry != '' || otherIndustry != null)){
            industry = [industry];
            industry.unshift(otherIndustry);
        }
        let year = parseInt(req.body.classYear); // when user doesn't have a class year (ex: faculty), the NaN value doesn't show up in userProfile
        let majors = req.body.majors.split(", ")
        let minors = req.body.minors;
        const db = await Connection.open(mongoUri, EMPOWER);
        const inserted = await db.collection(USERS).updateOne(
            {email: req.session.username},
            { $set:
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
        req.session.logged_in = true;
        req.session.uid = uid;
        req.session.name = name;
        res.redirect('/user/' + uid);
    } catch (error) {
        req.flash('error', `Something went wrong: ${error}`);
        return res.redirect('/userForm');
    }
})

app.post('/oppForm', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    console.log(req.body);
    let name = req.body.opportunityName;
    let location = req.body.location;
    let type = req.body.oppType;
    let otherType = req.body.otherOppType;
    if (Array.isArray(industry) && (otherType != '' || otherType != null)){
        industry.unshift(otherType);
    }
    else if (typeof(industry) == "string" && (otherType != '' || otherType != null)){
        industry = [industry];
        industry.unshift(otherType);
    }
    let org = req.body.org;
    let subfield = req.body.subfield; // multiple things
    let otherSubfield = req.body.otherOppSubfield;
    if (Array.isArray(industry) && (otherSubfield != '' || otherSubfield != null)){
        industry.unshift(otherSubfield);
    }
    else if (typeof(industry) == "string" && (otherSubfield != '' || otherSubfield != null)){
        industry = [industry];
        industry.unshift(otherSubfield);
    }
    let appLink = req.body.applicationLink;
    let spam = req.body.spam; //
    let expiration = req.body.due; //
    let refLink = req.body.referralLink;
    let description = req.body.description; //
    let addedByUID = req.session.uid;
    console.log('addedby uid: ', addedByUID);
    const db = await Connection.open(mongoUri, EMPOWER);
    const opps = await db.collection(OPPS);
    let addedByUser = await db.collection(USERS).find({uid: addedByUID}).toArray();
    console.log(addedByUser)
    // increment the counter document
    let result = await opps.findOneAndUpdate({counter: {$exists: true}},
                                             {$inc: {counter: 1}}, 
                                             {returnDocument: "after"});
    let oid = result.value.counter;
    console.log('new oid: ', oid);
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
                addedBy: {uid: addedByUID, name: addedByUser[0].name},
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

app.post('/commentForm', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    let comment = req.body.description;
    const db = await Connection.open(mongoUri, EMPOWER);
    let currPost = await db.collection(OPPS).find({oid: parseInt(req.session.postOID)}).toArray();
    if (currPost[0].comments == null) {
        let edited = await db.collection(OPPS).updateOne(
            {oid: currPost[0].oid},
            { $set:
                {
                    comments: [{author: req.session.name, content: comment}],
                }
            });
        console.log(edited);
    } else {
        let edited = await db.collection(OPPS).updateOne(
            {oid: currPost[0].oid},
            { $push:
                {
                    comments: {author: req.session.name, content: comment},
                }
            });
        console.log(edited);
    }
    return res.redirect('/post/' + currPost[0].oid);
})

app.post('/user/:uid', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    let uid = req.params.uid;
    if (uid != req.session.uid) {
        req.flash('error', `You currently do not have permission to modify this user profile. Please log out of this account and log in to that user.`);
        return res.redirect('/user/' + req.session.uid);
    }
    console.log(req.body);
    let name = req.body.fullName;
    let email = req.body.email;
    let status = req.body.userStatus;
    let industry = req.body.industry;
    let otherIndustry = req.body.otherInterest;
    //console.log(typeof(industry));
    if (Array.isArray(industry) && (otherIndustry != '' || otherIndustry != null)){
        industry.unshift(otherIndustry);
        console.log("hello");
    }
    else if (typeof(industry) == "string" && (otherIndustry != '' || otherIndustry != null)){
        industry = [industry];
        industry.unshift(otherIndustry);
    }
    
    let year = parseInt(req.body.classYear);
    let majors = req.body.majors.split(", ")
    let minors = req.body.minors;
    const db = await Connection.open(mongoUri, EMPOWER);
    let edited = await db.collection(USERS).updateOne(
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
    console.log(updatedUser[0]);
    res.redirect('/user/' + uid); // goes to correct link tho
})

app.post('/user/delete/:uid', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    if (req.params.uid != req.session.uid) {
        req.flash('error', `You do not have permission to modify this user. Please log out and log into this user`);
        return res.redirect('/user/' + req.session.uid);
    }
    console.log("beginning of delete func");
    req.session.uid = null;
    req.session.name = null;
    req.session.logged_in = false;
    req.session.username = null;
    const db = await Connection.open(mongoUri, EMPOWER);
    const userUID = req.params.uid;
    console.log("right before deletion, userUID: ", userUID);
    const deletion = await db.collection(USERS).deleteOne({uid: userUID});
    console.log("deleted count: ", deletion.deletedCount);
    if (deletion.deletedCount == 1) {
        console.log(deletion.acknowledged);
        console.log(" saw delete! ");
        req.flash(`info`, `User ${userUID} was deleted successfully.`);
        return res.redirect("/login");
    }
    else {
        req.flash('error', `Error deleting user with ${userUID}`)
    }
})

app.post('/post/delete/:oid', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    const oppID = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let currPost = await db.collection(OPPS).find({oid: oppID}).toArray();
    console.log(currPost)
    let postAuthorUID = currPost[0].addedBy.uid;
    if (req.session.uid != postAuthorUID) {
        req.flash('error', `You do not have permission to modify this post. Please log out and log in as this post's author.`);
        return res.redirect('/user/' + req.session.uid);
    }
    const deletion = await db.collection(OPPS).deleteOne({oid: oppID});
    if (deletion.deletedCount == 1) {
        console.log(deletion.acknowledged);
        req.flash(`info`, `Opportunity ${oppID} was deleted.`);
        return res.redirect("/postings");
    }
    else {
        req.flash('error', `Error deleting opportunity with ${oppID}`)
    }
});

app.post('/logout', (req, res) => {
    req.session.uid = null;
    req.session.name = null;
    req.session.logged_in = false;
    req.session.username = null;
    req.flash(`info`, `Successfully logged out.`);
    return res.redirect("/login");
})


app.post('/updatePost/:oid', async (req, res) => {
    if (!req.session.logged_in) {
        req.flash('error', `User must be logged in`);
        return res.redirect('/login');
    }
    let oid = parseInt(req.params.oid);
    const db = await Connection.open(mongoUri, EMPOWER);
    let currPost = db.collection(OPPS).find({oid: oid}).toArray();
    let postAuthorUID = currPost[0].addedBy.uid; //not working
    if (req.session.uid != postAuthorUID) {
        req.flash('error', `You do not have permission to modify this post. Please log out and log in as this post's author.`);
        return res.redirect('/user/' + req.session.uid);
    }
    // checking if user is author of post
    // need to write how to update the information with the edits
    console.log(req.body);
    let name = req.body.opportunityName;
    let location = req.body.location;
    let type = req.body.oppType;
    let otherType = req.body.otherOppType;
    if (Array.isArray(industry) && (otherType != '' || otherType != null)){
        industry.unshift(otherType);
    }
    else if (typeof(industry) == "string" && (otherType != '' || otherType != null)){
        industry = [industry];
        industry.unshift(otherType);
    }
    let org = req.body.org;
    let subfield = req.body.subfield
    let otherSubfield = req.body.otherOppSubfield;
    if (Array.isArray(industry) && (otherSubfield != '' || otherSubfield != null)){
        industry.unshift(otherSubfield);
    }
    else if (typeof(industry) == "string" && (otherSubfield != '' || otherSubfield != null)){
        industry = [industry];
        industry.unshift(otherSubfield);
    }
    let appLink = req.body.applicationLink;
    let refLink = req.body.referralLink;
    let expiration = req.body.due;
    let description = req.body.description;

    let edited = await db.collection(OPPS).updateOne(
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
    let addedByUID = updatedOpp[0].addedBy.uid;
    let addedBy = await db.collection(USERS).find({uid: addedByUID}).toArray();

    //console.log(addedBy[0]);

    //setting up the drop-down pre-select values to render in the updateOpp.ejs
    let isSelectedStr = updatedOpp[0].type;
    let isSelectedConf = false;
    let isSelectedFel = false;
    let isSelectedJob = false;
    let isSelectedInt = false;
    let isSelectedRes = false;
    let isSelectedWork = false;
    let isSelectedOther = false;

    if (isSelectedStr == "Conference" ){isSelectedConf = true;};
    if (isSelectedStr == "Fellowship" ){isSelectedFel = true;};
    if (isSelectedStr == "Full-time Job" ){isSelectedJob = true;};
    if (isSelectedStr == "Internship" ){isSelectedInt = true;};
    if (isSelectedStr == "Research" ){isSelectedRes = true;};
    if (isSelectedStr == "Workshop" ){isSelectedWork = true;};
    if (isSelectedStr == "Other" ){isSelectedOther = true;};

    //setting up the checkbox pre-select values to render in the updateOpp.ejs
    let isCheckedArr = updatedOpp[0].subfield;
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

    if (isCheckedArr.includes("bioinformatics")){isCheckedBio = true;};
    if (isCheckedArr.includes("cloud")){isCheckedCloud = true;};
    if (isCheckedArr.includes("compVision")){isCheckedCompVision = true;};
    if (isCheckedArr.includes("dataScience")){isCheckedDataScience = true;};
    if (isCheckedArr.includes("graphics")){isCheckedGraphics = true;};
    if (isCheckedArr.includes("hci")){isCheckedHci = true;};
    if (isCheckedArr.includes("ml")){isCheckedML = true;};
    if (isCheckedArr.includes("prodDesign")){isCheckedProdDesign = true;};
    if (isCheckedArr.includes("prodMgmt")){isCheckedProdMgmt = true;};
    if (isCheckedArr.includes("software engineering")){isCheckedSWE = true;};
    if (isCheckedArr.includes("systems")){isCheckedSystems = true;};
    if (isCheckedArr.includes("uiux")){isCheckedUiUx = true;};
    if (isCheckedArr.includes("other")){isCheckedOther = true;};

    res.render('updateOpp.ejs', {userUID: req.session.uid,
                                userName: req.session.name,
                                opp: updatedOpp[0], 
                                addedBy: addedBy[0], 
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
                                isCheckedOther: isCheckedOther,
                                isSelectedConf: isSelectedConf,
                                isSelectedFel: isSelectedFel,
                                isSelectedJob: isSelectedJob,
                                isSelectedInt: isSelectedInt,
                                isSelectedRes: isSelectedRes,
                                isSelectedWork: isSelectedWork,
                                isSelectedOther: isSelectedOther})
})

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
