const processName = "NOTIFICATION";
const PID = process.pid;

function send_msg(com = 'ONLINE', msg = PID, nm = processName) {
  process.send({
    type: 'process:msg',
    data: { name: nm, command: com, message: msg }
  });
}
send_msg();
process.on('message', (msg) => { console.log(msg) });
console.log(`START ${processName} - PID: ${PID}`);



const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');



const os = require('os');
const fs = require("fs");
const path = require('path');
const schedule = require('node-schedule');
const nodeCron = require("node-cron");

const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json'), 'utf8'));
const playlists = OPTIONS.playlists;
const adv_fix = OPTIONS.adv_fix;
const adv_interval = OPTIONS.adv_interval;

const notifications_playlists = { "PLAYLISTS": [] };
const notifications_work = { "WORK": [OPTIONS.start_app, OPTIONS.stop_app] };
const notifications_interval = { "INTERVAL": [] };
const notifications_fix = { "FIX": [] };
const NOTIFICATIONS = [notifications_work];


if (playlists.length > 1) {
  for (item of playlists) {
    if (!notifications_playlists.PLAYLISTS.includes(item.time_start)) { notifications_playlists.PLAYLISTS.push(item.time_start) }
    if (!notifications_playlists.PLAYLISTS.includes(item.time_stop)) { notifications_playlists.PLAYLISTS.push(item.time_stop) }
  }
  if (notifications_playlists.PLAYLISTS.length > 1) { NOTIFICATIONS.push(notifications_playlists) }
}

if (adv_fix.length > 0) {
  for (item of adv_fix) { notifications_fix.FIX.push(item.fix) }
  NOTIFICATIONS.push(notifications_fix);
}

if (adv_interval.length > 0) {
  for (item of adv_interval) {
    if (!notifications_interval.INTERVAL.includes(item.interval_t)) { notifications_interval.INTERVAL.push(item.interval_t) }
  }
  NOTIFICATIONS.push(notifications_interval);
}


try {
  console.log("START DELETE SCHEDULES");
  for (const jobName in schedule.scheduledJobs) {
    console.log(jobName);
    const job = schedule.scheduledJobs[jobName];
    job.cancel();
    console.log("DELETE SCHEDULES: " + jobName);
  }
} catch (error) { console.log("ERROR DELETE SCHEDULES", "error") }



const INTERVAL_LIST = [];

NOTIFICATIONS.forEach(element => {
  for (const KEY in element) {
    if (KEY == "INTERVAL") {
      for (item of element[KEY]) {
        addInterval(item);
      }
    }
    else {
      for (item of element[KEY]) { addTime(item, KEY) }
    }
  }
});

function addInterval(min) {

  const minutes = parseInt(min);
  INTERVAL_LIST.push(minutes);
  const job = nodeCron.schedule(`*/${minutes} * * * *`, function () { send_msg("CRON", minutes, "INTERVAL") }, {timezone: "Europe/Kiev"});

}

function addTime(time, name){

  const tm = time.split(':');
  for(let i = 0; i < tm.length; i++) { tm[i] = parseInt(tm[i]) }
  const cronExpression = `${tm[2]} ${tm[1]} ${tm[0]} * * *`;
  const job = nodeCron.schedule(cronExpression, function() { send_msg("CRON", time, name) }, {timezone: "Europe/Kiev"});
  console.log(tm);
}

