


const processName = "DOWNLOAD ADV";

const path = require('path');
const fs = require('fs');
const os = require('os');
const Downloader = require("nodejs-file-downloader");


const MY_HOST = 'https://infiniti-pro.com/';
const PATH_CONFIG_FILE = path.join(os.homedir(), 'huinity', 'configs', 'station_settings.json');
const PATH_ADV = path.join(os.homedir(), 'huinity', 'adv');
const DATA_CLIENT = JSON.parse(fs.readFileSync(path.join(PATH_CONFIG_FILE)));
const ADV = check_adv();


let count_adv_download = 0;


function send_msg(com = 'ONLINE', msg = null ){ 
    process.send({ type : 'process:msg', data : { name: processName, command: com, message: msg }})}
send_msg();



function check_adv() {
    
    let arr_adv = [];
    const ALL_ADV = DATA_CLIENT.list_adv;
    for (key of Object.keys(ALL_ADV)) { 
        if (!fs.existsSync(path.join(PATH_ADV, ALL_ADV[key].name_adv))) {
            arr_adv.push(ALL_ADV[key].name_adv) 
        } 
    } 
    send_msg('WORKER', 'ALL COUNT ADV FOR DOWNLOAD: ' + arr_adv.length);
    return arr_adv;

}



if (ADV.length > 0) { 
    download_ad();
    const init = JSON.parse(fs.readFileSync(path.join(__dirname, 'storage', 'init.json')));
    init['all_adv_download'] = ADV.length;
    fs.writeFileSync(path.join(__dirname, 'storage', 'init.json'), JSON.stringify(init))
}
else { send_msg('NO CONTENT DOWNLOAD') }



function download_ad() {
    (async () => {
        const path_file = path.join(MY_HOST, 'adv', ADV[count_adv_download]);
        const downloader = new Downloader({ url: path_file, directory: PATH_ADV });
        send_msg('WORKER', 'START DOWNLOAD:' + ADV[count_adv_download]);

        try {
            const { filePath, downloadStatus } = await downloader.download();
            count_adv_download++;
            if (count_adv_download < ADV.length) { download_ad() }
            else { send_msg('END DOWNLOAD'); }
        } catch (error) { send_msg('ERROR'); download_ad() }

    })()
}
process.on('message', (msg) => { console.log(msg) });