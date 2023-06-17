// Description: Скрипт для планирования работы приложения
const processName = "SCHEDULE DAY";
const PID = process.pid;

function send_msg(com = 'ONLINE', msg = PID) {
  process.send({
    type: 'process:msg',
    data: { name: processName, command: com, message: msg }
  });
}
send_msg();
process.on('message', (msg) => { console.log(msg) });

const moment = require('moment');
const os = require('os');
const fs = require("fs");
const path = require('path');

const MY_DATE = (val) => moment(new Date(val)).format('YYYY-MM-DD');



const PATH_CONFIG_FILE = path.join(os.homedir(), 'huinity', 'configs', 'station_settings.json');
const DATA_CLIENT = JSON.parse(fs.readFileSync(PATH_CONFIG_FILE));
const DATA_STATION = DATA_CLIENT.data_station[0];
const OPTIONS = {};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//график работы на текущий день
const ADDITIONAL_SCHEDULE = DATA_CLIENT.additional_schedule;
let ADDITIONAL_SCHEDULE_TODAY = [];
try { ADDITIONAL_SCHEDULE_TODAY = ADDITIONAL_SCHEDULE.filter(key => key.date === moment().format('YYYY-MM-DD')) }
catch (error) { console.log(error) }

if (ADDITIONAL_SCHEDULE_TODAY.length > 0) {
  OPTIONS['start_app'] = ADDITIONAL_SCHEDULE_TODAY[0].start_work;
  OPTIONS['stop_app'] = ADDITIONAL_SCHEDULE_TODAY[0].stop_work;
} else {
  OPTIONS['start_app'] = DATA_STATION.start_work;
  OPTIONS['stop_app'] = DATA_STATION.stop_work;
}

send_msg("LOG", "UPDATE SCHEDULE FOR TODAY");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//формирование плейлистов для текущего дня
try {

  const PLAYLISTS = DATA_CLIENT.playlists;
  const SPEC_PLAYLISTS = DATA_CLIENT.spec_playlists;
  const SPEC_PLAYLISTS_TODAY = SPEC_PLAYLISTS.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));

  if (SPEC_PLAYLISTS_TODAY.length > 0) { OPTIONS['playlists'] = SPEC_PLAYLISTS_TODAY }
  else {
    const PLAYLISTS_TODAY = PLAYLISTS.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));
    OPTIONS['playlists'] = PLAYLISTS_TODAY;
  }

  send_msg("LOG", "UPDATE PLAYLISTS FOR TODAY");
} catch (error) { console.log(error); send_msg("ERROR", "CONFIG PLAYLISTS") }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Формирование списка музыкальных файлов на текущий день
let ALL_MUSIC = DATA_CLIENT.all_music;

// Проверка структуры массива ALL_MUSIC и объединение вложенных массивов в один
if (ALL_MUSIC.length > 0 && Array.isArray(ALL_MUSIC[0])) { ALL_MUSIC = [].concat(...ALL_MUSIC) }

// Сортировка музыки для текущего дня
OPTIONS['all_music_today'] = [];
try {
  for (key of Object.keys(OPTIONS.playlists)) {

    const playlist = OPTIONS.playlists[key];
    const id_playlist = playlist.id_playlist;
    const start_time = playlist.time_start;
    const stop_time = playlist.time_stop;
    const name_playlist = playlist.name_playlist;

    for (const music of ALL_MUSIC) {
      if (id_playlist === music.id_playlist) {

        music.time_start = start_time;
        music.time_stop = stop_time;
        music.name_playlist = name_playlist;
        music.full_name = `${music.artist}-${music.name_song}.mp3`;

        OPTIONS.all_music_today.push(music);
      }
    }
  }

  send_msg("LOG", "UPDATE ALL MUSIC FOR TODAY");
} catch (error) { console.log(error); send_msg("ERROR", "CONFIG ALL_MUSIC_TODAY") }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Формирование списка рекламы на текущий день
try {

  const LIST_ADV = DATA_CLIENT.list_adv;

  if (LIST_ADV.length > 0) {
    const ADV_TODAY = LIST_ADV.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));
    // Сортировка актуальной рекламы по типу (fix, interval_t)
    OPTIONS['adv_fix'] = ADV_TODAY.filter(key => key.type === 'fix');
    OPTIONS['adv_interval'] = ADV_TODAY.filter(key => key.type === 'interval_t');
    //OPTIONS['adv_interval'].sort((a, b) => a.interval - b.interval);

    send_msg("LOG", "UPDATE ADV FOR TODAY");
  } else { send_msg("LOG", "NO ADV") }

}
catch (error) { console.log(error); send_msg("ERROR", "CONFIG ADV") }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

fs.writeFileSync(path.join(__dirname, 'storage', 'options.json'), JSON.stringify(OPTIONS, null, 2));
console.log("UPDATE OPTIONS");
send_msg("SCHEDULE UPADATE: SUCCESSFUL");
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////