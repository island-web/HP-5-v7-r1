



const pm2 = require('pm2');
const path = require('path');

pm2.start({
    script: path.join(__dirname, 'download_adv.js'),
    name: 'DOWNLOAD ADV',
    maxRestarts: 10,
    maxMemoryRestart: '2G',
    instances: 1,
    autorestart: true,
    exec_mode: 'fork'
});
