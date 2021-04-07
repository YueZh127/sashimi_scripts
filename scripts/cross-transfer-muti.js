const config = require('../truffle-config');
const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const tokens = require('./tokens-config');
const contract = require("./basicContract");
const helper = require("./helper");
const BigNumber = require('bignumber.js');

const crossChainInfo = require("../crosschainInfo.json");
const logger = require('log-js')();
const argv = require('minimist')(process.argv.slice(2), {string: ['network']});


const shdToken = tokens.kovan.shd;
const crossContract = contracts.kovan.cross;

const owner = keys.address.lisa;
const layer = keys.address.test;
const maxAmountPerDay = crossChainInfo.maxAmountPerDay;
const maxAmount = crossChainInfo.maxAmount;
const minAmount = crossChainInfo.minAmount;
const fee = crossChainInfo.fee;
const outputPath = crossChainInfo.outputPath;

let chain_bsc = 1;

module.exports = async function () {
    let senderPkey = keys.keys.TEST;
    logger.status = false

    let web3;
    let SHDContract;
    let CrossChainContract;

    web3 = await providers.useKovanProvider(senderPkey);
    await providers.addAccount(web3, keys.keyList);
    CrossChainContract = await contract.initContract('CrossChain', web3, crossContract);
    SHDContract = await contract.initContract('ERC20Token', web3, shdToken);

    let senders = web3.eth.accounts.wallet;
    let accountCount = web3.eth.accounts.wallet.length;

    logger.info('Transfer eth ===> bsc');
    await getCrossChainInfo(CrossChainContract, shdToken, chain_bsc);

    let sendTotal = await sendTotalAmount(CrossChainContract, shdToken);
    logger.info(`token: ${shdToken}, send total amount ===> ${sendTotal}`);
    logger.info(`Prepare transfer `)
    let senderAmount = [];
    let totalCrossAmount = [];

    for (let i = 0; i < accountCount; i++) {
        let balance = await checkBalance(SHDContract, senders[i].address);
        logger.info(`account: ${senders[i].address}, balance ===> ${balance}`);

        if (balance <= new BigNumber(maxAmountPerDay)) {
            let transferTx = await contract.callSendMethod(
                SHDContract,
                'transfer',
                owner,
                [senders[i].address, new BigNumber(maxAmountPerDay)]
            );
            logger.info(`transfer tx: ${transferTx.transactionHash}: ${transferTx.status}`);

            balance = await checkBalance(SHDContract, senders[i].address);
            logger.info(`account: ${senders[i].address}, balance ===> ${balance}`);
        }

        let allowance = await checkAllowance(SHDContract, crossContract, senders[i].address);
        if (allowance < new BigNumber(maxAmountPerDay)) {
            let approve = await contract.callSendMethod(
                SHDContract,
                'approve',
                senders[i].address,
                [crossContract, new BigNumber(maxAmountPerDay)]
            );
            logger.info(`approve tx: ${approve.transactionHash}: ${approve.status}`);
        }
        senderAmount[senders[i].address] = new BigNumber(balance);
    }

    let startBlock = await web3.eth.getBlockNumber();
    logger.info(`start block :${startBlock}`)
    let nonceList = [];
    for (let i = 0; i < accountCount; i++) {
        let nonce = await web3.eth.getTransactionCount(senders[i].address);
        nonceList.push(nonce);
    }
    let times = 2;
    let j = 0

    while (times >= 0)
    {
        logger.info(`start: ${200 - times} round ...`)
        for (let i = 0; i < accountCount; i++) {
            if (senders[i].address == layer) continue;
            let crossAmount = getCrossChainAmount();
            let nonce = nonceList[i]+j;
            contract.callSendMethodWithOutResult(
                CrossChainContract,
                'crossChainTransfer',
                senders[i].address,
                [shdToken, crossAmount.toString(), senders[i].address, chain_bsc],
                nonce,
                fee
            );
            let origin = senderAmount[senders[i].address];
            let originCross = totalCrossAmount[senders[i].address] == undefined? 0: totalCrossAmount[senders[i].address];

            senderAmount[senders[i].address] = origin.minus(crossAmount);
            totalCrossAmount[senders[i].address] = crossAmount.plus(originCross);

            logger.info(`${senderAmount[senders[i].address]}, ${totalCrossAmount[senders[i].address]}`)
        }
        await helper.sleep(5000);
        times--;
        j++;
    }

    let senderInfos = [];
    for (let i = 0; i < accountCount; i++){
        let account = senders[i].address;
        let balance = senderAmount[account];
        let amount = totalCrossAmount[account];
        let senderInfo = {
            "sender": account, "balance": balance,"amount": amount
        }
        senderInfos.push(senderInfo);
    }

    await helper.writeJson('CrossChainInfos1',senderInfos,outputPath);

    console.log('End.');
}


async function getCrossChainInfo(contractAddress, tokenAddress, chain) {
    let get = await getMaxAmountPerDay(contractAddress);
    if (get == 0) {
        logger.info(`Set maxAmountPerDay ...`)
        let setMaxPerDay = await contract.callSendMethod(
            contractAddress,
            'setMaxAmountPerDay',
            owner,
            [tokenAddress, new BigNumber(maxAmountPerDay)]
        );
        logger.info(`setMaxAmountPerDay tx: ${setMaxPerDay.transactionHash}: ${setMaxPerDay.status}`);
    }

    let chainFee = await getFee(contractAddress, chain);
    if (chainFee == 0) {
        logger.info(`Set fee ...`)
        let set = await contract.callSendMethod(
            contractAddress,
            'setFee',
            owner,
            [chain, fee]
        );
        logger.info(`setFee tx: ${set.transactionHash}: ${set.status}`);
    }
    let max = await getMaxAmount(contractAddress, tokenAddress);
    if (max == 0) {
        logger.info(`Set max amount  ...`)
        let set = await contract.callSendMethod(
            contractAddress,
            'setMaxAmount',
            owner,
            [tokenAddress, new BigNumber(maxAmount)]
        );
        logger.info(`maxAmount tx: ${set.transactionHash}: ${set.status}`);
    }

    let min = await getMinAmount(contractAddress, tokenAddress);
    if (min == 0) {
        logger.info(`Set min amount ...`)
        let set = await contract.callSendMethod(
            contractAddress,
            'setMinAmount',
            owner,
            [tokenAddress, new BigNumber(minAmount)]
        );
        logger.info(`minAmount tx: ${set.transactionHash}: ${set.status}`);
    }
}

async function getMaxAmountPerDay(contractAddress,tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'maxAmountPerDay',
        [tokenAddress]
    );
}

async function getFee(contractAddress, chain) {
    return await contract.callViewMethod(
        contractAddress,
        'fee',
        [chain]
    );
}

async function getMaxAmount(contractAddress,tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'maxAmount',
        [tokenAddress]
    );
}

async function getMinAmount(contractAddress, tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'minAmount',
        [tokenAddress]
    );
}

async function sendTotalAmount(contractAddress,tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'sendTotalAmount',
        [tokenAddress]
    );
}

async function receiveTotalAmount(contractAddress,tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'receiveTotalAmount',
        [tokenAddress]
    );
}

async function checkBalance(contractAddress, account) {
    return await contract.callViewMethod(
        contractAddress,
        'balanceOf',
        [account]
    );
}

async function checkAllowance(contractAddress, spender, owner) {
    return await contract.callViewMethod(
        contractAddress,
        'allowance',
        [owner, spender]
    );
}

function getInfo(txId,tokenAddress) {
    let lower = tokenAddress.toLowerCase();
    let info = 'eth_' +lower+'_' + txId;
    return info;
}

function getCrossChainAmount() {
    let amount = helper.getRndInteger(minAmount, maxAmount);
    return amount;
}



