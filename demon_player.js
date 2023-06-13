// Description: Demon player for music
const { ipcRenderer } = require('electron');
const os = require('os');
const { exec } = require('child_process');
const pm2 = require('pm2');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const data_start = fs.readFileSync(path.join(__dirname, 'storage', 'options.json'), 'utf-8');

if (data_start.first_start == "init") {
    pm2.connect(function (err) {
        if (err) { console.error(err) }
        pm2.start({
            script: path.join(__dirname, 'socket.js'),
            name: 'SOCKET',
            exec_mode: 'fork',
            max_memory_restart: '1G',
            autorestart: true
        });
    });
} else if (data_start.first_start == "start") {



    const __PATH_MUSIC = path.join(os.homedir(), 'huinity', 'music');
    const LOG = require(path.join(__dirname, 'save_log.js'));
    const createConnectPM2Command = `node ${path.join(__dirname, 'pm2.js')}`;
    exec(createConnectPM2Command, (error, stdout, stderr) => { if (error) { throw error } });



    pm2.launchBus(function (err, message) {
        if (err) { throw err }
        message.on('manager:msg', function (packet) {

            switch (packet.data.command) {
                case 'START SONG DOWNLOAD':
                    start_song_download();
                    break;
                case 'STOP SONG DOWNLOAD':
                    stop_play();
                    break;

                case 'START WORK':
                    start_work();
                    break;

                case 'STOP WORK':
                    stop_play();
                    break;

                case 'RESTART APP':
                    ipcRenderer.send('restart');
                    break;

                default:
                    break;
            }

        });

    });

    let count = 0;

    const PLAYER_MUSIC = new Audio();
    let volume_music = 0.5;
    PLAYER_MUSIC.volume = volume_music;

    function start_song_download() {
        const __mp3 = path.join(__dirname, 'Chau Sara - Mramor.mp3');

        try {
            PLAYER_MUSIC.src = __mp3;
            PLAYER_MUSIC.play();
            PLAYER_MUSIC.addEventListener('error', (err) => { console.log(err) });
            PLAYER_MUSIC.addEventListener('ended', () => { PLAYER_MUSIC.play() });
        } catch (error) {
            console.log(error);
        }
    }

    function stop_play() {
        PLAYER_MUSIC.pause();
        PLAYER_MUSIC.currentTime = 0;
    }


    function start_work() {

        PLAYLIST = create_current_playlist();
        shuffle(PLAYLIST);
        console.log(PLAYLIST[count].full_name);

        try {
            PLAYER_MUSIC.src = path.join(__PATH_MUSIC, PLAYLIST[count].full_name);
            //устанавливаем громкость музыки на 0 и включаем
            PLAYER_MUSIC.volume = 0;
            PLAYER_MUSIC.play();
            LOG.save_log('START PLAY MUSIC:  ' + PLAYLIST[count].full_name);
            //плавно увеличиваем громкость до 0.5
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
                count++;
                if (count == PLAYLIST.length) { count = 0 }

                PLAYER_MUSIC.src = path.join(__PATH_MUSIC, PLAYLIST[count].full_name);
                PLAYER_MUSIC.play();
                LOG.save_log('START PLAY MUSIC:  ' + PLAYLIST[count].full_name);
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









    //функция создания плейлиста на текущее время
    function create_current_playlist() {
        const OPTIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'options.json')));
        const playlist_current_time = [];

        for (const obj of OPTIONS.all_music_today) {
            if (moment().format('HH:mm:ss') >= obj.time_start && moment().format('HH:mm:ss') < obj.time_stop) {
                playlist_current_time.push(obj);
            }
        }

        return playlist_current_time;
    }

    //функция перемешивания массива
    function shuffle(array) {
        array.sort(() => Math.random() - 0.5);
    }

    function data_song(filePath) {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                console.error('Ошибка чтения файла:', err);
                return;
            }
            console.log('Данные файла MP3:', data);
        });
    }
}