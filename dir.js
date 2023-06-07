const fs = require('fs');
const os = require('os');
const path = require('path');
const _PATH_APP_ = path.join(os.homedir(), 'huinity');


try {
  fs.mkdirSync(_PATH_APP_, { recursive: true });
  fs.mkdirSync(path.join(_PATH_APP_, 'music'), { recursive: true });
  fs.mkdirSync(path.join(_PATH_APP_, 'adv'), { recursive: true });

  fs.mkdirSync(path.join(_PATH_APP_, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(_PATH_APP_, 'logs', 'error.log'), '');
  fs.writeFileSync(path.join(_PATH_APP_, 'logs', 'worker.log'), '');
  fs.writeFileSync(path.join(_PATH_APP_, 'logs', 'staff.log'), '');
  fs.writeFileSync(path.join(_PATH_APP_, 'logs', 'all.log'), '');


  fs.mkdirSync(path.join(_PATH_APP_, 'configs'), { recursive: true });
  fs.writeFileSync(path.join(_PATH_APP_, 'configs', 'station_settings.json'), JSON.stringify(['empty']), 'utf-8');
    
  fs.mkdirSync(path.join(_PATH_APP_, 'pm2'), { recursive: true });
  fs.writeFileSync(path.join(_PATH_APP_, 'pm2', 'processes_list.json'), '');


} catch (error) {
  console.log(error);
}

