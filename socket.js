const io = require('socket.io-client');
const path = require('path');
const fs = require('fs');
const host = 'http://web-island.space';
const port = 1204;

const EXPORTS = require(path.join(__dirname, 'exports.js'));
const LOG = require(path.join(__dirname, 'save_log.js'));
const PASSPORT = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'passport.json')));
const DATA_SEND = { passport: PASSPORT, system_information: 'null' };
const SOCKET = io(`${host}:${port}`, { auth: { room: PASSPORT.network, data: DATA_SEND } });



const processName = "SOCKET";
function send_msg(com = 'ONLINE', msg = null ){
  process.send({ type : 'process:msg', data : { name: processName, command: com, message: msg } })
}
send_msg();


SOCKET.on("connect", () => { LOG.save_log("SOCKET CONNECT TO SERVER", "worker") });
SOCKET.on("connect_error", (error) => { LOG.save_log("SOCKET CONNECT ERROR TO SERVER", "error") });
SOCKET.on('config', conf => { 
  LOG.save_log("GET CONFIG STATION", 'work');
  EXPORTS.set_config(conf);
  send_msg("CONFIG", conf);
});





