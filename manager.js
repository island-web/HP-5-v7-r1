


const { ipcRenderer } = require('electron');
const os = require('os');
const { exec } = require('child_process');
const pm2 = require('pm2');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');

const data_start = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json'), 'utf-8'));
const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json'), 'utf-8'));
const LOG = require(path.join(__dirname, 'save_log.js'));
const PATH_APP = path.join(os.homedir(), 'huinity');
const PATH_MUSIC = path.join(os.homedir(), 'huinity', 'music');

const BUFFER_ADV = [];

const PLAYER_MUSIC = document.getElementById('player_music');
PLAYER_MUSIC.volume = 0.7;
const volume_music = 0.7;

const PLAYER_FIX = document.getElementById('player_fix');
const volume_fix = 0.8;
PLAYER_FIX.volume = volume_fix;




let count_music = 0;
let PLAY_NOW = "null";
let WORK_NOW = "false";


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
        if (err) {
            throw err;
        }

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
                        pm2.restart('SCHEDULE');
                    }
                    break;

                case "END DOWNLOAD ADV":
                    LOG.save_log(command);
                    break;

                case "START WORK TIME":
                    LOG.save_log(command + "STATION");
                    if (data_start.first_start !== "init_start") {
                        start_work();
                    }
                    break;

                case "STOP WORK TIME":
                    LOG.save_log("RELOAD PLAYER ---> [command: " + command + "]");
                    fade_out();
                    stop_work();
                    break;

                case "EVENT FIX":
                    if (WORK_NOW === "true") {
                        LOG.save_log("PLAY FIX ADV---> [command: " + message + "]");
                        start_fix(message);
                    }
                    break;

                case "INTERVAL ADV":
                    if (WORK_NOW === "true") {
                        LOG.save_log(command);
                        if (PLAY_NOW === "null") {
                            PLAY_NOW = "interval";
                            preparation_interval_adv(message);
                        } else {
                            for (const obj of message) { BUFFER_ADV.push(obj) }
                            LOG.save_log("INTERVAL ADV ADD IN BUFFER");
                        }
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



function conflict_fix(arr) {
    console.log('conflict_fix');
    return false;
}



function start_work() {
    WORK_NOW = "true";
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
            /*  if (UPDATE_PROGRAM === "true") {
                 pm2.reload("ROUTER");
                 window.location.reload();
             } */

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
        PLAYER_MUSIC.pause();
        PLAYER_MUSIC.currentTime = 0;
        PATH_MUSIC.src = '';
    } catch (error) { LOG.save_log("ERROR STOP WORK STATION") }

}

function start_fix(adv) {

    const path_adv = path.join(PATH_APP, 'adv', adv.name_adv);
    PLAYER_FIX.src = path_adv;
    PLAY_NOW = "fix";
    PLAYER_FIX.volume = adv.volume / 100;


    try {
        fade_out(PLAYER_MUSIC).then(() => {
            PLAYER_FIX.play();
        }).catch((err) => {
            console.log(err);
        }).finally(() => {
            console.log('start play' + adv.name_adv);
        });
    } catch (error) {
        console.log(error);
    }

    PLAYER_FIX.addEventListener('error', (err) => {
        console.log(err);
        LOG.save_log(`ERROR PLAY ADV: ${adv.name} (${err})`, 'error');
        try { PLAYER_FIX.pause(); PLAYER_FIX.currentTime = 0; }
        catch (error) { console.log(error) }
        PLAY_NOW = "null";
        fade_in();
    });

    PLAYER_FIX.addEventListener('ended', () => {
        PLAYER_FIX.pause();
        PLAYER_FIX.currentTime = 0;
        PLAY_NOW = "null";
        fade_in();
    });
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

    /*     let PLAYER_INTERVAL = document.getElementById('player_interval');
        let count_block = 0;
        let volume_interval = 0.8;
        
    
        const adv = PLAY_LIST_INTERVAL[count_block];
        let path_adv_mp3 = path.join(PATH_APP, 'adv', adv.name_adv);
        PLAYER_INTERVAL.src = path_adv_mp3;
        PLAYER_INTERVAL.volume = adv.volume / 100;
            
        try {
            fade_out(PLAYER_MUSIC).then(() => { PLAYER_INTERVAL.play();
            }).catch((err) => { LOG.save_log(`ERROR PLAY ADV: ${adv.name_adv} (${err})`, 'error');
            }).finally(() => { LOG.save_log(`START PLAY ADV: ${adv.name_adv}`) });
        } catch (error) { LOG.save_log(`ERROR PLAY ADV: ${adv.name_adv} (${error})`, 'error') }
    
        function handleError(err) {
            LOG.save_log(`ERROR PLAY ADV: ${adv.name_adv}`, 'error');
            console.log(err);
        }
    
        function resetAndFadeIn() {
            console.log("PLAYER MUSIC volume: " + PLAYER_MUSIC.volume);
            count_block = 0;
            PLAY_LIST_INTERVAL.length = 0;
            PLAY_NOW = "null";
            try { PLAYER_INTERVAL.pause() } catch (error) { LOG.save_log(`ERROR PAUSE ADV: ${adv.name_adv}`, 'error') }
            fade_in();
        }
    
        function playNextAdv() {
    
            count_block++;
            const nextAdv = PLAY_LIST_INTERVAL[count_block];
            const path_adv_mp3 = path.join(os.homedir(), 'huinity', 'adv', nextAdv.name_adv);
    
            try{
                PLAYER_INTERVAL = document.getElementById('player_interval');
                PLAYER_INTERVAL.src = path_adv_mp3;
                PLAYER_INTERVAL.volume = nextAdv.volume / 100;
                PLAYER_INTERVAL.play();
                LOG.save_log(`START PLAY ADV: ${nextAdv.name_adv}`)
            }catch (error) { LOG.save_log(`ERROR PLAY ADV: ${nextAdv.name_adv} (${error})`, 'error'); handleError }
    
        }
    
    
    
        PLAYER_INTERVAL.addEventListener('error', handleError);
    
        PLAYER_INTERVAL.addEventListener('ended', (event) => {
            if (count_block + 1 < PLAY_LIST_INTERVAL.length) { playNextAdv() }
            else { resetAndFadeIn() }
        }); 
     */
}

function preparation_interval_adv(arr) {

    console.log(arr);
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

    setTimeout(() => { play_interval_settings(arr) }, count_duration * 1000);

}

// Функция перемешивания массива
function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}
