const config = require('../truffle-config');
const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const tokens = require('./tokens-config');
const contract = require("./basicContract");
const logger = require('log-js')();
const bigInt = require("big-integer");
const fs = require('fs');

const info = require('../swapInfo.json');

const argv = require('minimist')(process.argv.slice(2), {
    string: ['network'],
    string: ['isFinished'],
    string: ['isOutputTree']
});
const assert = require('assert').strict;

// const alice = keys.address.alice;
const amy = keys.address.amy;
const owner = config.sender;
const sender = keys.address.test;

const maxLeaf = info.maximalLeafCount;
const maximal_lock_amount = info.maximalLockAmount;
const minimum_allowance = info.minimumLockAmount;
const indexTree = info.indexTree;
const outputPath = info.outputPath;


module.exports = async function () {
    logger.info(`network: ${argv['network']}\n`
        + `owner: ${config.sender}`);

    let senderPkey = keys.keys.TEST;
    let aelfAddresses = keys.aelfAddresses;
    let aelfAddress = keys.aelfAddress;
    logger.status = false

    let web3;
    let ELFContract;
    let LockContract;
    let ReceiptMakerContract;
    let MerkleContract;

    if (argv['network'] === 'kovan') {
        web3 = await providers.useKovanProvider(senderPkey);
        await providers.addAccount(web3, keys.keyList);

        let lockAddress = contracts.kovan.lock;
        let makerAddress = contracts.kovan.maker;
        let merkleAddress = contracts.kovan.merkle;
        let elfToken = tokens.kovan.elf;

        ELFContract = await contract.initContract('ELFToken', web3, elfToken);
        LockContract = await contract.initContract('Lock', web3, lockAddress);
        //without finish, token burned
        // ReceiptMakerContract = await contract.initContract('ReceiptMaker', web3, makerAddress);
        MerkleContract = await contract.initContract('Merkle', web3, merkleAddress);
    }

    let senders = web3.eth.accounts.wallet;
    // logger.info(senders);
    let accountCount = web3.eth.accounts.wallet.length;
    for (let i = 0; i < maxLeaf; i++) {
        let exceptTreeIndex = await GetTreeIndex(MerkleContract);
        logger.info(`Begin generate tree ${exceptTreeIndex} ...`)
        logger.info(`Attempt except Receipts:`);
        // let exceptReceipts = await GetReceiptsAmount(ReceiptMakerContract, MerkleContract, exceptTreeIndex + 1);
        let exceptReceipts = await GetReceiptsAmount(LockContract, MerkleContract, exceptTreeIndex + 1);

        logger.info(`ExceptReceipts: ${exceptReceipts}`)
        let receiptIds = [];

        if (exceptReceipts !== i + 1 && i !== 0) {
            let theLastReceiptId = await GetReceiptCount(LockContract);
            let treeCount = await GetTreeCount(MerkleContract);
            let lastTreeInfo = await GetTreeInfo(MerkleContract, treeCount - 1);
            let theFirstReceiptId = Number(lastTreeInfo[1]) + Number(lastTreeInfo[2]);

            for (let p = theFirstReceiptId; p < theLastReceiptId; p++)
                receiptIds.push(p);
        }
        exceptReceipts = maxLeaf;
        while (exceptReceipts > 0) {
            for (let i = 0; i < accountCount; i++) {
                let amount = getRndInteger(bigInt(minimum_allowance), bigInt(maximal_lock_amount));
                logger.info(`Attempt lock ${amount}`);
                let targetIndex = getRndInteger(0, aelfAddresses.length - 1);
                // let receiptId = await LockAction(ELFContract, LockContract, senders[i].address, aelfAddresses[targetIndex], amount.toString());
                await LockAction(ELFContract, LockContract, senders[i].address, aelfAddresses[targetIndex], amount.toString());
                // receiptIds.push(receiptId);
                exceptReceipts--;
                if (exceptReceipts === 0)
                    break;
                await sleep(30000);
            }
        }

        // await RecordReceipts(MerkleContract);
        // //get tree info
        // let treeCount = await CheckTree(MerkleContract, LockContract);
        // let treeIndex = treeCount - 1;
        // let merkleInfo = await GetTreeInfo(MerkleContract, treeIndex);
        //
        // let merkleFirstReceipt = merkleInfo[1];
        // let theLastReceiptId = Number(merkleInfo[1]) + Number(merkleInfo[2]);
        //
        // for (let p = merkleFirstReceipt; p < theLastReceiptId; p++)
        //     receiptIds.push(p);
        //
        // let merkleRoot = merkleInfo[0];
        // let merkleReceiptCounts = merkleInfo[2];
        //
        // //get receipt info
        // let receiptArray = [];
        // for (let r = 0; r < receiptIds.length; r++) {
        //     let receiptInfo = await GetReceiptInfo(LockContract, receiptIds[r]);
        //     let amount = receiptInfo[2];
        //     let receipt = await GetReceipts(LockContract, receiptIds[r]);
        //     let owner = receipt[1];
        //     logger.info(`Get receipt ${receiptIds[r]}, owner: ${owner}, amount: ${amount}`)
        //
        //     let merklePathData = await GenerateMerklePath(MerkleContract, receiptIds[r]);
        //
        //     let merklePath = {
        //         "path_length": merklePathData[1],
        //         "nodes": merklePathData[2],
        //         "positions": merklePathData[3]
        //     };
        //
        //     let receiptData = {
        //         "receipt_id": receiptIds[r],
        //         "uid": receiptInfo[0],
        //         "targetAddress": receiptInfo[1],
        //         "amount": amount,
        //         "isFinished": receiptInfo[3],
        //         "merkle_path": merklePath
        //     }
        //     receiptArray.push(receiptData);
        // }
        //
        // let info = {
        //     "merkle_root": merkleRoot, "tree_index": treeIndex,
        //     "receipt_counts": merkleReceiptCounts, "receipts": receiptArray
        // }
        // //write to file
        // await writeJson(treeCount, info);
    }

    if (argv['isFinished'] === 'true') {
        accountCount = web3.eth.accounts.wallet.length;
        for (let i = 0; i < accountCount; i++) {
            await CheckAndFinishAction(LockContract, senders[i].address);
        }
    }

    if (argv['isOutputTree'] === 'true') {
        let treeInfoList = [];
        let treeCount = await CheckTree(MerkleContract, LockContract);
        for (let i = 0; i < treeCount; i++) {
            let merkleInfo = await GetTreeInfo(MerkleContract, i);
            let info = {
                "index": i,
                "root": merkleInfo[0]
            };
            treeInfoList.push(info);
        }
        let treeInfos = {"treeInfos": treeInfoList}
        await writeJson("TreeInfos", treeInfos);
    }
}

async function LockAction(ELFContract, LockContract, sender, targetAddress, amount) {
    logger.info(`Get ${sender} balance ...`);
    let balance = await contract.callViewMethod(
        ELFContract,
        'balanceOf',
        [sender]
    );
    logger.info(`User ${sender} balance : ${balance}`);

    let receiptedAmount = await CheckReceiptAmount(LockContract, sender);
    logger.info(`User ${sender} already receipted amount ${receiptedAmount}`)

    let totalAmount = await CheckTotalReceiptAmount(LockContract);
    logger.info(`Total receipted amount ${totalAmount}`)

    // let receiverBalance = await CheckReceiverBalance(LockContract, ELFContract);
    if (bigInt(balance) < bigInt(amount) && sender!== amy ) {
        let transfer = await contract.callSendMethod(
            ELFContract,
            'transfer',
            amy,
            [sender, amount]
        );
        logger.info(`transfer tx: ${transfer.transactionHash}: ${transfer.status}`);
        assert.strictEqual(transfer.status, true,
            `Transfer transaction is failed ...${transfer.error}`);

        balance = await contract.callViewMethod(
            ELFContract,
            'balanceOf',
            [sender]
        );
        logger.info(`After transfer user ${sender} balance : ${balance}`);
        // assert.strictEqual(afterBalance, balance + amount,
        //     `User balance is not expected ... actual:${afterBalance}, expected:${balance}`);
    }
    // approve to lock address
    let approve = await contract.callSendMethod(
        ELFContract,
        'approve',
        sender,
        [LockContract.address, amount]
    );
    logger.info(`approve tx: ${approve.transactionHash}: ${approve.status}`);

    // check allowance
    let allowance = await contract.callViewMethod(
        ELFContract,
        'allowance',
        [sender, LockContract.address]
    );
    logger.info(`spender ${LockContract.address}, owner ${sender}, allowance : ${allowance}`);
    await sleep(3000);

    let randomCode = amount % 3 === 0 ? "" : getRndString();
    // lock token:
    let createReceipt = await contract.callSendMethod(
        LockContract,
        'createReceipt',
        sender,
        [amount, targetAddress, randomCode]
    );
    logger.info(`createReceipt tx: ${createReceipt.transactionHash}: ${createReceipt.status}`);
    assert.strictEqual(createReceipt.status, true,
        `Transfer transaction is failed ...${createReceipt.error}`);

    let block = createReceipt.blockNumber;
    let events = await LockContract.getPastEvents('NewReceipt', {
        filter: {owner: sender},
        fromBlock: block - 5,
        toBlock: 'latest'
    });
    let createEvent = events[events.length - 1];
    let txId = createEvent.transactionHash;
    console.assert(txId === createReceipt.transactionHash,)
    let returnValues = createEvent.returnValues;
    logger.info(returnValues);
    console.assert(returnValues[3] === amount, 'amount is incorrect ...');

    let afterBalance = await contract.callViewMethod(
        ELFContract,
        'balanceOf',
        [sender]
    );
    logger.info(`User ${sender} balance : ${afterBalance}`);
    console.assert(BigInt(afterBalance) === BigInt(balance) - BigInt(amount), 'sender balance is incorrect ...');

    let afterReceiptedAmount = await CheckReceiptAmount(LockContract, sender);
    logger.info(`User ${sender} already receipted amount ${afterReceiptedAmount}`)
    console.assert(BigInt(afterReceiptedAmount) === BigInt(receiptedAmount) + BigInt(amount), 'sender receipt amount is incorrect ...');

    let afterTotalAmount = await CheckTotalReceiptAmount(LockContract);
    logger.info(`After lock total receipted amount ${afterTotalAmount}`)
    console.assert(BigInt(afterTotalAmount) === BigInt(totalAmount) + BigInt(amount), 'total receipt amount is incorrect ...');

    // let afterReceiverBalance = await CheckReceiverBalance(LockContract, ELFContract);
    // logger.info(`Receiver balance: ${afterReceiverBalance}`)
    // console.assert(BigInt(afterReceiverBalance) === BigInt(receiverBalance) + BigInt(amount), 'receiver balance is incorrect ...');

    // return returnValues[0];
}

async function CheckReceiverBalance(Contract, ELFContract) {
    let receiver = await contract.callViewMethod(
        Contract,
        'receiver'
    )
    let balance = await contract.callViewMethod(
        ELFContract,
        'balanceOf',
        [receiver]
    );
    logger.info(`${receiver} balance is ${balance}`);

    if (BigInt(balance) > BigInt(1000000000000000000000000)) {
        let amount = BigInt(1000000000000000000000000);
        logger.info(`Transfer ELF from ${receiver} to ${alice}`)
        let transfer = await contract.callSendMethod(
            ELFContract,
            'transfer',
            receiver,
            [alice, amount.toString()]
        );
        logger.info(`transfer tx: ${transfer.transactionHash}: ${transfer.status}`);
    }

    return balance;
}

async function CheckReceiptAmount(Contract, sender) {
    return await contract.callViewMethod(
        Contract,
        'getLockTokens',
        [sender]
    );
}

async function CheckTotalReceiptAmount(Contract) {
    return await contract.callViewMethod(
        Contract,
        'totalAmountInReceipts'
    );
}

async function RecordReceipts(MerkleContract) {
    let generatedTree = await contract.callSendMethod(
        MerkleContract,
        'recordReceipts',
        owner
    );
    logger.info(`recordReceipts tx: ${generatedTree.transactionHash}: ${generatedTree.status}`);
    assert.strictEqual(generatedTree.status, true,
        `generatedTree transaction is failed ...${generatedTree.error}`);
}

async function GetReceiptsAmount(LockContract, MerkleContract, exceptAmount) {
    let receiptsCounts = await GetReceiptCount(LockContract);
    logger.info(`Receipts counts ${receiptsCounts}`)
    let receiptCountInTree = await ReceiptCountInTree(MerkleContract);
    logger.info(`Receipt count in tree: ${receiptCountInTree}`)

    return Number(exceptAmount) - (Number(receiptsCounts) - Number(receiptCountInTree));
}

async function GetReceiptCount(LockContract) {
    return await contract.callViewMethod
    (
        LockContract,
        "receiptCount"
    );
}

async function ReceiptCountInTree(MerkleContract) {
    return await contract.callViewMethod
    (
        MerkleContract,
        "receiptCountInTree"
    );
}

async function GetTreeIndex(MerkleContract) {
    let treeCount = await GetTreeCount(MerkleContract);
    if (Number(treeCount) === Number(indexTree))
        return indexTree;
    return treeCount - indexTree;
}

async function GetTreeCount(MerkleContract) {
    return await contract.callViewMethod
    (
        MerkleContract,
        "merkleTreeCount"
    );
}

async function GetReceiptInfo(LockContract, id) {
    return contract.callViewMethod
    (
        LockContract,
        "getReceiptInfo",
        [id]
    );
}

async function GetReceipts(LockContract, id) {
    return contract.callViewMethod
    (
        LockContract,
        "receipts",
        [id]
    );
}

async function CheckTree(MerkleContract, LockContract) {
    let treeCount = await contract.callViewMethod
    (
        MerkleContract,
        "merkleTreeCount"
    );
    // assert.equal(tree+1, treeCount,`Expect tree ${tree+1}, actual ${treeCount}`);
    logger.info(`Tree counts ${treeCount}`)

    let receiptsCounts = await contract.callViewMethod
    (
        LockContract,
        "receiptCount"
    );
    logger.info(`Receipts counts ${receiptsCounts}`)
    let receiptCountInTree = await contract.callViewMethod
    (
        MerkleContract,
        "receiptCountInTree"
    );
    logger.info(`Receipt count in tree: ${receiptCountInTree}`)
    // assert.equal(receiptsCounts, receiptCountInTree);

    return treeCount;
}

async function GetTreeInfo(MerkleContract, index) {
    return await contract.callViewMethod
    (
        MerkleContract,
        "getMerkleTree",
        [index]
    );
}

async function GenerateMerklePath(MerkleContract, id) {
    return contract.callViewMethod
    (
        MerkleContract,
        "generateMerklePath",
        [id]
    );
}

async function GetTreeFile(MerkleContract, index) {
    let receiptIds = [];
    let TreeInfo = await GetTreeInfo(MerkleContract, index);
    let firstReceiptId = TreeInfo[1];
    let receiptCount = TreeInfo[2];
    for (let i = firstReceiptId; i < Number(firstReceiptId) + Number(receiptCount); i++)
        receiptIds.push(i);
    return receiptIds;
}

async function CheckAndFinishAction(LockContract, sender) {
    logger.info(sender);
    let accountReceipts = await contract.callViewMethod(
        LockContract,
        'getMyReceipts',
        [sender]
    );
    logger.info(accountReceipts);

    if (accountReceipts == '') return;
    let index = accountReceipts[accountReceipts.length - 1];
    logger.info(`check receipts index : ${index}`);

    let receiptsInfo = await contract.callViewMethod(
        LockContract,
        'getReceiptInfo',
        [index]
    );
    logger.info(receiptsInfo);

    let receiptCount = await contract.callViewMethod(
        LockContract,
        'receiptCount'
    )
    logger.info(`receipt count : ${receiptCount}`);


    for (let i = 0; i < accountReceipts.length; i++) {
        let id = accountReceipts[i];
        logger.info(`receipt id: ${id}`);
        let dateNow = (new Date().getTime()) / 1000;
        let receipts = await contract.callViewMethod(
            LockContract,
            'receipts',
            [id]
        );
        logger.info(dateNow);
        logger.info(receipts[5]);

        if (receipts[5] < dateNow && !receipts[6]) {
            // check total amount
            let totalAmount = await CheckTotalReceiptAmount(LockContract);
            logger.info(`before finish total receipted amount ${totalAmount}`);
            // finish
            let finishReceipt = await contract.callSendMethod(
                LockContract,
                'finishReceipt',
                sender,
                [id]
            );
            logger.info(`finishReceipt tx: ${finishReceipt.transactionHash}: ${finishReceipt.status}`);
            let block = finishReceipt.blockNumber;
            let events = await LockContract.getPastEvents('ReceiptFinished', {
                filter: {owner: sender},
                fromBlock: block - 5,
                toBlock: 'latest'
            });
            let finishEvent = events[events.length - 1];
            let returnValues = finishEvent.returnValues;
            logger.info(returnValues);
            console.assert(returnValues[0])

            receipts = await contract.callViewMethod(
                LockContract,
                'receipts',
                [id]
            );
            console.assert(receipts[6], 'finish failed ...');
            let amount = receipts[3];

            let afterTotalAmount = await CheckTotalReceiptAmount(LockContract);
            logger.info(`After finish total receipted amount ${afterTotalAmount}`)
            console.assert(BigInt(afterTotalAmount) === BigInt(totalAmount) + BigInt(amount), 'total receipt amount is incorrect ...');
        }

        let receiptsInfo = await contract.callViewMethod(
            LockContract,
            'getReceiptInfo',
            [id]
        );
        logger.info(receiptsInfo);
    }
}

async function writeJson(file, obj) {
    let json = JSON.stringify(obj);
    fs.writeFile(outputPath + `/${file}.json`, json, 'utf8', (err) => {
        if (err) {
            throw err;
        }
        console.log("JSON data is saved in", `${file}.json`);
    });
}

function getRndInteger(min, max) {
    return BigInt(Math.floor(Math.random() * (max - min + 1)) + min);
}

function getRndString() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
