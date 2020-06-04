var leftHeld = false;
var rightHeld = false;
var upHeld = false;
var downHeld = false;
var local_media = null;
var godMode = true;
var videoSenders = [];
var audioSenders = [];

let serverObjects = {};

const joystick = createJoystick(document.getElementById('joystickZone'));

let gui = new dat.GUI();
gui.close();
let guiOptions = {
  receiveStreams : true,
  godMode        : true,
  width          : 320,
  streamerId     : 'btssmash'
};
gui.add(guiOptions, 'receiveStreams');
gui.add(guiOptions, 'godMode');
gui.add(guiOptions, 'width');
gui.add(guiOptions, 'streamerId');
gui.add(
  {
    setTwitch : () => {
      return setTwitch(guiOptions.streamerId);
    }
  },
  'setTwitch'
);
gui.add(
  {
    toggleJoystick : function() {
      let x = document.getElementById('joystickZone');

      if (x.style.display === 'none') {
        x.style.display = 'block';
      } else {
        x.style.display = 'none';
      }
    }
  },
  'toggleJoystick'
);

gui.add(
  {
    screenShare : function() {
      let captureStream = null;

      local_media[0].srcObject.getTracks().forEach((track) => track.stop());
      navigator.mediaDevices
        .getDisplayMedia({ audio: true, video: true })
        .catch((err) => {
          console.error('Error:' + err);
          return null;
        })
        .then(function(stream) {
          // console.log(stream);
          for (let videoSender of videoSenders) {
            var screenVideoTrack = stream.getVideoTracks()[0];
            // in case stream is already closed
            try {
              videoSender.replaceTrack(screenVideoTrack);
            } catch (e) {
              console.log(e);
            }
          }
          for (let audioSender of audioSenders) {
            var screenAudioTrack = stream.getAudioTracks()[0];
            try {
              audioSender.replaceTrack(screenAudioTrack);
            } catch (e) {
              console.log(e);
            }
          }
          local_media[0].srcObject = stream;
          local_media_stream = stream;
        });
      // navigator.mediaDevices.getDisplayMedia({}).catch(err => { console.error("Error:" + err); return null; })
      // .then(function(stream){
      //     // console.log(stream);
      //     var screenAudioTrack = stream.getAudioTracks()[0];
      //     audioSender.replaceTrack(screenAudioTrack);
      //   });
    }
  },
  'screenShare'
);

function isScrolledIntoView(elem) {
  var docViewTop = $(window).scrollTop();
  var docViewBottom = docViewTop + $(window).height();

  var elemTop = $(elem).offset().top;
  var elemBottom = elemTop + $(elem).height();

  let visibleTop = elemBottom <= docViewBottom && elemTop >= docViewTop;

  var docViewLeft = $(window).scrollLeft();
  var docViewRight = docViewLeft + $(window).width();

  var elemLeft = $(elem).offset().left;
  var elemRight = elemLeft + $(elem).width();

  return visibleTop && (elemRight <= docViewRight && elemLeft >= docViewLeft);
}

document.addEventListener('keydown', function(e) {
  // console.log(e);
  if (e.keyCode == 37) {
    leftHeld = true;
  }
  if (e.keyCode == 38) {
    upHeld = true;
  }
  if (e.keyCode == 39) {
    rightHeld = true;
  }
  if (e.keyCode == 40) {
    downHeld = true;
  }
});
document.addEventListener('keyup', function(e) {
  if (e.keyCode == 37) {
    leftHeld = false;
  }
  if (e.keyCode == 38) {
    upHeld = false;
  }
  if (e.keyCode == 39) {
    rightHeld = false;
  }
  if (e.keyCode == 40) {
    downHeld = false;
  }
});

var signaling_socket = null; /* our socket.io connection to our webserver */
var local_media_stream = null; /* our own microphone / webcam */
var peers = {}; /* keep track of our peer connections, indexed by peer_id (aka socket.io id) */
var peer_media_elements = {}; /* keep track of our <video>/<audio> tags, indexed by peer_id */
var peerAvatars = {};
my_X = Math.random() * 100;
my_Y = Math.random() * 100;
