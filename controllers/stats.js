/**
 * stats.js
 * ----------------------------------
 * Handles requests from the /stats url
 * Provides a stats dashboard for viewers to 
 * get a rundown of the game stats
 * @router
 */


// #
// # Load in dependencies
// #

var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var mc = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;

var notesCollection, usersCollection;
// #
// # Connect to DB
// #

mc.connect('mongodb://127.0.0.1/test-mongo', function(err, db) {
    if (err) {
        throw err;
    }
    
    notesCollection = db.collection('notes');
    usersCollection = db.collection('users');
    console.log("Connected to DBs");
});



/**
 & GET Functions
 & ----------------------------------
 & Handles GET requests from the admin area 
 & Provides admin server functionality for the game
 & %GET%
 */


// # Load homepage
router.get('/', function(req, res) {
    console.log("Trying to access stats homepage");
    
    res.render('stats/index', { title: 'Pyjama Jam', 
                           error: req.query.error });
    
});


// #
// # Load in notes
// #
router.get('/getNotes', function(req, res) {
    var username = req.session.username;

    var renderNotes = function(err, notes) {
        if (err) {
            notes = [{"title": "Couldn't get notes",
                      "owner": username,
                      "content": "Error fetching notes!"}];
        }
        res.send(notes);
    }
    
    if (username) {
        notesCollection.find({owner: username}).toArray(renderNotes);
    } else {
        res.send([{"title": "Not Logged In",
                   "owner": "None",
                   "content": "Nobody seems to be logged in!"}]);
    }    
});


/**
 & POST Functions
 & ----------------------------------
 & Handles POST requests from the admin area 
 & Provides admin server functionality for the game
 & %POST%
 */

router.post('/login', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    
    var authenticateUser = function(err, user){
        if (err || user === null || password !== user.password) {
            res.redirect("/admin/?error=invalid username or password");     
        } else {
            console.log("Username: %s", user);
            console.log("Entered pass: %s", password);
            console.log("User pass: %s", user.password);
            req.session.username = username;
            res.redirect("/admin/notes");
        }
    }
    
    usersCollection.findOne({username: username}, authenticateUser);
});

router.post('/logout', function(req, res) {
    req.session.destroy(function(err){
        if (err) {
            console.log("Error: %s", err);
        }
    });
    console.log("ADMIN LOGOUT TRIGGERED");
    res.redirect("/admin");
});

router.post('/updateNote', function(req, res) {
    var username = req.session.username;
    var id = req.body.id;
    var title = req.body.title;
    var content = req.body.content;
    
    var checkUpdate = function(err, result) {
        if (err) {
            res.send("ERROR: update failed");
        } else {
            res.send("update succeeded");
        }
    }
    
    if (username) {
        if (id && title && content) {
            notesCollection.update({_id: ObjectID(id)},
                                   {$set: {title: title,
                                           content: content}},
                                   checkUpdate);
        } else {
            res.send("ERROR: bad parameters");
        }
    } else {
        res.send("ERROR: not logged in");
    }
});

router.post('/newNote', function(req, res) {
    var username = req.session.username;
    var newNote;

    var reportInserted = function(err, notesInserted) {
        if (err) {
            res.send("ERROR: Could not create a new note");
        } else {
            res.send(notesInserted[0]._id);
        }
    }

    if (username) {
        newNote = {title: "Untitled",
                   owner: username,
                   content: "No content"};

        notesCollection.insert(newNote, reportInserted);
    } else {
        res.send("ERROR: Not Logged In");
    }
});

router.post('/register', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    var checkInsert = function(err, newUsers) {
        if (err) {
            res.redirect("/admin/?error=Unable to add user");
        } else {
            res.redirect("/admin/?error=User " + username +
                         " successfully registered");
        }
    }

    var checkUsername = function(err, user) {
        if (err) {
            res.redirect("/admin/?error=unable to check username");
        } else if (user === null) {
            var newUser = {
                username: username,
                password: password
            };
            usersCollection.update({username: username},
                                   newUser,
                                   {upsert: true},
                                   checkInsert);    

        } else {
            res.redirect("/admin/?error=user already exists");
        }
    }
    
    usersCollection.findOne({username: username}, checkUsername);
});



module.exports = router;
