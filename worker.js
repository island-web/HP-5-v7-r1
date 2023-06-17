const processName = "WORKER";

function send_msg(com = 'ONLINE', msg = null ){
    process.send({
        type : 'process:msg',
        data : { name: processName, command: com, message: msg }
    })
}
send_msg();



const fs = require('fs');
const path = require('path');

const tempus = require(path.join(__dirname, 'tempus.js'));
const schedule_work = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json')), 'utf8');




if(tempus.between(schedule_work.start_app, schedule_work.stop_app)) {
    send_msg('START WORK');
    console.log("START WORK STATION");
}
else{
    send_msg('STOP WORK');
    console.log("STOP WORK STATION");
}





process.on('message', (msg) => { console.log(msg) });