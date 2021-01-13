const json = require("../build/contracts/LockMapping.json");
const lockAbi = json["abi"];


async function getLock(Web3,LockAddress) {
    console.log(`get lock... ${LockAddress}`);
    console.log(`sender... ${Web3.eth.defaultAccount}`);
    return this.lock = new Web3.eth.Contract(lockAbi,LockAddress);
}

async function getLockContract(Lock,LockAddress) {
    console.log(`get lock... ${LockAddress}`);
    this.lock = await Lock.at(LockAddress);
}

//transaction
async function createReceipt(amount,token,sender = this.lock.sender){
    console.log(`Sending createReceipt ${token} tx..`);
    console.log(`Sender is ${sender}`);
    console.log(`${token}`);
    await this.lock.createReceipt(amount, token, {from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

async function finishReceipt(id,sender = this.lock.sender){
    console.log(`Sending finishReceipt ${id} tx..`);
    console.log(`Sender is ${sender}`);
    await this.lock.finishReceipt(id, {from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

//only owner
async function fixSaveTime(time,sender = this.lock.sender){
    console.log(`Sending fixSaveTime tx..`);
    console.log(`Sender is ${sender}`);
    await this.lock.fixSaveTime(time, {from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

async function transferOwnership(address,sender = this.lock.sender){
    console.log(`Sending transferOwnership tx..`);
    console.log(`Sender is ${sender}`);
    await this.lock.transferOwnership(address, {from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

//view
async function getMyReceipts(address){
    let receipts = await this.lock.getMyReceipts(address);
    return receipts.toString();
}

async function getLockTokens(address){
    let lockTokens = await this.lock.getLockTokens(address);
    return lockTokens.toString();
}

async function getReceiptInfo(index){
    let receiptInfo = await this.lock.getReceiptInfo.call(index);
    return receiptInfo.toString();
}


module.exports = {
    getLock: getLock,
    getLockContract:getLockContract,

    createReceipt: createReceipt,
    finishReceipt: finishReceipt,

    fixSaveTime: fixSaveTime,
    transferOwnership: transferOwnership,

    getMyReceipts: getMyReceipts,
    getLockTokens: getLockTokens,
    getReceiptInfo: getReceiptInfo,
}