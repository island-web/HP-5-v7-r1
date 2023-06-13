const processName = "WORKER";

function send_msg(com = 'ONLINE', msg = null ){
    process.send({
        type : 'process:msg',
        data : { name: processName, command: com, message: msg }
    })
}

send_msg();


const moment = require('moment');
const fs = require('fs');
const path = require('path');

const schedule_work = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json')), 'utf8');



if(moment().format('HH:mm:ss') >= schedule_work.start_app && moment().format('HH:mm:ss') < schedule_work.stop_app) {
    send_msg('START WORK');
}
else{
    send_msg('STOP WORK');
}
