


const { ipcRenderer } = require('electron');
const os = require('os');
const { exec } = require('child_process');
const pm2 = require('pm2');
const path = require('path');
const fs = require('fs');

const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');
const tempus = require(path.join(__dirname, 'tempus.js'));

const data_start = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json'), 'utf-8'));
const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json'), 'utf-8'));
const LOG = require(path.join(__dirname, 'save_log.js'));
const PATH_APP = path.join(os.homedir(), 'huinity');
const PATH_MUSIC = path.join(os.homedir(), 'huinity', 'music');
const PATH_ADV = path.join(os.homedir(), 'huinity', 'adv');

const BUFFER_ADV = [];

const PLAYER_MUSIC = document.getElementById('player_music');
PLAYER_MUSIC.volume = 0.7;
const volume_music = 0.7;


let count_music = 0;
let PLAY_NOW = "null";
let player_work_now = false;
let reload_player = false;


function fade_out() {
    return new Promise((resolve, reject) => {
        const fadeInterval = setInterval(() => {
            if (PLAYER_MUSIC.volume > 0.1) {
                PLAYER_MUSIC.volume -= 0.1;
            } else {
                PLAYER_MUSIC.volume = 0;
                clearInterval(fadeInterval);
                resolve();
            }
        }, 1000);
    });
}


function fade_in() {
    PLAYER_MUSIC.play();
    const interval = setInterval(() => {
        if (PLAYER_MUSIC.volume < volume_music) { PLAYER_MUSIC.volume += 0.1 }
        else {
            PLAYER_MUSIC.volume = volume_music;
            clearInterval(interval);
        }
    }, 1000);
}


if (data_start.first_start === 'init_start') { ipcRenderer.send('show_window_init') }

pm2.connect((err) => {
    if (err) {
        LOG.save_log("!!! ERROR !!! start pm2", 'error');
        pm2.disconnect();
        return;
    }

    pm2.start({
        script: path.join(__dirname, 'router.js'),
        name: "ROUTER",
        maxRestarts: 10,
        maxMemoryRestart: '2G',
        autorestart: true,
        exec_mode: 'cluster'
    });

    pm2.launchBus((err, message) => {
        if (err) { throw err }

        message.on('proc:msg', (packet) => {
            const { command, message, name } = packet.data;
            switch (command) {
                case "START":
                    LOG.save_log(`START: ${name} (id: ${packet.process.pm_id})`);
                    break;

                case "CONNECT TO SERVER":
                    LOG.save_log(command);
                    break;

                case "WORK MSG":
                    LOG.save_log(message);
                    break;

                case "END DOWNLOAD SONGS":
                    LOG.save_log(command);
                    if (data_start.first_start === 'init_start') {
                        fs.writeFileSync(path.join(__dirname, 'storage', 'init.json'), JSON.stringify({ "first_start": "init_end" }));
                        ipcRenderer.send('close_window_init');
                    }
                    pm2.reload('ROUTER');
                    break;

                case "END DOWNLOAD ADV":
                    LOG.save_log(command);
                    if (data_start.first_start !== 'init_start') { pm2.reload('ROUTER') }
                    break;

                case "START WORK TIME":
                    LOG.save_log(command + "STATION");
                    if (data_start.first_start !== "init_start") {
                        if (player_work_now) { reload_player = true; }
                        else { start_work_player() }
                    }
                    break;

                case "STOP WORK TIME":
                    LOG.save_log("RELOAD PLAYER ---> [command: " + command + "]");
                    stop_work();
                    break;

                case "EVENT FIX":
                    PLAY_NOW = "fix";
                    LOG.save_log("PLAY FIX ADV---> [command: " + message + "]");
                    preparation_fix(message);
                    break;

                case "INTERVAL ADV":

                    LOG.save_log(command);
                    if (PLAY_NOW === "null") {
                        PLAY_NOW = "interval";
                        preparation_interval_adv(message);
                    } else {
                        for (const obj of message) { BUFFER_ADV.push(obj) }
                        LOG.save_log("INTERVAL ADV ADD IN BUFFER");
                    }

                    break;

                case "EVENT PLAYLIST":
                    LOG.save_log("RELOAD PLAYER ---> [command: " + command + "]");
                    fade_out().then(() => { window.location.reload() });
                    break;



                default:
                    break;
            }
        });
    });
});



function conflict_fix(count) {

    const end_time_interval = tempus.add_seconds(count);
    const list_fix = OPTIONS.adv_fix.filter(item => item.fix !== null);
    const current = tempus.current_time();


    for (fix of list_fix) {
        console.log("ENT_TIME_INTER VAL: " + end_time_interval + " --- START_FIX: " + fix.fix);
        if (tempus.between(current, end_time_interval, fix.fix)) {
            return fix.duration;
        }
    }

    return false;

}



function start_work_player() {
    player_work_now = true;
    PLAYLIST = create_current_playlist();

    if (PLAYLIST.length === 0) { LOG.save_log("PLAYLIST IS EMPTY", 'error'); return; }
    else {
        shuffle(PLAYLIST);

        PLAYER_MUSIC.volume = 0;
        PLAYER_MUSIC.src = path.join(PATH_MUSIC, PLAYLIST[count_music].full_name);

        try {
            PLAYER_MUSIC.play();
            fade_in();
            LOG.save_log(`START PLAY MUSIC: ${PLAYLIST[count_music].full_name}`);
        } catch (error) { LOG.save_log("ERROR PLAY SONG: " + PLAYLIST[count_music].full_name, 'error'); console.log(error) }


        PLAYER_MUSIC.addEventListener('error', function (event) {
            console.log('Ошибка воспроизведения:', event.target.error);
            LOG.save_log("ERROR PLAY SONG: " + PLAYLIST[count_music].full_name, 'error');
            PLAYLIST.splice(count_music, 1);
            LOG.save_log("DELETE SONG FROM PLAYLIST: " + PLAYLIST[count_music].full_name);
            if (PLAYLIST.length === 0) {
                LOG.save_log("PLAYLIST IS EMPTY", 'error');
                //reload();
            } else {
                count_music++;
                if (count_music === PLAYLIST.length) { count_music = 0; }
                PLAYER_MUSIC.src = path.join(PATH_MUSIC, PLAYLIST[count_music].full_name);
            }
        });


        PLAYER_MUSIC.addEventListener('ended', () => {
            if (reload_player) { window.location.reload(); return; }

            if (BUFFER_ADV.length > 0 && PLAY_NOW === "null") {
                PLAY_NOW = "interval";
                console.log(BUFFER_ADV);
                LOG.save_log("PREPARATION ADV FROM BUFFER");
                preparation_interval_adv(BUFFER_ADV);

            }

            count_music++;
            if (count_music === PLAYLIST.length) { count_music = 0 }
            shuffle(PLAYLIST);

            PLAYER_MUSIC.src = path.join(PATH_MUSIC, PLAYLIST[count_music].full_name);

            try {
                PLAYER_MUSIC.play();
                LOG.save_log(`START PLAY MUSIC: ${PLAYLIST[count_music].full_name}`);
            } catch (error) { LOG.save_log("ERROR PLAY SONG: " + PLAYLIST[count_music].full_name, 'error'); console.log(error) }

        });
    }
}

function stop_work() {

    try {
        fade_out().then(() => { window.location.reload() })
    } catch (error) { LOG.save_log("ERROR FADE FOR STOP", "error"); window.location.reload(); }

}


function preparation_fix(adv) {

    const div_for_fix = document.getElementById('fixed');
    const fixed = document.createElement('audio');


    fixed.id = adv.name_adv;
    fixed.src = path.join(PATH_ADV, adv.name_adv);
    fixed.volume = adv.volume / 100;
    fixed.preload = "true";
    div_for_fix.innerHTML = fixed;

    try {
        fade_out().then(() => { fixed.play() })
            .catch((err) => {
                console.log(err);
                LOG.save_log(`ERROR PLAY ADV: ${adv.name_adv}`, 'error');
            }).finally(() => {
                LOG.save_log('START PLAY FIXED ADV' + adv.name_adv);
            });
    } catch (error) { console.log(error) }

    fixed.addEventListener('error', function (event) { console.log("ERROR FIX ADV") });
    fixed.addEventListener('ended', () => { fixed.remove(); fade_in() });

}

function create_current_playlist() {
    const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json')));
    const playlist_current_time = [];

    for (const obj of OPTIONS.all_music_today) {
        if (moment().format('HH:mm:ss') >= obj.time_start && moment().format('HH:mm:ss') < obj.time_stop) {
            playlist_current_time.push(obj);
        }
    }
    OPTIONS.length = 0;
    return playlist_current_time;
}

function reload() {
    LOG.save_log('RELOAD PLAYLISTS');
    const interval = setInterval(() => {
        if (PLAYER_MUSIC.volume >= 0.1) { PLAYER_MUSIC.volume -= 0.1 }
        else {
            PLAYER_MUSIC.volume = 0;
            PLAYER_MUSIC.pause();
            PLAYER_MUSIC.src = '';
            clearInterval(interval);
            window.location.reload();
        }
    }, 1000);
}


function play_int(player, name) {
    try {
        fade_out().then(() => { player.play() })
            .catch((err) => {
                LOG.save_log(`ERROR PLAY ADV: ${name}`, 'error');
            }).finally(() => { LOG.save_log(`START PLAY ADV: ${name}`) });
    } catch (error) { LOG.save_log(`ERROR PLAY ADV: ${name}`, 'error') }
}

function play_interval_settings(arr) {

    let count_adv = 0;
    let PLAYER_INTERVAL = document.getElementById(arr[count_adv].name_adv);
    play_int(PLAYER_INTERVAL, arr[count_adv].name_adv);

    PLAYER_INTERVAL.addEventListener("playing", (event) => { console.log('play' + arr[count_adv].name_adv) });

    PLAYER_INTERVAL.addEventListener('ended', (event) => {

        count_adv++;
        if (count_adv < arr.length) {
            try { PLAYER_INTERVAL.pause() } catch (error) { console.log(error) }
            finally { PLAYER_INTERVAL = null; }
            PLAYER_INTERVAL = document.getElementById(arr[count_adv].name_adv);
            play_int(PLAYER_INTERVAL, arr[count_adv].name_adv);
        } else {
            try {
                PLAYER_INTERVAL.pause();
                count_adv = 0;
                PLAYER_INTERVAL = null;
                fade_in();

                const divInterval = document.getElementById('interval_div');
                while (divInterval.firstChild) {
                    divInterval.removeChild(divInterval.firstChild);
                }

            } catch (error) { console.log(error) }
            finally {
                PLAY_NOW = "null";
                return;
            }
        }
    });
}

function preparation_interval_adv(arr) {


    let count_duration = 0;
    const div_interval = document.getElementById('interval_div');


    for (const item of arr) {
        count_duration += item.duration;
        const player = document.createElement('audio');
        player.src = path.join(PATH_APP, 'adv', item.name_adv);
        player.volume = item.volume / 100;
        player.id = item.name_adv;
        player.className = item.id_adv;
        player.preload = 'auto';
        player.addEventListener('error', (err) => { LOG.save_log(`ERROR PLAY ADV: ${item.name_adv}`, 'error') });
        div_interval.appendChild(player);
    }


    let interval_waite_play_adv = setTimeout(() => {

        const conflict = conflict_fix(count_duration);
        if(!conflict) { play_interval_settings(arr) }
        else {
            setTimeout(() => {
                play_interval_settings(arr);
                clearTimeout(interval_waite_play_adv);
            }, conflict * 1000 + count_duration * 1000);
        }
        
    }, count_duration * 1000)


}

// Функция перемешивания массива
function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}
