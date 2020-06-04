function init() {
  initSocket();
  // spawnTwitch('thewaffle77', 167, 1640); //spawns into the billiards room
  // spawnYoutubeIframe('G0IBqtO1K28', 1325, 600); //puppies in the hall
  spawnYoutubeIframe('5qap5aO4i9A', 2300, 10); //chill anime beats in the lounge
  addCharades();
  // console.log("Connecting to signaling server");

  $('#globalText').click(() => {
    signaling_socket.emit('updateGlobalText', $('#globalText').val());
  });

  signaling_socket.on('updateGlobalText', (data) => {
    $('#globalText').val(data);
    //eval(data);
  });

  function updateMyAvatar() {
    signaling_socket.emit('updateSelf', {
      x     : my_X,
      y     : my_Y,
      width : guiOptions.width
    });
    if (local_media != null) {
      local_media[0].volume = 0;
    }
    setTimeout(updateMyAvatar, 200);
  }
  updateMyAvatar();

  function updateMyAvatarLocal() {
    let movementAmount = 10;
    if (guiOptions['godMode']) movementAmount = 20;
    if (leftHeld) {
      my_X -= movementAmount;
    }
    if (rightHeld) {
      my_X += movementAmount;
    }
    if (upHeld) {
      my_Y -= movementAmount;
    }
    if (downHeld) {
      my_Y += movementAmount;
    }
    if (joystick) {
      let joystickPos = joystick.getPosition();
      my_X += joystickPos.x * movementAmount;
      my_Y += joystickPos.y * movementAmount;
    }
    if (!guiOptions['godMode']) {
      let minX = 0;
      let minY = 0;
      my_X = my_X < minX ? minX : my_X;
      my_Y = my_Y < minY ? minY : my_Y;
      let maxX = 5000 - 320 - 200;
      let maxY = 3000 - 240 - 200;
      my_X = my_X > maxX ? maxX : my_X;
      my_Y = my_Y > maxY ? maxY : my_Y;
    }
    if (local_media != null) {
      local_media.attr('class', 'positionable');
      local_media[0].style.left = '' + my_X + 'px';
      local_media[0].style.top = '' + my_Y + 'px';
      let qtrNametagWidth = parseInt($('#myNametag').css('width')) / 4;
      $('#myNametag').css({
        left : `${my_X - qtrNametagWidth}px`,
        top  : `${my_Y - 200}px`
      });
      local_media[0].style.width = '' + guiOptions['width'] + 'px';
      if (!isScrolledIntoView(local_media[0])) local_media[0].scrollIntoView();
    }
    setTimeout(updateMyAvatarLocal, 20);
  }
  updateMyAvatarLocal();

  // This function is called whenveer the server sends an update
  // for an object in the room. It's called once for each object
  // as often as the server updates (200ms at time of writing)
  signaling_socket.on('updateObject', function(config) {
    // check if we already have this object, if so, update it
    if (config.id in serverObjects) {
      let obj = serverObjects[config.id];
      let av = config['avatar'];
      // copy all properties from the server onto our local object
      // don't overwrite it so that we keep any extra properties that we
      // added locally
      for (let propertyName in config) {
        serverObjects[config.id][propertyName] = config[propertyName];
      }
    } else {
      // if we don't have the object, create it
      // since it's a new object, just use the config object and
      // modify that
      serverObjects[config.id] = config;

      // custom initializations for different object types
      if (config.type == 'user') {
        if (config.peer_id == signaling_socket.id) {
          config.self = true;
        }
      }
      if (config.type == 'iframe') {
        config.el = $('<iframe>').attr({
          src   : config.url,
          class : 'positionable'
        });
        $('body').append(config.el);
        config.prevUrl = config.url;
      }
      if (config.type == 'image') {
        config.el = $('<iframe>').attr({
          src   : config.url,
          class : 'positionable'
        });
        $('body').append(config.el);
      }
    }

    // apply updates to the object element
    let so = serverObjects[config.id];

    // we normally get the object from the server before webrtc is finished
    // connecting, so if the element is null we check to see if the element
    // exists yet
    if (so.el == null && so.type == 'user') {
      if (so.peer_id in peer_media_elements) {
        so.el = peer_media_elements[so.peer_id][0];
        peer_media_elements[so.peer_id].attr('class', 'positionable');
      } else {
        return;
      }
    }

    // dont update self, or if the el doesn't exist
    if (so.self || so.el == null) {
      return;
    }

    so.el.style.left = so['x'] + 'px';
    so.el.style.top = so['y'] + 'px';
    so.el.style.zIndex = so['z'];
    so.el.style.width = so['width'] + 'px';
    so.el.style.height = so['height'] + 'px';

    // type specific updates
    if (so.type == 'user') {
      let dx = so.x - my_X;
      let dy = so.y - my_Y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      so.el.volume = Math.max(0, Math.min(1, (900 - distance) / 800));
      if (so.el.volume == 0 || guiOptions.receiveStreams == false) {
        so.el.srcObject.getTracks().forEach((t) => (t.enabled = false));
      } else {
        so.el.srcObject.getTracks().forEach((t) => (t.enabled = true));
      }
    }
    if (so.type == 'iframe') {
      if (so.url != so.prevUrl) {
        so.prevUrl = so.url;
        so.el.src = so.url;
      }
    }
    if (so.type == 'image') {
      if (so.url != so.prevUrl) {
        so.prevUrl = so.url;
        so.el.src = so.url;
      }
    }
  });
}
