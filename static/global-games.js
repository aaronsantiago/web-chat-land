// prettier-ignore
const charadesWordlist = ['ping pong', 'snowball', 'roof', 'fly', 'fang', 'bicycle', 'bear', 'cape', 'puppet', 'piano', 'lipstick', 'salute', 'hula hoop', 'penguin', 'banana peel', 'whisper', 'popsicle', 'Frankenstein', 'earthquake', 'yo-yo', 'road', 'rain', 'alarm clock', 'dog leash', 'chop', 'pajamas', 'slam dunk', 'fiddle', 'seashell', 'jog', 'seesaw', 'nap', 'cheerleader', 'blind', 'beg', 'shopping cart', 'Michael Jackson', 'limbo', 'newspaper', 'twist', 'rhinoceros', 'cow', 'tickle', 'fetch', 'violin', 'cage', 'cello', 'braid', 'skateboard', 'stairs', 'trumpet', 'mop', 'shovel', 'money', 'soap', 'saddle', 'wink', 'tree', 'Spider Man', 'think', 'Airplane', 'Ears', 'Piano', 'Angry', 'Elephant', 'Pinch', 'Baby', 'Fish', 'Reach', 'Ball', 'Flick', 'Remote', 'Baseball', 'Football', 'Roll', 'Basketball', 'Fork', 'Sad', 'Bounce', 'Giggle', 'Scissors', 'Cat', 'Golf', 'Skip', 'Chicken', 'Guitar', 'Sneeze', 'Chimpanzee', 'Hammer', 'Spin', 'Clap', 'Happy', 'Spoon', 'Cough', 'Horns', 'Stomp', 'Cry', 'Joke', 'Stop', 'Dog', 'Mime', 'Tail', 'Drink', 'Penguin', 'Toothbrush', 'Drums', 'Phone', 'Wiggle', 'Duck', 'Photographer', 'Archer', 'Ghost', 'Rock star', 'Balance beam', 'Haircut', 'Shoelaces', 'Ballet', 'Halo', 'Sick', 'Balloon', 'Hiccup', 'Singer', 'Banana peel', 'Hot dog', 'Skateboard', 'Book', 'Hungry', 'Slippery', 'Braces', 'Hurt', 'Soccer', 'Button', 'Ice skating', 'Strong', 'Car', 'Karate', 'Stubbed toe', 'Cheers', 'Ladder', 'Sunshine', 'Clown', 'Light bulb', 'Surprise', 'Dinosaur', 'Limbo', 'Swing', 'Disco', 'Macarena', 'Sword', 'Dizzy', 'Paint', 'Tap dance', 'Fart', 'Pirate', 'Wheelbarrow', 'Fishing', 'Read', 'Wizard of Oz', 'Gallop', 'River dance']

function addCharades() {
  var el = $('<input/>')
    .attr({
      type  : 'button',
      id    : 'charadesButton',
      value : 'Charades!'
    })
    .click(() => {
      const randomWord =
        charadesWordlist[Math.floor(Math.random() * charadesWordlist.length)];
      alert(`"${randomWord}" (only you can see this!)`);
    });
  $('body').append(el);
}

function toggleSkribbl() {
  if (document.getElementById('skribbl').src != 'https://skribbl.io/') {
    document.getElementById('skribbl').src = 'https://skribbl.io';
  } else {
    document.getElementById('skribbl').src = '';
  }
}

function spawnTwitch(streamerId = 'vgtv_melee', xPos = 0, yPos = 0) {
  var el = $('<iframe/>')
    .attr({
      src             : `https://player.twitch.tv/?channel=${streamerId}&parent=kevbot.xyz&autoplay=false`,
      id              : 'twitchPlayer',
      height          : '300',
      width           : '400',
      frameborder     : '0',
      scrolling       : 'no',
      allowfullscreen : 'false',
      class           : 'positionable'
    })
    .css({ left: xPos + 'px', top: yPos + 'px' });
  $('body').append(el);
}

function setTwitch(streamerId) {
  document
    .getElementById('twitchPlayer')
    .setAttribute(
      'src',
      `https://player.twitch.tv/?channel=${streamerId}&parent=kevbot.xyz&autoplay=true`
    );
}

function spawnIframe(attrs = {}, xPos = 0, yPos = 0) {
  var el = $('<iframe/>')
    .attr(attrs)
    .css({ left: xPos + 'px', top: yPos + 'px' });
  $('body').append($(el));
}

function spawnYoutubeIframe(videoId, xPos, yPos) {
  const ytAttrs = {
    src             : `https://www.youtube.com/embed/${videoId}`,
    width           : '400',
    height          : '300',
    frameborder     : '0',
    allow           : 'autoplay; encrypted-media;',
    allowfullscreen : 'true',
    id              : 'youtubeId',
    class           : 'positionable'
  };
  spawnIframe(ytAttrs, xPos, yPos);
}
