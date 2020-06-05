// HERE BE DEMONS~
// This file handles setting up callbacks to and from the server
// along with initializing the camera. It also manages connections
// between peers. Be VERY careful modifying code in this file.


function initSocket() {
  signaling_socket = io(SIGNALING_SERVER);

  signaling_socket.on('connect', function() {
    console.log("Connected to signaling server");
    setup_local_media(function() {
      /* once the user has given us access to their
                         * microphone/camcorder, join the channel and start peering up */
      join_chat_channel(DEFAULT_CHANNEL, { customId: 'localUser' });
    });
  });
  signaling_socket.on('disconnect', function() {
    console.log("Disconnected from signaling server");
    /* Tear down all of our peer connections and remove all the
                     * media divs when we disconnect */
    for (peer_id in peer_media_elements) {
      peer_media_elements[peer_id].remove();
    }
    for (peer_id in peers) {
      peers[peer_id].close();
    }

    peers = {};
    peer_media_elements = {};
  });
  function join_chat_channel(channel, userdata) {
    signaling_socket.emit('join', { channel: channel, userdata: userdata, isVideo: !joinAudioOnly});
  }
  function part_chat_channel(channel) {
    signaling_socket.emit('part', channel);
  }
  
  /** 
                * When we join a group, our signaling server will send out 'addPeer' events to each pair
                * of users in the group (creating a fully-connected graph of users, ie if there are 6 people
                * in the channel you will connect directly to the other 5, so there will be a total of 15 
                * connections in the network). 
                */
  signaling_socket.on('addPeer', function(config) {
    console.log('Signaling server said to add peer:', config);
    var peer_id = config.peer_id;
    if (peer_id in peers) {
      /* This could happen if the user joins multiple channels where the other peer is also in. */
      console.log("Already connected to peer ", peer_id);
      return;
    }
    var peer_connection = new RTCPeerConnection(
      { iceServers: ICE_SERVERS },
      {
        optional : [ { DtlsSrtpKeyAgreement: true } ]
      } /* this will no longer be needed by chrome
                                                                        * eventually (supposedly), but is necessary 
                                                                        * for now to get firefox to talk to chrome */
    );
    peers[peer_id] = peer_connection;
    peerAvatars[peer_id] = config['avatar'];

    peer_connection.onicecandidate = function(event) {
      if (event.candidate) {
        signaling_socket.emit('relayICECandidate', {
          peer_id       : peer_id,
          ice_candidate : {
            sdpMLineIndex : event.candidate.sdpMLineIndex,
            candidate     : event.candidate.candidate
          }
        });
      }
    };
    peer_connection.ontrack = function(event) {
      console.log("onAddStream", event);
      remote_media = peer_media_elements[peer_id];
      if(remote_media == null) {
        var remote_media = $('<video>');
        remote_media.attr('autoplay', 'autoplay');
        remote_media.attr('id', peer_id);
        if (MUTE_AUDIO_BY_DEFAULT) {
          remote_media.attr('muted', 'true');
        }
        remote_media.attr('playsinline', '');
        remote_media.attr('controls', '');
        peer_media_elements[peer_id] = remote_media;
        peer_media_elements[peer_id][0].volume = 0;
        $('body').append(remote_media);
      }
      attachMediaStream(remote_media[0], event.streams[0]);
    };

    /* Add our local stream */
    // peer_connection.addStream(local_media_stream);

    try {
      let camVideoTrack = local_media_stream.getVideoTracks()[0];
      let camAudioTrack = local_media_stream.getAudioTracks()[0];
      if (camVideoTrack) {
        let videoSender = peer_connection.addTrack(
          camVideoTrack,
          local_media_stream
        );
        videoSenders.push(videoSender);
      }
      if (camAudioTrack) {
        let audioSender = peer_connection.addTrack(
          camAudioTrack,
          local_media_stream
        );
        audioSenders.push(audioSender);
      }
    } catch (e) {
      console.log(e);
    }

    /* Only one side of the peer connection should create the
                     * offer, the signaling server picks one to be the offerer. 
                     * The other user will get a 'sessionDescription' event and will
                     * create an offer, then send back an answer 'sessionDescription' to us
                     */
    if (config.should_create_offer) {
      console.log("Creating RTC offer to ", peer_id);
      peer_connection.createOffer({offerToReceiveVideo:config.isVideo}).then(
        function(local_description) {
          console.log("Local offer description is: ", local_description);
          peer_connection.setLocalDescription(local_description).then(
            function() {
              signaling_socket.emit('relaySessionDescription', {
                peer_id             : peer_id,
                session_description : local_description
              });
              console.log("Offer setLocalDescription succeeded");
            }).catch(
            function(e) {
              console.log('Offer setLocalDescription failed!');
            }
          );
        }
      ).catch(function(e){console.log(e)})
    }
  });

  /** 
                 * Peers exchange session descriptions which contains information
                 * about their audio / video settings and that sort of stuff. First
                 * the 'offerer' sends a description to the 'answerer' (with type
                 * "offer"), then the answerer sends one back (with type "answer").  
                 */
  signaling_socket.on('sessionDescription', function(config) {
    console.log('Remote description received: ', config);
    var peer_id = config.peer_id;
    var peer = peers[peer_id];
    var remote_description = config.session_description;
    console.log(config.session_description);

    var desc = new RTCSessionDescription(remote_description);
    var stuff = peer.setRemoteDescription(desc).then(
      function() {
        console.log("setRemoteDescription succeeded");
        console.log(remote_description); 
        if (remote_description.type == 'offer') {
          console.log("Creating answer");
          peer.createAnswer().then(
            function(local_description) {
              console.log("Answer description is: ", local_description);
              peer.setLocalDescription(local_description).then(
                function() {
                  signaling_socket.emit('relaySessionDescription', {
                    peer_id             : peer_id,
                    session_description : local_description
                  });
                  console.log("Answer setLocalDescription succeeded");
                }).catch(
                function() {
                  Alert('Answer setLocalDescription failed!');
                }
              );
            }).catch(
            function(error) {
              console.log("Error creating answer: ", error);
              console.log(peer);
            }
          );
        }
      }).catch(
      function(error) {
        console.log("setRemoteDescription error: ", error);
      }
    );
    console.log("Description Object: ", desc);
  });
  
  /**
                 * The offerer will send a number of ICE Candidate blobs to the answerer so they 
                 * can begin trying to find the best path to one another on the net.
                 */
  signaling_socket.on('iceCandidate', function(config) {
    var peer = peers[config.peer_id];
    var ice_candidate = config.ice_candidate;
    peer.addIceCandidate(new RTCIceCandidate(ice_candidate)).catch(function(e){
      console.log(e)
    });
  });

  /**
                 * When a user leaves a channel (or is disconnected from the
                 * signaling server) everyone will recieve a 'removePeer' message
                 * telling them to trash the media channels they have open for those
                 * that peer. If it was this client that left a channel, they'll also
                 * receive the removePeers. If this client was disconnected, they
                 * wont receive removePeers, but rather the
                 * signaling_socket.on('disconnect') code will kick in and tear down
                 * all the peer sessions.
                 */
  signaling_socket.on('removePeer', function(config) {
    console.log('Signaling server said to remove peer:', config);
    var peer_id = config.peer_id;
    if (peer_id in peer_media_elements) {
      peer_media_elements[peer_id].remove();
    }
    if (peer_id in peers) {
      peers[peer_id].close();
    }

    delete peers[peer_id];
    delete peer_media_elements[config.peer_id];
    delete peerAvatars[peer_id];
  });
}


/***********************/
/** Local media stuff **/
/***********************/
function setup_local_media(callback, errorback) {
  if (local_media_stream != null) {
    /* ie, if we've already been initialized */
    if (callback) callback();
    return;
  }
  /* Ask user for permission to use the computers microphone and/or camera, 
                 * attach it to an <audio> or <video> tag if they give us access. */
  console.log("Requesting access to local audio / video inputs");

  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia ||
    function(c, d, e) {navigator.mediaDevices.getUserMedia(c).then(d).catch(e);};

  attachMediaStream = function(element, stream) {
    // console.log('DEPRECATED, attachMediaStream will soon be removed.');
    element.srcObject = stream;
  };
  if (joinAudioOnly) {
    navigator.getUserMedia(
      { audio: true },
      function(stream) {
        console.log("adding local stream to dom")
        /* user accepted access to a/v */
        console.log("Access granted to audio only");
        local_media_stream = stream;
        local_media = $('<audio>');
        local_media.attr('autoplay', 'autoplay');
        local_media.attr(
          'muted',
          'true'
        ); /* always mute ourselves by default */
        local_media.attr('id', 'myVideo');
        local_media.attr('controls', '');
        local_media.attr('playsinline', '');
        $('body').append(local_media);
        attachMediaStream(local_media[0], stream);
        peer_media_elements[signaling_socket.id] = local_media;

        if (callback) callback();
      },
      function() {
        /* user denied access to a/v */
        console.log("Access denied for audio/video");
        alert(
          'You chose not to provide access to the camera/microphone, demo will not work.'
        );
        if (errorback) errorback();
      }
    );
  } else {
    navigator.getUserMedia(
      { audio: true, video: true },
      function(stream) {
        console.log("adding local stream to dom")
        /* user accepted access to a/v */
        console.log("Access granted to audio/video");
        local_media_stream = stream;
        local_media = $('<video>');
        local_media.attr('autoplay', 'autoplay');
        local_media.attr(
          'muted',
          'true'
        ); /* always mute ourselves by default */
        local_media.attr('id', 'myVideo');
        local_media.attr('controls', '');
        local_media.attr('playsinline', '');
        $('body').append(local_media);
        attachMediaStream(local_media[0], stream);
        peer_media_elements[signaling_socket.id] = local_media;

        if (callback) callback();
      },
      function(e) {
        console.log("couldn't add video, trying audio only", e)
        navigator.getUserMedia(
          { audio: true },
          function(stream) {
            /* user accepted access to a/v */
            console.log("Access granted to audio only");
            local_media_stream = stream;
            local_media = $('<audio>');
            local_media.attr('autoplay', 'autoplay');
            local_media.attr(
              'muted',
              'true'
            ); /* always mute ourselves by default */
            local_media.attr('controls', '');
            $('body').append(local_media);
            attachMediaStream(local_media[0], stream);

            if (callback) callback();
          },
          function(e) {
            /* user denied access to a/v */
            console.log("Access denied for audio/video", e);
            alert(
              'Unable to access to the camera/microphone, demo will not work.'
            );
            if (errorback) errorback();
          }
        );
      }
    );
  }
}