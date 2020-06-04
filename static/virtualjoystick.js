
// setInterval(() => console.log(joystick.getPosition()), 16);

function createJoystick(parent) {
  const maxDiff = 100;
  const stick = document.createElement('div');
  stick.classList.add('joystick');

  stick.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  stick.addEventListener('touchstart', handleMouseDown);
  document.addEventListener('touchmove', handleMouseMove);
  document.addEventListener('touchend', handleMouseUp);

  let dragStart = null;
  let currentPos = { x: 0, y: 0 };

  function handleMouseDown(event) {
    stick.style.transition = '0s';
    if (event.changedTouches) {
      dragStart = {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };
      return;
    }
    dragStart = {
      x: event.clientX,
      y: event.clientY,
    };

  }

  function handleMouseMove(event) {
    if (dragStart === null) return;
    event.preventDefault();
    if (event.changedTouches) {
      event.clientX = event.changedTouches[0].clientX;
      event.clientY = event.changedTouches[0].clientY;
    }
    const xDiff = event.clientX - dragStart.x;
    const yDiff = event.clientY - dragStart.y;
    const angle = Math.atan2(yDiff, xDiff);
    const distance = Math.min(maxDiff, Math.hypot(xDiff, yDiff));
    const xNew = Math.cos(angle);
    const yNew = Math.sin(angle);
    const joyX = distance * xNew;
    const joyY = distance * yNew;
    stick.style.transform = `translate3d(${joyX}px, ${joyY}px, 0px)`;
    currentPos = { x: xNew, y: yNew };
  }

  function handleMouseUp(event) {
    if (dragStart === null) return;
    stick.style.transition = '.2s';
    stick.style.transform = `translate3d(0px, 0px, 0px)`;
    dragStart = null;
    currentPos = { x: 0, y: 0 };
  }

  parent.appendChild(stick);
  return {
    getPosition: () => currentPos,
  };
}
