const processName = "NOTIFICATION";
const PID = process.pid;

function send_msg(com = 'ONLINE', msg = PID) {
  process.send({
    type: 'process:msg',
    data: { name: processName, command: com, message: msg }
  });
}
send_msg();
process.on('message', (msg) => { console.log(msg) });
console.log(`START ${processName} - PID: ${PID}`);



const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');

const my_time_hm = (time) => {
  const currentTime = moment();
  currentTime.hour = time.split(':')[0];
  currentTime.minute = time.split(':')[1];
  return currentTime.format('HH:mm');
}


const os = require('os');
const fs = require("fs");
const path = require('path');
const cron = require('node-cron');

const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json'), 'utf8'));
const playlists = OPTIONS.playlists;
const adv_fix = OPTIONS.adv_fix;
const adv_interval = OPTIONS.adv_interval;

const notifications_playlists = { "playlists": [] };
const notifications_work = { "work": [OPTIONS.start_app, OPTIONS.stop_app] };
const notifications_interval = { "interval": [] };
const notifications_fix = { "fix": [] };
const NOTIFICATIONS = [notifications_work];


if (playlists.length > 1) {
  for (item of playlists) {
    if (!notifications_playlists.playlists.includes(item.time_start)) { notifications_playlists.playlists.push(item.time_start) }
    if (!notifications_playlists.playlists.includes(item.time_stop)) { notifications_playlists.playlists.push(item.time_stop) }
  }
  if (notifications_playlists.playlists.length > 1) { NOTIFICATIONS.push(notifications_playlists) }
}

if (adv_fix.length > 0) {
  for (item of adv_fix) { notifications_fix.fix.push(item.fix) }
  NOTIFICATIONS.push(notifications_fix);
}

if (adv_interval.length > 0) {
  for (item of adv_interval) {
    if (!notifications_interval.interval.includes(item.interval_t)) { notifications_interval.interval.push(item.interval_t) }
  }
  NOTIFICATIONS.push(notifications_interval);
}

const TODAY_CRON = {};

NOTIFICATIONS.forEach(element => {
  const KEY = Object.keys(element)[0];
  if (KEY === "interval") {
    TODAY_CRON[KEY] = [];
    element[KEY].forEach(item => {
      const temp = cron.schedule(`*/${item} * * * *`, () => {
        send_msg('START INTERVAL', item);
      },{ timezone: 'Europe/Kiev' });
      TODAY_CRON[KEY].push(temp);
    });
  }
  else {
    TODAY_CRON[KEY] = [];
    element[KEY].forEach(item => {
      const time = item.split(':');
      console.log(`${time[2]} ${time[1]} ${time[0]} * * *`);
      const temp = cron.schedule(`${time[2]} ${time[1]} ${time[0]} * * *`, () => {
        send_msg('CRON', KEY + '@' + item);
      },{ timezone: 'Europe/Kiev' });
      TODAY_CRON[KEY].push(temp);
    });
  }
});

NOTIFICATIONS.length = 0;
notifications_fix.fix.length = 0;
notifications_interval.interval.length = 0;
notifications_playlists.playlists.length = 0;
