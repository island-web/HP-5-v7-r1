


const { ipcRenderer } = require('electron');
const os = require('os');
const { exec } = require('child_process');
const pm2 = require('pm2');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');

const data_start = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json'), 'utf-8'));
const LOG = require(path.join(__dirname, 'save_log.js'));
const PATH_APP = path.join(os.homedir(), 'huinity');
const PATH_MUSIC = path.join(os.homedir(), 'huinity', 'music');


let count = 0;
let count_block = 0;
let PLAY_NOW = "null";
const BUFFER_ADV = [];
let PLAY_LIST_INTERVAL = [];


if (data_start.first_start === 'init_start') {
    ipcRenderer.send('show_window_init');
}

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
        //instances: 1,
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

                case "RELOAD APP":
                    LOG.save_log(message, 'error');
                    LOG.save_log("RELOAD APP");
                    window.location.reload();
                    break;

                case "START WORK":
                    LOG.save_log(command);
                    if (data_start.first_start !== 'init_start') {
                        start_work();
                    }
                    break;

                case "STOP WORK":
                    LOG.save_log(command);
                    reload();
                    break;

                case "FIX":
                    LOG.save_log(command);
                    start_fix(message);
                    break;

                case "RELOAD PLAYLISTS":
                    LOG.save_log(command);
                    reload();
                    break;

                case "START INTERVAL ADV":
                    LOG.save_log(command);
                    if (PLAY_NOW === "null") {
                        PLAY_NOW = "interval";
                        preparation_interval_adv(message);
                    } else {
                        BUFFER_ADV.push(message);
                        LOG.save_log("INTERVAL ADV ADD IN BUFFER");
                    }

                    break;

                default:
                    break;
            }
        });
    });
});

const PLAYER_MUSIC = new Audio();
let volume_music = 0.6;
PLAYER_MUSIC.volume = volume_music;

const PLAYER_FIX = new Audio();
let volume_fix = 0.7;
PLAYER_FIX.volume = volume_fix;

const PLAYER_INTERVAL = new Audio();
let volume_interval = 0.7;
PLAYER_INTERVAL.volume = volume_interval;

function conflict_fix(arr) {
    console.log('conflict_fix');
    return false;
}

function fade_out(audioElement) {
    return new Promise((resolve, reject) => {
        const fadeInterval = setInterval(() => {
            if (audioElement.volume > 0.1) {
                audioElement.volume -= 0.1;
            } else {
                audioElement.volume = 0;
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
            PLAY_NOW = "null";
            clearInterval(interval);
        }
    }, 1000);
}


function start_work() {
    PLAYLIST = create_current_playlist();
    shuffle(PLAYLIST);
    console.log(PLAYLIST[count].full_name);

    try {
        PLAYER_MUSIC.src = path.join(PATH_MUSIC, PLAYLIST[count].full_name);
        PLAYER_MUSIC.volume = 0;
        PLAYER_MUSIC.play();
        LOG.save_log(`START PLAY MUSIC: ${PLAYLIST[count].full_name}`);

        const interval = setInterval(() => {
            if (PLAYER_MUSIC.volume < volume_music) {
                PLAYER_MUSIC.volume += 0.1;
            } else {
                PLAYER_MUSIC.volume = volume_music;
                clearInterval(interval);
            }
        }, 1000);

        PLAYER_MUSIC.addEventListener('error', (err) => { console.log(err) });

        PLAYER_MUSIC.addEventListener('ended', () => {
            if (BUFFER_ADV.length > 0 && PLAY_NOW === "null") {
                console.log("BUFFER: " + BUFFER_ADV.length);
            }


            count++;
            if (count === PLAYLIST.length) {
                count = 0;
            }

            PLAYER_MUSIC.src = path.join(PATH_MUSIC, PLAYLIST[count].full_name);
            PLAYER_MUSIC.play();
            LOG.save_log(`START PLAY MUSIC: ${PLAYLIST[count].full_name}`);

            const interval = setInterval(() => {
                if (PLAYER_MUSIC.volume < volume_music) {
                    PLAYER_MUSIC.volume += 0.1;
                } else {
                    PLAYER_MUSIC.volume = volume_music;
                    clearInterval(interval);
                }
            }, 1000);
        });
    } catch (error) {
        throw error;
    }
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

function play_interval_start() {

    function first_play() {
        const Adv = PLAY_LIST_INTERVAL[count_block];
        const path_adv_mp3 = path.join(os.homedir(), 'huinity', 'adv', Adv.name_adv);
        PLAYER_INTERVAL.src = path_adv_mp3;
        PLAYER_INTERVAL.volume = Adv.volume / 100;
        PLAYER_INTERVAL.play();
        LOG.save_log(`PLAY ADV: ${Adv.name_adv}`);
    }

    try {
        fade_out(PLAYER_MUSIC).then(() => {
            first_play();
        }).catch((err) => {
            console.log(err);
        }).finally(() => {
            console.log('start play interval');
        });
    } catch (error) {
        console.log(error);
    }

    function handleError(err) {
        console.log(err);
        try { PLAY_NOW = "null"; PLAYER_INTERVAL.pause(); PLAYER_INTERVAL.src = "" }
        catch (error) { console.log(error) }

        if (count_block + 1 >= PLAY_LIST_INTERVAL.length) { resetAndFadeIn() }
        else { count_block++; playNextAdv() }
    }

    function resetAndFadeIn() {
        count_block = 0;
        PLAY_LIST_INTERVAL.length = 0;
        PLAY_NOW = "null";
        fade_in();
    }

    function playNextAdv() {
        const nextAdv = PLAY_LIST_INTERVAL[count_block];
        const path_adv_mp3 = path.join(os.homedir(), 'huinity', 'adv', nextAdv.name_adv);

        PLAYER_INTERVAL.pause(); // Приостанавливаем воспроизведение текущего трека (если есть)
        PLAYER_INTERVAL.currentTime = 0; // Сбрасываем позицию воспроизведения



        PLAYER_INTERVAL.on('pause', () => {

            PLAYER_INTERVAL.src = path_adv_mp3;
            PLAYER_INTERVAL.volume = nextAdv.volume / 100;

            const playPromise = PLAYER_INTERVAL.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Успешно начато воспроизведение
                    LOG.save_log(`PLAY ADV: ${nextAdv.name_adv}`);
                }).catch(error => {
                    // Обработка ошибки воспроизведения
                    console.error('Failed to start playback:', error);
                });
            }

        });

    }



    PLAYER_INTERVAL.addEventListener('error', handleError);

    PLAYER_INTERVAL.addEventListener('ended', () => {
        count_block++;
        if (count_block < PLAY_LIST_INTERVAL.length) { playNextAdv() }
        else { resetAndFadeIn() }
    });
}

function preparation_interval_adv(arr) {

    if (!conflict_fix(arr)) {
        count_block = 0;
        let all_duration = 0;
        for (const obj of arr) { all_duration += obj.duration; PLAY_LIST_INTERVAL.push(obj); console.log(obj.name_adv) }
        setTimeout(() => { play_interval_start() }, all_duration * 1000);
        arr.length = 0;

    } else {
        LOG.save_log("ADD ADV TO BUFFER FOR WAITING");
        BUFFER_ADV.push(message);
        PLAY_NOW = "null";
    }

}

// Функция перемешивания массива
function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}
