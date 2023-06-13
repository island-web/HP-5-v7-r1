const os = require('os');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');
const _PATH_LOGS_ = path.join(os.homedir(), 'huinity', 'logs');

const currentDate = moment().format('YYYY-MM-DD');
const currentTime = moment().format('HH:mm:ss');

module.exports.save_log = (async (log, type = 'worker') => {
  try {

    const all = fs.readFileSync(path.join(_PATH_LOGS_, 'all.log'), 'utf-8');

    switch (type) {
      case "worker":
        let logs_worker = fs.readFileSync(path.join(_PATH_LOGS_, 'worker.log'), 'utf-8');
        let update_worker = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + logs_worker;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'worker.log'), update_worker, 'utf-8');

        let all_logs = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + all;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'all.log'), all_logs, 'utf-8');

        break;

      case "error":
        let logs_error = fs.readFileSync(path.join(_PATH_LOGS_, 'error.log'), 'utf-8');
        let update_error = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + logs_error;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'error.log'), update_error, 'utf-8');

        let all_logs_err = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + all;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'worker.log'), all_logs_err, 'utf-8');

        break;

      case "staff":
        let logs_staff = fs.readFileSync(path.join(_PATH_LOGS_, 'staff.log'), 'utf-8');
        let update_staff = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + logs_staff;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'staff.log'), update_staff, 'utf-8');

        let all_logs_staff = `[${moment().format('YYYY-MM-DD')}] [${moment().format('HH:mm:ss')}] [${log}]\n` + all;
        fs.writeFileSync(path.join(_PATH_LOGS_, 'worker.log'), all_logs_staff, 'utf-8');

        break;

      default:
        break;
    }
  } catch (error) {
    console.log(error);
  }
});
