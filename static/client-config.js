/** CONFIG **/
var SIGNALING_SERVER = 'https://localhost';
var DEFAULT_CHANNEL = 'some-global-channel-name';
var MUTE_AUDIO_BY_DEFAULT = false;

/** You should probably use a different stun server doing commercial stuff **/
/** Also see: https://gist.github.com/zziuni/3741933 **/
var ICE_SERVERS = [ { urls: 'stun:stun.l.google.com:19302' } ];
