const pm2 = require('pm2');
const path = require('path');

pm2.start({
        script: path.join(__dirname, 'notification.js'),
        name: 'NOTIFICATION',
        maxRestarts: 10,
        maxMemoryRestart: '2G',
        instances: 1,
        autorestart: true,
        exec_mode: 'cluster'
    }
)