const moment = require('moment-timezone');
moment.tz.setDefault('Europe/Kiev');

module.exports.between = ((from, to, val = "null") => {

    if(val === "null") { val = moment(new Date(), 'HH:mm:ss') }
    else { val = moment(val, 'HH:mm:ss') }

    console.log(val);
    console.log(moment(from, "HH:mm:ss"));

    if (val >= moment(from, "HH:mm:ss") && val < moment(to, "HH:mm:ss")) {
        return true;
    }else{
        return false;
    }
});
