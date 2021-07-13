const ethers = require('ethers');
const {_, time} = require('@openzeppelin/test-helpers');
const fs = require('fs');
const directory = './data';
const util = require('util');

const readFile = util.promisify(fs.readFile);


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

async function latestBlockHeight(web3) {
    const number = await web3.eth.getBlockNumber();
    return number;
}

function duration(delay) {
    return time.duration.minutes(delay);
}

async function writeJson(file, obj) {
    let json = JSON.stringify(obj);
    fs.writeFile(directory + `/${file}.json`, json, 'utf8', (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved in", `${file}.json`);
    });
}

function writeJsonSync(file, obj) {
    let json = JSON.stringify(obj);
    fs.writeFileSync(directory + `/${file}.json`, json, 'utf8');
    console.log("JSON data is saved in", `${file}.json`);
}

async function readJson(file) {
    let data;
    await readFile( directory + `/${file}.json`, 'utf8').then((text) => {
        console.log("JSON data load.");
        data = text;
    }).catch((err) => {
        console.log('Error', err);
    });

    return JSON.parse(data);
}

async function readJsonWithPath(path) {
    let data;
    await readFile( `${path}`, 'utf8').then((text) => {
        console.log("JSON data load.");
        data = text;
    }).catch((err) => {
        console.log('Error', err);
    });

    return JSON.parse(data);
}

function helperMethod(a,b,c){
    let disc,x1,x2,p,q;
    disc=Math.pow(b,2)-4*a*c;
    if(disc<0){
        console.log('无实根');
        return null;
    }else{
        p=-b/(2*a);
        q=Math.sqrt(disc)/(2*a);
        x1=p+q;
        x2=p-q;
        console.log("两个根分别为："+x1+","+x2);
        if (x1>0)
            return x1;
        else return x2;
    }
}

function getRndInteger(min, max) {
    return new BigNumber(Math.floor(Math.random() * (max - min + 1)) + min);
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}


module.exports = {
    encodeParameters: encodeParameters,
    latestBlockTime: latestBlockTIme,
    latestBlockHeight: latestBlockHeight,
    duration: duration,
    writeJson: writeJson,
    writeJsonSync: writeJsonSync,
    readJson: readJson,
    readJsonWithPath: readJsonWithPath,
    helperMethod: helperMethod,
    getRndInteger: getRndInteger,
    sleep:sleep
}