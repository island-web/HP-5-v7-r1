


const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pm2 = require('pm2');
const moment = require('moment');

const processName = 'MANAGER';
const PATH_APP = path.join(os.homedir(), 'huinity');
const LOG = require(path.join(__dirname, 'save_log.js'));
const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, 'init.json')));
const PROCESSES_LIST = [];



const demon_socket = `node ${path.join(__dirname, 'demon_socket.js')}`;
const demon_worker = `node ${path.join(__dirname, 'demon_worker.js')}`;
const demon_download_songs = `node ${path.join(__dirname, 'demon_download_songs.js')}`;
const demon_download_adv = `node ${path.join(__dirname, 'demon_download_adv.js')}`;
const demon_schedule = `node ${path.join(__dirname, 'demon_schedule.js')}`;

LOG.save_log("START - " + processName);
LOG.save_log("TRY CONNECT TO 'SERVER'...");



try { exec(demon_socket) }
catch (error) { LOG.save_log("CONNECT TO 'SERVER' ERROR" + error, 'error'); process.exit(1) }
finally { 
    pm2.launchBus(function (err, message) {
        if (err) { console.log(err) } 

        message.on('process:msg', function (packet) {
            
            if(PROCESSES_LIST.length !== 0){
                for(let i = 0; i < PROCESSES_LIST.length; i++){
                    if(PROCESSES_LIST[i].pm_id === packet.process.pm_id){
                        PROCESSES_LIST.splice(i, 1);
                        break;
                    }
                }
            }
            PROCESSES_LIST.push({"pm_id":packet.process.pm_id, "name":packet.data.name, "time":moment().format("HH:mm:ss")});
            fs.writeFileSync(path.join(PATH_APP, 'pm2', 'processes_list.json'), JSON.stringify(PROCESSES_LIST));
            handling(packet);
        })
    })
}


function handling(msg) {

    switch (msg.data.command) {

        case "CONFIG":
            try { exec(demon_schedule) } catch (error) { console.log(error) }
        case "SCHEDULE UPDATE":
            try { 
                exec(demon_download_songs);
                exec(demon_download_adv);
                if (STATE.first === "true") {
                    process.send({ type : 'manager:msg', data : { name: processName, command: "START SONG DOWNLOAD", message: "START DOWNLOAD FIRST" }})
                }else { process.send({ type : 'manager:msg', data : { name: processName, command: "START WORK", message: null }})
            }
            } catch (error) { console.log(error) }
            break;

        case "ONLINE":
            LOG.save_log(msg.data.name + ' - ' + msg.data.command);
            console.log(msg.data.name + ' - ' + msg.data.command);
            break;

        case "END_DOWNLOAD":
            LOG.save_log(`END ${msg.data.name}`);
            try {
                
                if (STATE.first === "true" && msg.data.name === "DOWNLOAD SONGS") {
                    STATE.first = "false";
                    fs.writeFileSync(path.join(__dirname, 'init.json'), JSON.stringify(STATE), "utf-8");
                    process.send({ type : 'manager:msg', data : { name: processName, command: "STOP SONG DOWNLOAD", message: null }});
                    exec('pm2 restart MANAGER');
                }
                
            } catch (error) { console.log(error) }
            break;

        case "ERROR":
            LOG.save_log(`ERROR PROCESS: ( ${msg.data.name} ) - ( ${msg.data.message}`);
            try { exec(`pm2 restart ${msg.process.pm_id}`) } catch (error) { console.log(error) }
            LOG.save_log(`RESTAR PROCESS: ${msg.data.name}`);
            console.log(`ERROR PROCESS: ${msg.data.name}`)
            break;

        case "START WORK":
            console.log("START WORK STATION COMMAND");
            LOG.save_log('TRY START WORK STATION');
            if (STATE.first !== "true") {
                process.send({ type : 'manager:msg', data : { name: processName, command: msg.data.command, message: "START WORK" }})
            }
            break;

        case "STOP WORK":
            console.log("STOP WORK STATION COMMAND");
            LOG.save_log('STOP WORK STATION');
            if (STATE.first !== "true") {
                process.send({ type : 'manager:msg', data : { name: processName, command: msg.data.command, message: "STOP WORK" }})
            }
            break;

        case "WORKER READY START":
            process.send({ type : 'manager:msg', data : { name: processName, command: "START WORK", message: msg.data.message }})
            LOG.save_log('SEND PLAYER CURRENT PLAYLIST');
            break;

        case "WORKER READY STOP":
            console.log("WORKER READY STOP");
                break;
        default:
            break;
    }

}