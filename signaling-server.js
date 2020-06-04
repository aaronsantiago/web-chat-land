/**************/
/*** CONFIG ***/
/**************/
const configData = require('./config.json');
var SOCKET_PORT = configData.SOCKET_PORT;
var STATIC_PORT = configData.STATIC_PORT;
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
  .listen(SOCKET_PORT);
var io = require('socket.io').listen(server);

app.use(bodyParser.urlencoded({ extended: false }));
app.listen(STATIC_PORT);

app.use(express.static('static'));

/*************************/
/*** SOCKET STUFF ********/
/*************************/
var channels = {};
var sockets = {};
var avatars = {};

let currentCustomId = 1000;
let createCustom = function(params, channel) {
  params.id = currentCustomId;
  params.peer_id = currentCustomId;
  params.channel = channel;
  avatars[currentCustomId] = params;

  currentCustomId += 1;
}

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
  socket.channel = "";
  sockets[socket.id] = socket;

  console.log('[' + socket.id + '] connection accepted');
  socket.on('disconnect', function() {
    part(socket.channel);
    console.log('[' + socket.id + '] disconnected');
    delete sockets[socket.id];
    delete avatars[socket.id];
  });

  socket.on('join', function(config) {
    console.log('[' + socket.id + '] join ', config);
    var channel = config.channel;
    var userdata = config.userdata;

    if (channel == socket.channel) {
      console.log('[' + socket.id + '] ERROR: already joined ', socket.channel);
      return;
    }

    if (!(channel in channels)) {
      channels[channel] = {};

      createCustom({
              x: 200,
              y: 200,
              width: 320,
              height: "200",
              url: "https://bigassmessage.com/92336",
              type: "iframe"
            }, channel);
    }

    // create avatar for new user
    avatars[socket.id] = {
      id: socket.id,
      peer_id:socket.id,
      x: 0,
      y: 0,
      width: 320,
      height: "",
      type: "user",
      channel: channel
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
    socket.channel = channel;
  });

  function part(channel) {
    console.log('[' + socket.id + '] part ');

    if (channel != socket.channel) {
      console.log('[' + socket.id + '] ERROR: not in ', channel);
      return;
    }

    socket.channel = ""
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

  socket.on('createCustom', function(config) {
    // IO.SOCKETS breaks channel stuff
    createCustom(config, sockets[socket.id].channel);
  });

  socket.on('deleteId', function(config) {
    // IO.SOCKETS breaks channel stuff
    // createCustom(config);
    delete avatars[config.id];
    socket.emit("deleteId", config)
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
      let channel = avatars[id].channel;
      for (let peerId in channels[channel]) {
        channels[channel][peerId].emit('updateObject', avatars[id]);
      }
    }
    setTimeout(updateAllObjects, 150);
  }
  updateAllObjects();
});
