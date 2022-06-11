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
var debug = require('debug')('chat-server:server');
var http = require('http');

require('dotenv').config(); // tells node.js to read from the .env file

let session = require('express-session'); // used to manage sessions and cookies

const MongoClient = require('mongodb').MongoClient;

const { OAuth2Client } = require('google-auth-library');

const {v4 : uuidv4} = require('uuid');

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
  cb(null, 'storageSpace')
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


let fileSchema = new Schema({
  name: String,
  desc: String,
  file:{
    data: Buffer,
    contentType: String
  }
});

const UpFile = mongoose.model('UpFile', fileSchema);



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
      await req.session.destroy();
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
        var file = fs.readFileSync(req.file.path);
        // var encoded_file = file.toString('base64');
        var final_file = {
            name: req.file.originalname,
            contentType:req.file.mimetype,
            // file: Buffer.from(encoded_file,'base64')
            // file: Buffer.from(file),
            file: file,
            size: req.file.size
        };


        file_collection.insertOne(final_file).then((result)=>{
          console.log(result);
          res.json(result);
          fs.unlinkSync("storageSpace/" + final_file.name);
        }).catch((error)=>{
          console.error(error);
          res.json(error);
        });
  
        console.log("req.file:", req.file);
      }
      catch(err) {
        res.status(500).json(err)
      }
    })

  });

  app.post(["/get_file_by_name", "/api/get_file_by_name"], (request, response)=>{
    console.log("Server received a request at ", request.url);

    file_collection.find({"name":request.body.name}).toArray().then((resp)=>{
      console.log(resp[0].file);
      response.send(resp[0].file);
    }).catch(error => {
      console.error(error);
      response.send(error);
    });

  });

  app.get(["/api/getAllFiles", "/getAllFiles"], (request, response)=>{
    console.log("Server received a request at ", request.url);

    file_collection.find().toArray().then((resp)=>{
      console.log(resp);
      response.send(resp);
    }).catch(error => {
      console.error(error);
      response.send(error);
    });

  });

  app.post(["/api/storeFile", "/storeFile"], (req, res)=>{
    console.log("Server received a request at ", req.url);
    // console.log(req.body);

    let dir = './fileStorage';

    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }

    let buff = new Buffer.from(req.body.filedata, 'base64');
    fs.writeFileSync("fileStorage/" + req.body.filename, buff);
    res.send({message:"We be gucci"});
  });

  
  app.get(["*", "/api/*"], (req, res) => {
    res.sendFile(
      path.join(__dirname, "../client/dist/index.html")
    );
  });

}).catch((error)=>{ // CATCH BLOCK FOR MONGO CONNECTION
  console.error(error);
});

