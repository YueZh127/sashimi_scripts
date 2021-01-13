const ElfTokenABI = require('../abi/elfTokenAbi.json');
const LockJson = require('../build/contracts/LockMapping.json');
const MerkleJson = require('../build/contracts/MerkleTreeGenerator.json');
const ReceiptMakerJson = require('../build/contracts/ReceiptMaker.json');
const LockABI = LockJson["abi"];
const MerkleABI = MerkleJson["abi"];
const ReceiptMakerABI = ReceiptMakerJson["abi"];

const info = require('../info.json');

const contractsABI = {
    ELFToken: ElfTokenABI,
    Lock: LockABI,
    Merkle: MerkleABI,
    ReceiptMaker: ReceiptMakerABI
};

async function initContract(contractName, web3, contractAddress, contractABI = null) {
    let contactABITemp = contractABI || contractsABI[contractName];
    this.contract = new web3.eth.Contract(contactABITemp, contractAddress);
    this.contract.address = contractAddress;
    this.contract.defaultAccount = web3.defaultAccount;
    return this.contract
}

async function callViewMethod(contract,functionName, paramsOption) {
    try {
        if (paramsOption) {
            return await contract.methods[functionName](...paramsOption).call();
        }
        return await contract.methods[functionName]().call();
    } catch (e) {
        return {
            error: e
        };
    }
}

async function callSendMethod(contract, functionName, account, paramsOption) {
    try {
        console.log(paramsOption);

        if (paramsOption) {
            return await contract.methods[functionName](...paramsOption).send({
                from: account,
                gas: info.gasInfo.gas,
                gasPrice: info.gasInfo.gasPrice
            });
        }
        return await contract.methods[functionName]().send({
            from: account,
            gas: info.gasInfo.gas,
            gasPrice: info.gasInfo.gasPrice
        });
    } catch (e) {
        console.log('callSendMethod: ', e);
        return {
            error: e
        };
    }
}


module.exports = {
    initContract: initContract,
    callViewMethod: callViewMethod,
    callSendMethod: callSendMethod
}