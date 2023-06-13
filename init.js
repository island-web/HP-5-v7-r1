const { ipcRenderer } = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const PLAYER_MUSIC = new Audio();
const init_start = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json'), 'utf8'));
if (init_start.first_start === 'init_start') {
   
    let volume_music = 0.5;
    PLAYER_MUSIC.volume = volume_music;

    document.getElementById('info_init').innerHTML += `<p id='status_folder'></p>`;
    insertText(`create app folder: successful (path: ${os.homedir()}/huinity/)`, "status_folder");
    document.getElementById('info_init').innerHTML += "<p id='install'></p>";
    insertText("install dependencies: successful", "install");
    document.getElementById('info_init').innerHTML += "<p id='config'></p>";
    insertText("get config: successful", "config");



    setTimeout(() => {
        start_song_download();
        document.getElementById('head').innerHTML = `<p id='head'></p>`;
        insertText(`START DOWNLOAD CONTET`, "head");

        document.getElementById('info_init').innerHTML = "<p id='totenkopf' style='text-align:center;'>&#9760&nbsp</p>";

        document.getElementById('info_init').innerHTML += "<p id='adv' style='margin-top:4px;'>download adv: <span id='count_adv'> [__] </span><span id='all_adv'> / [__]</span></p>";

        document.getElementById('info_init').innerHTML += "<p id='songs'>download songs: <span id='count_songs'> [__] </span><span id='all_songs'> / [__]</span></p>";

        const init = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json'), 'utf8'));
        document.getElementById('all_adv').innerHTML = `[ ${init.all_adv_download} ]`;
        document.getElementById('all_songs').innerHTML = `[ ${init.all_songs_download} ]`;

        totenkopf();

        setInterval(() => { progress_download() }, 5000);

    }, 15000);
}else{
    process.exit(0);
}


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

function totenkopf() {
    const totenkopf_count = 13;
    let i = 0;
    const interval = setInterval(() => {

        if (i < totenkopf_count) {
            document.getElementById('totenkopf').innerHTML += "&#9760&nbsp";
            i++;
        } else {
            document.getElementById('totenkopf').innerHTML = "&#9760&nbsp";
            i = 0;
        }

    }, 500);
}

function insertText(text, id) {

    const length_text = text.length;
    let i = 0;

    const interval = setInterval(() => {
        if (i < length_text) {
            document.getElementById(id).innerHTML += text[i];
            i++;
        } else {
            clearInterval(interval);
        }
    }, 80);

}

function sound_init() {
    let element = document.getElementById('volume-btn');
    console.log(element.classList);
}

function minimize() {
    ipcRenderer.send('minimize_window_init');
}

function progress_download() {

    document.getElementById('count_adv').innerHTML = '[ ' + fs.readdirSync(path.join(os.homedir(), 'huinity', 'adv')).length + ' ] / ';
    document.getElementById('count_songs').innerHTML = '[ ' + fs.readdirSync(path.join(os.homedir(), 'huinity', 'music')).length + ' ] / ';

}