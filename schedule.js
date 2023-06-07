// Description: Скрипт для планирования работы приложения
const processName = "SCHEDULE";
const PID = process.pid;

function send_msg(com = 'ONLINE', msg = PID) {
  process.send({
    type: 'process:msg',
    data: { name: processName, command: com, message: msg }
  });
}
send_msg();

const moment = require('moment');
const os = require('os');
const fs = require("fs");
const { exec } = require('child_process');
const schedule = require('node-schedule');
const path = require('path');

const MY_DATE = (val) => moment(new Date(val)).format('YYYY-MM-DD');



const PATH_CONFIG_FILE = path.join(os.homedir(), 'huinity', 'configs', 'station_settings.json');
const DATA_CLIENT = JSON.parse(fs.readFileSync(PATH_CONFIG_FILE));
const DATA_STATION = DATA_CLIENT.data_station[0];

const SCHEDULE_PLAYLISTS = {};

const ADDITIONAL_SCHEDULE = DATA_CLIENT.additional_schedule;
const ADDITIONAL_SCHEDULE_TODAY = ADDITIONAL_SCHEDULE.filter(key => key.date === moment().format('YYYY-MM-DD'));
let start_stop;

if (ADDITIONAL_SCHEDULE_TODAY.length > 0) {
  start_stop = [
    getTimeRule(ADDITIONAL_SCHEDULE_TODAY[0].start_work),
    getTimeRule(ADDITIONAL_SCHEDULE_TODAY[0].stop_work)
  ];
} else {
  start_stop = [
    getTimeRule(DATA_STATION.start_work),
    getTimeRule(DATA_STATION.stop_work)
  ];
}

schedule.scheduleJob(start_stop[0], () => { send_msg("START WORK " + element.name) });


function getTimeRule(timeString) {
  const [hours, minutes, seconds] = timeString.split(':');
  const rule = new schedule.RecurrenceRule();
  rule.hour = parseInt(hours);
  rule.minute = parseInt(minutes);
  rule.second = parseInt(seconds);
  return rule;
}

const hour_start = (start_stop[0].hour < 10) ? '0' + start_stop[0].hour : start_stop[0].hour;
const minute_start = (start_stop[0].minute < 10) ? '0' + start_stop[0].minute : start_stop[0].minute;
const hour_stop = (start_stop[1].hour < 10) ? '0' + start_stop[1].hour : start_stop[1].hour;
const minute_stop = (start_stop[1].minute < 10) ? '0' + start_stop[1].minute : start_stop[1].minute;

const data_work_day = {
  'start_app': `${hour_start}:${minute_start}`,
  'stop_app': `${hour_stop}:${minute_stop}`
};

try {
  fs.writeFileSync(path.join(__dirname, 'storage', 'options.json'), JSON.stringify(data_work_day));
} catch (error) {
  console.log(error);
  send_msg("ERROR", "ERROR CONFIG UPDATE SCHEDULE");
}

function add_playlist(element, obj) {
  const [h_start, m_start, s_start] = element.time_start.split(':');
  const [h_stop, m_stop, s_stop] = element.time_stop.split(':');

  const rule_start = new schedule.RecurrenceRule();
  const rule_stop = new schedule.RecurrenceRule();

  rule_start.hour = parseInt(h_start);
  rule_start.minute = parseInt(m_start);
  rule_start.second = parseInt(s_start);

  rule_stop.hour = parseInt(h_stop);
  rule_stop.minute = parseInt(m_stop);
  rule_stop.second = parseInt(s_stop);

  schedule.scheduleJob(rule_start, () => { send_msg("START PLAYLIST " + element.name) });
  schedule.scheduleJob(rule_stop, () => { send_msg("STOP PLAYLIST " + element.name) });

  if (obj.hasOwnProperty(element.time_start)) {
    obj[element.time_start].push(element);
  } else {
    obj[element.time_start] = [element];
  }
}

try {
  const PLAYLISTS = DATA_CLIENT.playlists;
  const PLAYLISTS_TODAY = PLAYLISTS.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));

  const SPEC_PLAYLISTS = DATA_CLIENT.spec_playlists;
  const SPEC_PLAYLISTS_TODAY = SPEC_PLAYLISTS.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));

  if (SPEC_PLAYLISTS_TODAY.length > 0) {
    if (SPEC_PLAYLISTS_TODAY.length > 1) {
      SPEC_PLAYLISTS_TODAY.forEach(element => {
        add_playlist(element, SCHEDULE_PLAYLISTS);
      });
    } else {
      add_playlist(SPEC_PLAYLISTS_TODAY[0], SCHEDULE_PLAYLISTS);
    }
  } else {
    if (PLAYLISTS_TODAY.length > 1) {
      PLAYLISTS_TODAY.forEach(element => {
        add_playlist(element, SCHEDULE_PLAYLISTS);
      });
    } else {
      add_playlist(PLAYLISTS_TODAY[0], SCHEDULE_PLAYLISTS);
    }
  }
} catch (error) {
  console.log(error);
  send_msg("ERROR CONFIG PLAYLISTS");
}
finally {
  if (Object.keys(SCHEDULE_PLAYLISTS).length > 0) {
    fs.writeFileSync(path.join(__dirname, 'storage', 'schedule_playlists.json'), JSON.stringify(SCHEDULE_PLAYLISTS));
  } else {
    send_msg('ERROR', ['PLAYLISTS', 'no playlists for today']);
  }
}
// СОРТИРОВКА МУЗЫКИ И ФОРМИРОВАНИЕ ПРОГРАММЫ ТРАНСЛЯЦИИ ДЛЯ ТЕКУЩЕГО ДНЯ

// Получение всех музыкальных файлов из DATA_CLIENT.all_music
let ALL_MUSIC = DATA_CLIENT.all_music;

// Проверка структуры массива ALL_MUSIC и объединение вложенных массивов в один
if (ALL_MUSIC.length > 0 && Array.isArray(ALL_MUSIC[0])) {
  ALL_MUSIC = [].concat(...ALL_MUSIC);
}

// Запись всей музыки в отдельный файл (storage/all_music.json)
fs.writeFileSync(path.join(__dirname, 'storage', 'all_music.json'), JSON.stringify(ALL_MUSIC));

// Сортировка музыки для текущего дня
const ALL_MUSIC_TODAY = [];

for (key of Object.keys(SCHEDULE_PLAYLISTS)) {

  const playlist = SCHEDULE_PLAYLISTS[key][0];
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

      ALL_MUSIC_TODAY.push(music);
    }
  } 
}

// Запись всей музыки для текущего дня в отдельный файл (storage/all_music_today.json)
try {
  fs.writeFileSync(path.join(__dirname, 'storage', 'all_music_today.json'), JSON.stringify(ALL_MUSIC_TODAY, null, 2));
} catch (error) {
  console.log(error);
  send_msg("ERROR", "CONFIG ALL_MUSIC_TODAY");
}

// СОРТИРОВКА И ИНИЦИАЛИЗАЦИЯ ЗАДАЧ ДЛЯ РЕКЛАМЫ

// Получение всей рекламы из DATA_CLIENT.list_adv
const LIST_ADV = DATA_CLIENT.list_adv;

// Сортировка рекламы для текущего дня
const ADV_TODAY = LIST_ADV.filter(key => moment().isBetween(MY_DATE(key.date_start), MY_DATE(key.date_stop), null, '[]'));
// Сортировка актуальной рекламы по типу (fix, interval_t)
const FIXED_ADV_TODAY = ADV_TODAY.filter(key => key.type === 'fix');
const INTERVAL_ADV_TODAY = ADV_TODAY.filter(key => key.type === 'interval_t');

// Запись отсортированной фиксированной рекламы в файлы
fs.writeFileSync(path.join(__dirname, 'storage', 'fixed_adv_today.json'), JSON.stringify(FIXED_ADV_TODAY));

// Создание задач Node Schedule для каждой фиксированной рекламы
for (const fixedAdv of FIXED_ADV_TODAY) {
  const [h_start, m_start, s_start] = fixedAdv.time_start.split(':');

  const rule_start = new schedule.RecurrenceRule();
  rule_start.hour = parseInt(h_start);
  rule_start.minute = parseInt(m_start);
  rule_start.second = parseInt(s_start);

  schedule.scheduleJob(rule_start, function () {
    send_msg("FIXED ADV START", fixedAdv.name);
  });
}

// Инициализация объекта для сортировки интервальной рекламы
const INTERVAL_ADV_SCHEDULE = {};

for (const intervalAdv of INTERVAL_ADV_TODAY) {
  const interval = intervalAdv.interval_t;

  if (!INTERVAL_ADV_SCHEDULE[interval]) {
    INTERVAL_ADV_SCHEDULE[interval] = [];

    // Создание Node Schedule цикла для каждого интервала с шагом interval
    schedule.scheduleJob(`*/${interval} * * * *`, function () {
      send_msg("INTERVAL ADV START", INTERVAL_ADV_SCHEDULE[interval]);
    });
  }

  INTERVAL_ADV_SCHEDULE[interval].push(intervalAdv);
}

// Запись отсортированной интервальной рекламы в файлы
try {
  fs.writeFileSync(path.join(__dirname, 'storage', 'interval_adv_today.json'), JSON.stringify(INTERVAL_ADV_SCHEDULE));
} catch (error) {
  console.log(error);
  send_msg("ERROR", "CONFIG ALL_ADV_TODAY");
} finally {
  send_msg("SCHEDULE UPDATE");
}
