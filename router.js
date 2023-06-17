const processName = 'ROUTER';


function send_manager_msg(com = 'ONLINE', msg = "null") { process.send({ type: 'proc:msg', data: { name: processName, command: com, message: msg } }) }
send_manager_msg("START");
process.on('message:msg', (msg) => { console.log(msg) });


const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pm2 = require('pm2');
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');


const PATH_APP = path.join(os.homedir(), 'huinity');
const LOG = require(path.join(__dirname, 'save_log.js'));
const STATE = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json')));
const PROCESSES_LIST = [];

const demon_worker = `node ${path.join(__dirname, 'demon_worker.js')}`;
const demon_socket = `node ${path.join(__dirname, 'demon_socket.js')}`;
const demon_download_songs = `node ${path.join(__dirname, 'demon_download_songs.js')}`;
const demon_download_adv = `node ${path.join(__dirname, 'demon_download_adv.js')}`;
const demon_schedule = `node ${path.join(__dirname, 'demon_schedule.js')}`;
const demon_notification = `node ${path.join(__dirname, 'demon_notification.js')}`;

const tempus = require(path.join(__dirname, 'tempus.js'));
const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json')), 'utf8');


send_manager_msg("CONNECT TO SERVER");
console.log("CONNECT TO SERVER");
pm2.connect(function (err) {
    if (err) { send_manager_msg("ERROR CONNECT TO PM2"); console.log(err) }

    try { exec(demon_socket) }
    catch (error) { send_manager_msg("ERROR START DEMON SOCKET"); console.log(error) }

    pm2.launchBus(function (err, message) {
        if (err) { console.log(err) }

        message.on('process:msg', function (packet) {

            if (PROCESSES_LIST.length !== 0) {
                for (let i = 0; i < PROCESSES_LIST.length; i++) {
                    if (PROCESSES_LIST[i].pm_id === packet.process.pm_id) {
                        PROCESSES_LIST.splice(i, 1);
                        break;
                    }
                }
            }
            PROCESSES_LIST.push({ "pm_id": packet.process.pm_id, "name": packet.data.name, "time": moment().format("HH:mm:ss") });
            fs.writeFileSync(path.join(PATH_APP, 'pm2', 'processes_list.json'), JSON.stringify(PROCESSES_LIST));
            handling(packet);
        })
    })
});


function handling(msg) {

    switch (msg.data.command) {

        case "CONFIG OK":
            console.log(msg.data.command);
            send_manager_msg("WORK MSG", msg.data.command);
            try { exec(demon_download_songs) } catch (error) { send_manager_msg("ERROR START DOWNLOAD SONGS"); console.log(error) }
            try { exec(demon_download_adv) } catch (error) { send_manager_msg("ERROR START DOWNLOAD ADV"); console.log(error) }
            try { exec(demon_schedule) } catch (error) { send_manager_msg("ERROR START SCHEDULE"); console.log(error) }

            break;

        case "ERROR CONNECT":
            send_manager_msg("WORK MSG", "STATION WORK OFFLINE. NO CONNECT WITH SERVER");
            try { exec(demon_schedule) } catch (error) { send_manager_msg("ERROR START SCHEDULE"); console.log(error) }
            break;


        case "SCHEDULE UPADATE: SUCCESSFUL":
            if (STATE.first_start !== "init_start") {
                try { exec(demon_notification) } catch (error) { send_manager_msg("ERROR START SCHEDULE"); console.log(error) }
                console.log(msg.data.command);
                send_manager_msg("WORK MSG", msg.data.command);
                try { exec(demon_worker) } catch (error) { send_manager_msg("ERROR START WORKER"); console.log(error) }
            }

            break;

        case "END DOWNLOAD":
            console.log(msg.data.command);
            send_manager_msg("END " + msg.data.name, msg.data.command);
            break;

        case "ERROR DOWNLOAD SONGS 8":
            send_manager_msg("WORK MSG", msg.data.command);
            pm2.restart(msg.process.pm_id);
            break;

        case "START WORK":
            console.log("start_work")
            send_manager_msg("START WORK TIME");
            break;

        case "STOP WORK":
            send_manager_msg("STOP WORK TIME");
            break;

        case "CRON":
            console.log(msg.data.command);
            work_notification(msg.data.name, msg.data.message);
            break;

        case "LOG":
            LOG.save_log(msg.data.message);
            console.log(msg.data.message);
            break;

        case "ERROR":
            LOG.save_log(msg.data.message, "error");
            break;


        default:
            break;
    }

}



function work_notification(type, param) {


    if (type === "INTERVAL") {
        const currentTime = moment(new Date()).format("HH:mm:ss");
        const adv_interval = [];
        for (item of OPTIONS.adv_interval) {
            if (parseInt(item.interval_t) === parseInt(param)) {
                if (currentTime >= item.time_start && currentTime <= item.time_stop) {
                    adv_interval.push(item);
                    console.log("[ " + currentTime + " ] - " + param + ' |=> ' + item.name_adv);
                }
            }
        }
        if(tempus.between(OPTIONS.start_app, OPTIONS.stop_app)){
            if (adv_interval.length > 0) { send_manager_msg("INTERVAL ADV", adv_interval); adv_interval.length = 0 }
        }
    }

    else if (type === "FIX") { if(tempus.between(OPTIONS.start_app, OPTIONS.stop_app)){ send_manager_msg("EVENT FIX") }}

    else if (type === "PLAYLISTS") { send_manager_msg("EVENT PLAYLIST"); console.log("RELOAD STATION. UPDATE PROGRAM DEY FOR" + type) }
    else if (type === "WORK") { send_manager_msg("WORK MSG", "EVENT WORK TIME"); pm2.reload("WORKER") }



}

