/**************/
/*** CONFIG ***/
/**************/
const configData = require('./config.json');
var PORT = configData.PORT;
const USEHTTPS = configData.USEHTTPS; // true or false
var httpsOptions = { key: '', cert: '' }; // gets OVERWRITTEN, EMPTY AS DEFAULT
let currentObjectId = 0;
/*************/
/*** SETUP ***/
/*************/

const https = require('https'),
  fs = require('fs');

if (fs.existsSync(configData.PRIVKEYPATH)) {
  httpsOptions = {
    key  : fs.readFileSync(configData.PRIVKEYPATH),
    cert : fs.readFileSync(configData.CERTPATH)
  };
}

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var app = express();

// var server = https.createServer(httpsOptions, app);
//io.set('log level', 2);

var server = http
  .createServer(app)
  .listen(PORT);
var io = require('socket.io').listen(server);

// server.listen(PORT, null, function() {
//   console.log('Listening on port ' + PORT);
// });
app.use(bodyParser.urlencoded({ extended: false }));
app.listen(8000);

// app.get('/thelounge', function(req, res) {
//   res.sendFile(__dirname + '/static/client.html');
// });
// main.get('/index.html', function(req, res){ res.sendfile('newclient.html'); });
// main.get('/client.html', function(req, res){ res.sendfile('newclient.html'); });
// app.use('/static', express.static('static'));
app.use(express.static('/static'));

/*************************/
/*** INTERESTING STUFF ***/
/*************************/
var channels = {};
var sockets = {};
var avatars = {};
var sharedState = { globalText: 'global Messageboard' };

/**
 * Users will connect to the signaling server, after which they'll issue a "join"
 * to join a particular channel. The signaling server keeps track of all sockets
 * who are in a channel, and on join will send out 'addPeer' events to each pair
 * of users in a channel. When clients receive the 'addPeer' even they'll begin
 * setting up an RTCPeerConnection with one another. During this process they'll
 * need to relay ICECandidate information to one another, as well as SessionDescription
 * information. After all of that happens, they'll finally be able to complete
 * the peer connection and will be streaming audio/video between eachother.
 */
io.sockets.on('connection', function(socket) {
  socket.channels = {};
  sockets[socket.id] = socket;

  console.log('[' + socket.id + '] connection accepted');
  socket.on('disconnect', function() {
    for (var channel in socket.channels) {
      part(channel);
    }
    console.log('[' + socket.id + '] disconnected');
    delete sockets[socket.id];
    delete avatars[socket.id];
  });

  socket.on('join', function(config) {
    console.log('[' + socket.id + '] join ', config);
    var channel = config.channel;
    var userdata = config.userdata;

    if (channel in socket.channels) {
      console.log('[' + socket.id + '] ERROR: already joined ', channel);
      return;
    }

    if (!(channel in channels)) {
      channels[channel] = {};
    }
    socket.emit('updateGlobalText', sharedState.globalText);

    // create avatar for new user
    avatars[socket.id] = {
      id: socket.id,
      peer_id:socket.id,
      x: 0,
      y: 0,
      width: 320,
      height: "",
      type: "user"
    };

    for (id in channels[channel]) {
      channels[channel][id].emit('addPeer', {
        peer_id             : socket.id,
        should_create_offer : false,
        // position            : avatars[socket.id]
      });
      socket.emit('addPeer', {
        peer_id             : id,
        should_create_offer : true,
        // position            : avatars[socket.id]
      });
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  function part(channel) {
    console.log('[' + socket.id + '] part ');

    if (!(channel in socket.channels)) {
      console.log('[' + socket.id + '] ERROR: not in ', channel);
      return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];

    for (id in channels[channel]) {
      channels[channel][id].emit('removePeer', { peer_id: socket.id });
      socket.emit('removePeer', { peer_id: id });
    }
  }
  socket.on('part', part);

  socket.on('relayICECandidate', function(config) {
    var peer_id = config.peer_id;
    var ice_candidate = config.ice_candidate;
    // console.log(
    //   '[' + socket.id + '] relaying ICE candidate to [' + peer_id + '] ',
    //   ice_candidate
    // );

    if (peer_id in sockets) {
      sockets[peer_id].emit('iceCandidate', {
        peer_id       : socket.id,
        ice_candidate : ice_candidate,
        candidate : ice_candidate
      });
    }
  });

  socket.on('updateGlobalText', function(config) {
    // IO.SOCKETS breaks channel stuff
    sharedState.globalText = config;
    io.sockets.emit('updateGlobalText', config);
  });

  socket.on('relaySessionDescription', function(config) {
    var peer_id = config.peer_id;
    var session_description = config.session_description;
    console.log(
      '[' + socket.id + '] relaying session description to [' + peer_id + '] ',
      session_description
    );

    if (peer_id in sockets) {
      sockets[peer_id].emit('sessionDescription', {
        peer_id             : socket.id,
        session_description : session_description
      });
    }
  });
  socket.on('updateSelf', function(config) {
    if (!(socket.id in avatars)) {
      console.log('socket id not found in avatars ' + socket.id);
      return;
    }
    for (let prop in config) {
      avatars[socket.id][prop] = config[prop];
    }
  });

  function updateAllObjects() {
    for (var id in avatars) {
      // if (peer_id == socket.id) continue;

      socket.emit('updateObject', avatars[id]);
    }
    setTimeout(updateAllObjects, 50);
  }
  updateAllObjects();
});
