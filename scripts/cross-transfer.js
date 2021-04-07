const config = require('../truffle-config');
const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const tokens = require('./tokens-config');
const contract = require("./basicContract");
const helper = require("./helper");
const crossChainInfo = require("../crosschainInfo.json");
const BigNumber = require("bignumber.js");
const logger = require('log-js')();
const argv = require('minimist')(process.argv.slice(2), {
    string: ['fromChain']
});


const shdToken = tokens.kovan.shd;
const crossContract = contracts.kovan.cross;

const bscShdToken = tokens.bsctest.shd;
const bscCrossContract = contracts.bsctest.cross;

const owner = keys.address.lisa;
const layer1 = keys.address.test;
const layer2 = keys.address.alice;

const maxAmountPerDay = crossChainInfo.maxAmountPerDay;
const maxAmount = crossChainInfo.maxAmount;
const minAmount = crossChainInfo.minAmount;
const fee = crossChainInfo.fee;

let chain_eth = 0;
let chain_bsc = 1;

module.exports = async function () {

    let senderPkey = keys.keys.TEST;
    logger.status = false

    let web3;
    let SHDContract;
    let CrossChainContract;

    web3 = await providers.useKovanProvider(senderPkey);
    await providers.addAccount(web3, keys.keyList);
    let senders = web3.eth.accounts.wallet;
    let accountCount = web3.eth.accounts.wallet.length;

    CrossChainContract = await contract.initContract('CrossChain', web3, crossContract);
    SHDContract = await contract.initContract('ERC20Token', web3, shdToken);

    let bsc_web3;
    let bsc_SHDContract;
    let bsc_CrossChainContract;

    bsc_web3 = await providers.useBscTestProvider(senderPkey);
    await providers.addAccount(bsc_web3, keys.keyList);

    let bsc_senders = bsc_web3.eth.accounts.wallet;
    let bsd_accountCount = bsc_web3.eth.accounts.wallet.length;

    bsc_CrossChainContract = await contract.initContract('CrossChain', bsc_web3, bscCrossContract);
    bsc_SHDContract = await contract.initContract('ERC20Token', bsc_web3, bscShdToken);


    let crossChainTxInfos = [];

    if (argv['fromChain'] === 'eth') {
        logger.info('Transfer eth ===> bsc');
        await getCrossChainInfo(CrossChainContract, shdToken, chain_bsc);
        for (let i = 0; i < accountCount; i++) {
            if (senders[i].address == layer1) continue;
            let info = await crossChainTransfer(CrossChainContract, SHDContract, chain_bsc, senders[i].address, shdToken);
            if (info !== null) crossChainTxInfos.push(info);
        }
        logger.info('receive on bsc ... ');
        await getCrossChainInfo(bsc_CrossChainContract, bscShdToken, chain_eth);
        await receiveToken(crossChainTxInfos,bsc_CrossChainContract,bsc_SHDContract,bscShdToken);
    }

    if (argv['fromChain'] === 'bsc') {
        logger.info('Transfer bsc ===> eth');
        await getCrossChainInfo(bsc_CrossChainContract, bscShdToken, chain_eth);
        for (let i = 0; i < bsd_accountCount; i++) {
            // if (senders[i].address == layer1) continue;
            // let info = await crossChainTransfer(bsc_CrossChainContract, bsc_SHDContract, chain_eth, bsc_senders[i].address, bscShdToken);
            // if (info !== null) crossChainTxInfos.push(info);


            let balance = await checkBalance(bsc_SHDContract, bsc_senders[i].address);
            logger.info(`account: ${bsc_senders[i].address}, balance ===> ${balance}`);
        }
        logger.info('receive on eth ... ');
        // await getCrossChainInfo(CrossChainContract, shdToken, chain_bsc);

        // await receiveToken(crossChainTxInfos,CrossChainContract,SHDContract,shdToken);
    }

    console.log('End.');
}
async function receiveToken(crossChainTxInfos,crossContract, tokenContract, token){
    let receiveInfos = [];
    crossChainTxInfos.forEach(function (item) {
        let info = getInfo(item.tx, token);
        let receiver = item.receiver;
        let amount = item.amount;
        let receiveInfo = {
            "info": info,
            "receiver": receiver,
            "amount": amount
        };
        receiveInfos.push(receiveInfo)
    });

    for (let i = 0; i < receiveInfos.length; i++) {

        let receiveTotal = await receiveTotalAmount(crossContract, token);
        let balance = await checkBalance(tokenContract, receiveInfos[i].receiver);

        let receiveTx2 = await contract.callSendMethod(
            crossContract,
            'receiveToken',
            layer1,
            [
                token,
                receiveInfos[i].amount,
                receiveInfos[i].receiver,
                receiveInfos[i].info
            ]);
        logger.info(`receiveToken tx: ${receiveTx2.transactionHash}: ${receiveTx2.status}, ${receiveTx2.blockNumber}`);


        let afterReceiveTotal = await receiveTotalAmount(crossContract, token);
        let exceptReceiveTotal = new BigNumber(receiveTotal).plus(new BigNumber(receiveInfos[i].amount))
        console.assert( exceptReceiveTotal.eq(new BigNumber(afterReceiveTotal)), `receive total ${receiveTotal}; after ${afterReceiveTotal}; amount ${receiveInfos[i].amount}`);

        let afterBalance = await checkBalance(tokenContract, receiveInfos[i].receiver);
        let exceptBalance = new BigNumber(balance).plus(new BigNumber(receiveInfos[i].amount))
        console.assert(exceptBalance.eq(new BigNumber(afterBalance)) , `before balance ${balance}; after ${afterBalance}; amount ${receiveInfos[i].amount}`);

        logger.info("call second:")
        let result = await contract.callViewMethod(
            crossContract,
            'receiveToken',
            layer1,
            [
                token,
                receiveInfos[i].amount,
                receiveInfos[i].receiver,
                receiveInfos[i].info
            ]);
        logger.info(`${JSON.stringify(result)}`)
    }
}



async function crossChainTransfer(crossContract, tokenContract, chain, account, token) {

    let sendTotal = await sendTotalAmount(crossContract, token);
    logger.info(`token: ${shdToken}, send total amount ===> ${sendTotal}`);

    let balance = await checkBalance(tokenContract, account);
    logger.info(`account: ${account}, balance ===> ${balance}`);
    let crossAmount = getCrossChainAmount();

    if (crossAmount.gt(new BigNumber(balance))) {
        let transferTx = await contract.callSendMethod(
            tokenContract,
            'transfer',
            owner,
            [account, crossAmount.toFixed()]
        );
        logger.info(`transfer tx: ${transferTx.transactionHash}: ${transferTx.status}`);

        balance = await checkBalance(tokenContract, account);
        logger.info(`account: ${account}, balance ===> ${balance}`);
    }

    let allowance = await checkAllowance(tokenContract, crossContract.address, account);
    if (crossAmount.gt(new BigNumber(allowance)) ) {
        let approve = await contract.callSendMethod(
            tokenContract,
            'approve',
            account,
            [crossContract.address, crossAmount.toFixed()]
        );
        logger.info(`approve tx: ${approve.transactionHash}: ${approve.status}`);
    }
    let sum = crossAmount.plus(new BigNumber(sendTotal));
    if (sum.gt(new BigNumber(maxAmountPerDay))) {
        let crossChainTransferError = await contract.callViewMethod(
            crossContract,
            'crossChainTransfer',
            account,
            [token, crossAmount.toString(), account, chain],
            fee
        );
        logger.info(`error: ${crossChainTransferError.error}`);
        return null;
    }

    let crossChainTransfer = await contract.callSendMethod(
        crossContract,
        'crossChainTransfer',
        account,
        [token, crossAmount.toString(), account, chain],
        fee
    );
    logger.info(`crossChainTransfer tx: ${crossChainTransfer.transactionHash}: ${crossChainTransfer.status}, ${crossChainTransfer.blockNumber}`);
    let crossChainTxInfo = {
        "tx": crossChainTransfer.transactionHash,
        "receiver": account,
        "amount": crossAmount.toString()
    };

    let afterBalance = await checkBalance(tokenContract, account);
    logger.info(`account: ${account}, after transfer balance ===> ${afterBalance}`);
    let  exceptBalance = new BigNumber(balance).minus(crossAmount);
    console.assert(exceptBalance.eq(new BigNumber(afterBalance)), `actual balance is ${afterBalance}, except balance is ${exceptBalance.toFixed()}`);

    let afterAmount = await sendTotalAmount(crossContract, token);
    logger.info(`token: ${token}, after send total amount ===> ${afterAmount}`);
    let exceptSendTotalAmount = crossAmount.plus(new BigNumber(sendTotal));
    console.assert(exceptSendTotalAmount.eq(new BigNumber(afterAmount)), `actual total is ${afterAmount}, except total is ${exceptSendTotalAmount.toFixed()}`);
    await helper.sleep(1000);
    return crossChainTxInfo;
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

async function getMaxAmountPerDay(contractAddress, tokenAddress) {
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

async function getMaxAmount(contractAddress, tokenAddress) {
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

async function sendTotalAmount(contractAddress, tokenAddress) {
    return await contract.callViewMethod(
        contractAddress,
        'sendTotalAmount',
        [tokenAddress]
    );
}

async function receiveTotalAmount(contractAddress, tokenAddress) {
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

function getInfo(txId, tokenAddress) {
    let lower = tokenAddress.toLowerCase();
    let info = 'eth_' + lower + '_' + txId;
    return info;
}

function getCrossChainAmount() {
    let amount = helper.getRndInteger(minAmount, maxAmount);
    return amount;
}


