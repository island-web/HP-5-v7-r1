


const processName = "DOWNLOAD SONGS";

const path = require('path');
const fs = require('fs');
const os = require('os');
const Downloader = require("nodejs-file-downloader");


const MY_HOST = 'https://infiniti-pro.com/';
const PATH_CONFIG_FILE = path.join(os.homedir(), 'huinity', 'configs', 'station_settings.json');
const PATH_MUSIC = path.join(os.homedir(), 'huinity', 'music');
const DATA_CLIENT = JSON.parse(fs.readFileSync(path.join(PATH_CONFIG_FILE)));
const ALL_MUSIC = concatMusic();
const SONGS = check_music(ALL_MUSIC);


let count_songs_download = 0;
let count_error = 0;

function send_msg(com = 'ONLINE', msg = null ){ process.send({ type : 'process:msg', data : { name: processName, command: com, message: msg }})}
send_msg();

function concatMusic() {
    let arr = [];
    for (key of Object.keys(DATA_CLIENT.all_music)) {
        for (obj of Object.keys(DATA_CLIENT.all_music[key])) { arr.push(DATA_CLIENT.all_music[key][obj]) }
    } 
    send_msg('WORKER', 'COUNT MUSIC FROM ALL ALBOUMS: ' + arr.length);
    return arr; 
}

function check_music(all_music) {
    let arr = [];
    for (key of Object.keys(all_music)) {
        if (!fs.existsSync(path.join(PATH_MUSIC, all_music[key].artist + '-' + all_music[key].name_song + '.mp3'))) {
            arr.push(all_music[key].artist + '-' + all_music[key].name_song + '.mp3')
        }
    }
    send_msg('WORKER', 'ALL COUNT MUSIC FOR DOWNLOAD: ' + arr.length);
    return arr;
}


if (SONGS.length > 0) {
    download();
    const init = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json')));
    init['all_songs_download'] = SONGS.length;
    fs.writeFileSync(path.join(__dirname, 'storage', 'init.json'), JSON.stringify(init))
}
else { send_msg('NO CONTENT DOWNLOAD') }


function download() {
    (async () => {
        const path_file = path.join(MY_HOST, 'music', SONGS[count_songs_download]);
        const downloader = new Downloader({ url: path_file, directory: PATH_MUSIC });
        send_msg('WORKER', 'START DOWNLOAD:' + SONGS[count_songs_download]);

        try {
            const { filePath, downloadStatus } = await downloader.download();
            count_songs_download++;
            if (count_songs_download < SONGS.length) { download() }
            else { send_msg('END DOWNLOAD') }
        } catch (error) { 
            count_error++;
            if(count_error < 8){ download() }
            else{ send_msg('ERROR DOWNLOAD SONGS 8') }
        }

    })()
}