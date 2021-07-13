var process = require('child_process');
const helper = require('./helper');
var verify = function (contractName, address, networkName) {
    var cmd = 'truffle run verify ' + contractName + '@' + address + ' --network ' + networkName;
    process.exec(cmd, function (error, stdout, stderr) {
        if (error === null){
            console.log(contractName + '@' + address + " Successfully verified");
        }else {
            console.log(contractName + '@' + address + "error:" + error);
        }
    })
}

module.exports = async function () {
    let network = "kovan";
    let addressData = await helper.readJsonWithPath('./scripts/data/addresses.json');
    for (const [name, params] of Object.entries(addressData)) {
        str = name;
        var laststr = str.lastIndexOf('_');
        index = laststr == -1 ? str.length : laststr;
        var newStr = str.substring(0, index);

        verify(newStr, params, network);
    }
}
