/** CONFIG **/

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);


var SIGNALING_SERVER = 'http://localhost:38001';
var DEFAULT_CHANNEL = urlParams.get("channel") || 'default';
var MUTE_AUDIO_BY_DEFAULT = false;

/** You should probably use a different stun server doing commercial stuff **/
/** Also see: https://gist.github.com/zziuni/3741933 **/
var ICE_SERVERS = [ { urls: 'stun:stun.l.google.com:19302' } ];
