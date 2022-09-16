#!/usr/bin/env node

/**
 * Module dependencies.
 */
var chat = require('../chat');
var socketio = require('socket.io');
const path = require("path");
const fs = require("fs");
var express = require('express');
var multer = require('multer');

var app = require('../app');
app.use("/dynfiles", express.static(path.join(__dirname, "../fileStorage")));
app.use("/api/dynfiles", express.static(path.join(__dirname, "../fileStorage")));
var debug = require('debug')('chat-server:server');
var http = require('http');

require('dotenv').config(); // tells node.js to read from the .env file

let session = require('express-session'); // used to manage sessions and cookies

const MongoClient = require('mongodb').MongoClient;

const { OAuth2Client } = require('google-auth-library');

const {v4 : uuidv4} = require('uuid');
fs.rmSync("fileStorage/", { recursive: true, force: true }); // deletes entire fileStorage dir upon server restart for certain reasons the developer knows about

let mongodb_connection_string = process.env.MONGO_CONNECTION_STRING; // saving as a permanent environment variable for security
app.use(session({ 
    secret: uuidv4(), // use UUIDs for session secrets?
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 31536000 } // if you do not set a value here, the cookie lasts for a session. since we want persistent storage, we set it to be some large amount of time.
}));
  

/**
* Get port from environment and store in Express.
*/

var port = normalizePort(process.env.PORT || '6005');
app.set('port', port);

/**
* Create HTTP server.
*/

var server = http.createServer(app);
var io = socketio(server,{
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
chat(io);


/**
* Listen on provided port, on all network interfaces.
*/

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
* Normalize a port into a number, string, or false.
*/

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
* Event listener for HTTP server "error" event.
*/

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
* Event listener for HTTP server "listening" event.
*/

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

app.use(
  express.static(path.join(__dirname, "../client/dist"))
);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("req.session.email from multer:", req.session.email);
    let subdirName = req.session.email;
    let re = /[a-zA-Z0-9_-]+/g;
    subdirName = (subdirName.match(re) || []).join('');
    console.log("subdirName from multer:", subdirName);

    let subDirPath = 'storageSpace/' + subdirName;
    if (!fs.existsSync(subDirPath)){
      fs.mkdirSync(subDirPath, { recursive: true });
    }
    cb(null, subDirPath);
},
  filename: function (req, file, cb) {
    // cb(null, Date.now() + '-' +file.originalname )
    cb(null, file.originalname)
}
})

const upload = multer({ storage: storage }).single('file');


const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Connecting MongoDB with Mongoose
mongoose.connect(mongodb_connection_string).then(() => {
      console.log('Mongoose connected successfully ')
    },
    error => {
      console.log('Could not connect Mongoose to database : ' + error)
    }
);


MongoClient.connect(mongodb_connection_string, {useUnifiedTopology: true }).then((client)=>{

  console.log("Connected to the database");
  const db = client.db("leaseFinderDB");
  const users_collection = db.collection('users_collection');
  const test_collection = db.collection('test_collection');
  const file_collection = db.collection('file_collection');

  app.use(async (req, res, next) => {
    console.log("Server received a request at middleware");
    users_collection.find({ email:  req.session.email }).toArray().then((users)=>{
      // console.log("This is from the middleware function", users);
      if (users[0] === undefined){
        req.user = -1;
      }
      else{
        req.user = users[0];
      }
      // console.log("req.user: ", req.user);
      next();
    })
    .catch(error => {
      console.error(error);
      res.send(error); 
    });

  });

  app.get(["/me", "/api/me"], async (req, res) => { // api call to get current user
    console.log("Server received a request at ", req.url);
    // console.log("THIS IS ME:", req.user);
    if (req.user === -1){
      res.status(200);
      res.json({"message":"No user logged in!"});
    }
    else{
      res.status(200);
      res.json(req.user);
    }

  });

  app.delete(["/api/google-logout", "/google-logout"], async (req, res) => {
    console.log("Server received a request at ", req.url);
    if (req.user === -1){
      res.status(200);
      res.json({"message":"No user logged in!"});
    }
    else{
      let subdirName = req.session.email;
      let re = /[a-zA-Z0-9_-]+/g;
      subdirName = (subdirName.match(re) || []).join('');
      fs.rmSync("fileStorage/" + subdirName, { recursive: true, force: true }); // deletes entire subdir
      req.session.destroy();
      res.status(200);
      res.json({
        message: "Logged out successfully"
      });
    }
  });


  app.post(["/store_id_token", "/api/store_id_token"], async (req, res) => {

    console.log("Server recieved a request at ", req.url);

    const { token }  = req.body;
    const client = new OAuth2Client(process.env.CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
      plugin_name:'MessagingApp'
    });
    const { name, email, picture } = ticket.getPayload();

    let to_update = {name, email, picture};

    const user = await users_collection.replaceOne({"email":email}, to_update, {upsert:true}); // using email as the unique identifier

    req.session.email = email; // since email is the only unique identifier

    console.log("req.session.email:", req.session.email);

    res.status(201);
    res.json(user);
  });



  app.post(["/demo_db_entry", "/api/demo_db_entry"], (request, response)=>{
    console.log("Server recieved a request at ", request.url);

    console.log(request.body);

    test_collection.insertOne(request.body).then((result)=>{
      console.log(result);
      response.send(result);
    }).catch((error)=>{
      console.error(error);
      response.send(error);
    });

  });

  app.get(["/sampleCall", "/api/sampleCall"], (request, response)=>{
    console.log("Got request at: " + request.url);
    response.send({message: "Hi client!"});
  });


  app.post(["/uploadFile", "/api/uploadFile"], async (req, res) => {
    console.log("Server recieved a request at ", req.url);

    upload(req, res, function (err) {
      try {
        let subdirName = req.session.email;
        let re = /[a-zA-Z0-9_-]+/g;
        subdirName = (subdirName.match(re) || []).join('');

        var file = fs.readFileSync(req.file.path);
        // var encoded_file = file.toString('base64');
        var final_file = {
            name: req.file.originalname,
            contentType:req.file.mimetype,
            owner: subdirName,
            file: file,
            size: req.file.size
        };

        let dir = './fileStorage/' + subdirName;

        fs.writeFileSync(dir + '/' + req.file.originalname, file);

        file_collection.insertOne(final_file).then((result)=>{
          console.log(result);
          res.json(result);
          // fs.unlinkSync("storageSpace/" + subdirName + "/" + final_file.name); // to delete single file
          fs.rmSync("storageSpace/" + subdirName, { recursive: true, force: true }); // deletes entire subdir
        }).catch((error)=>{
          console.error(error);
          res.status(500).json(err)
        });
  
        console.log("req.file:", req.file);
      }
      catch(err) {
        res.status(500).json(err)
      }
    })

  });

  app.get(["/api/getAllFiles", "/getAllFiles"], (req, res)=>{
    console.log("Server received a request at ", req.url);

    let subdirName = req.session.email;
    let re = /[a-zA-Z0-9_-]+/g;
    subdirName = (subdirName.match(re) || []).join('');

    let dir = './fileStorage/' + subdirName;

    if (fs.existsSync(dir)){
      fs.readdir(dir, (err, files) => {
        if (err) { //handling errors
          console.log('Unable to scan directory: ' + err);
          res.json('Unable to scan directory: ' + err);
        }
        else{ // all good
          res.json(files);
        } 
      });
    }
    else{
      file_collection.find({owner:subdirName}).sort({'name': 1}).toArray()
        .then((data)=>{
          let objArr = [];
          for (let i = 0; i < data.length; i++){
            objArr.push({filedata: data[i].file, filename: data[i].name})
          }

          let dir = './fileStorage/' + subdirName;

          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
          }

          for (let i = 0; i < objArr.length; i++){
            let bindata = objArr[i].filedata.toString("binary");
            let hexdata = new Buffer.from(bindata, 'ascii').toString('hex');
            let buffer = new Buffer.from(hexdata, 'hex');
            fs.writeFileSync(dir + '/' + objArr[i].filename, buffer);
          }

          let filenamesArr = [];
          objArr.map((obj) => {
            filenamesArr.push(obj.filename);
          })

          // the three lines below remove any duplicate data entries
          let s = new Set(filenamesArr);
          let it = s.values();
          filenamesArr = Array.from(it);

          res.json(filenamesArr);

        })
        .catch(error => {
          console.error(error);
          res.json(error);
        });
    }

  });


  app.get(["/api/getFile/:name", "/getFile/:name"], (req, res) => {
    console.log("Server received a request at:", req.url);
    
    console.log("req.params.name:", req.params.name);

    let subdirName = req.session.email;
    if (subdirName == undefined){
      res.status(401).send("You need to be authorized to access files!");
    }
    else{
      let re = /[a-zA-Z0-9_-]+/g;
      subdirName = (subdirName.match(re) || []).join('');
  
      let fullPath = path.join(__dirname, "../fileStorage/" + subdirName + "/" + req.params.name);
  
      if (fs.existsSync(fullPath)) {
          res.sendFile(fullPath)
      } else {
          res.sendStatus(404);
      }
    }

  });

  
  app.get(["*", "/api/*"], (req, res) => {
    res.sendFile(
      path.join(__dirname, "../client/dist/index.html")
    );
  });

}).catch((error)=>{ // CATCH BLOCK FOR MONGO CONNECTION
  console.error(error);
});

