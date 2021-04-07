const ethers = require('ethers');
const {_, time} = require('@openzeppelin/test-helpers');
const fs = require('fs');
const BigNumber = require("bignumber.js");

function encodeParameters(types, values) {
    const abi = new ethers.utils.AbiCoder();
    try {
        return abi.encode(types, values);
    } catch (e) {
        console.log(e);
    }
}

async function latestBlockTIme(web3) {
    const block = await web3.eth.getBlock('latest');
    return new web3.utils.BN(block.timestamp);
}

function duration(delay) {
    return time.duration.minutes(delay);
}

async function writeJson(file, obj,outputPath) {
    let json = JSON.stringify(obj);
    fs.writeFile(outputPath + `/${file}.json`, json, 'utf8', (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved in", `${file}.json`);
    });
}

function getRndInteger(min, max) {
    return new BigNumber(Math.floor(Math.random() * (max - min + 1)) + min);
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}


module.exports ={
    encodeParameters : encodeParameters,
    latestBlockTIme : latestBlockTIme,
    duration : duration,
    writeJson: writeJson,
    getRndInteger: getRndInteger,
    sleep:sleep
}