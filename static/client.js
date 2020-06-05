// This is the main entry point for JS in the project.
// This file currently manages updating objects on the webpage
// based on what it receives from the server.

function init() {
  initSocket();


  function updateMyAvatar() {
    let selfDescriptor = {
      x     : my_X,
      y     : my_Y,
      z     : guiOptions.z_index,
      width : guiOptions.width,
      height : guiOptions.height,
    };
    if (audioOnlyImage) {
      console.log(audioOnlyImage)
      selfDescriptor.url = audioOnlyImage;
    }
    signaling_socket.emit('updateSelf', selfDescriptor);
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
      local_media[0].style.width = '' + guiOptions['width'] + 'px';
      local_media[0].style.height = guiOptions['height'] != "" ? '' + guiOptions['height'] + 'px' : "";
      local_media[0].style.zIndex = guiOptions['z_index'];
      if (!isScrolledIntoView(local_media[0])) local_media[0].scrollIntoView();
    }
    setTimeout(updateMyAvatarLocal, 20);
  }
  updateMyAvatarLocal();

  // This function is called whenveer the server sends an update
  // for an object in the room. It's called once for each object
  // as often as the server updates (200ms at time of writing)
  signaling_socket.on('updateObject', function(objectData) {
    // check if we already have this object, if so, update it
    if (objectData.id in serverObjects) {
      let obj = serverObjects[objectData.id];
      let av = objectData['avatar'];
      // copy all properties from the server onto our local object
      // don't overwrite it so that we keep any extra properties that we
      // added locally
      for (let propertyName in objectData) {
        serverObjects[objectData.id][propertyName] = objectData[propertyName];
      }
    } else {
      // if we don't have the object, create it
      // since it's a new object, just use the objectData object and
      // modify that
      serverObjects[objectData.id] = objectData;

      // custom initializations for different object types
      if (objectData.type == 'user') {
        if (objectData.peer_id == signaling_socket.id) {
          objectData.self = true;
        }
      }
      if (objectData.type == 'iframe') {
        let jQueryEl = $('<iframe>');
        objectData.el = jQueryEl.attr({
          src   : objectData.url,
          class : 'positionable'
        })[0];
        jQueryEl.contextmenu(function() {promptDeleteItem(objectData.id)});
        $('body').append(objectData.el);
        objectData.prevUrl = objectData.url;
      }
      if (objectData.type == 'image') {
        let jQueryEl = $('<img>');
        objectData.el = jQueryEl.attr({
          src   : objectData.url,
          class : 'positionable'
        })[0];
        jQueryEl.contextmenu(function() {promptDeleteItem(objectData.id)});
        $('body').append(objectData.el);
      }
    }

    // apply updates to the object element
    let so = serverObjects[objectData.id];

    // we normally get the object from the server before webrtc is finished
    // connecting, so if the element is null we check to see if the element
    // exists yet
    if (so.el == null && so.type == 'user') {
      if (so.peer_id in peer_media_elements) {
        so.el = peer_media_elements[so.peer_id][0];
        console.log(so.el);
        peer_media_elements[so.peer_id].attr('class', 'positionable');
        // if (so.url) {
        //   let jQueryEl = $('<img>');
        //   let domEl = jQueryEl.attr({
        //     src   : so.url
        //   })[0];
        //   so.el.appendChild(domEl);
        // }
      } else {
        return;
      }
    }

    // dont update self, or if the el doesn't exist
    if (so.self || so.el == null) {
      return;
    }
    if (so.el.style) {
      so.el.style.left = so['x'] + 'px';
      so.el.style.top = so['y'] + 'px';
      so.el.style.zIndex = so['z'];
      so.el.style.width = so['width'] + 'px';
      so.el.style.height = so['height'] + 'px';
    }
    else {
      so.el.style = {};
    }

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

  // This function is called when an object is deleted.
  signaling_socket.on('deleteId', function(config) {
    let so = serverObjects[config.id];

    if (so.el) {
      so.el.parentNode.removeChild(so.el);
    }
    delete serverObjects[config.id];
  });

}

function promptDeleteItem(id) {
  if (confirm(
`Delete this object? This will delete it for everybody.`)) {
    signaling_socket.emit('deleteId', {
      id : id
    });
  }
}