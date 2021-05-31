const TokenJson = require('../build/contracts/ERC20.json');
const LockJson = require('../build/contracts/LockMapping.json');
const MerkleJson = require('../build/contracts/MerkleTreeGenerator.json');
const ReceiptMakerJson = require('../build/contracts/ReceiptMaker.json');
const DistributorJson = require('../build/contracts/MerkleDistributor.json');
const CrossChainJson = require('../build/contracts/CrossChain.json');
const OracleJson = require('../build/contracts/AccessControlledOffchainAggregator.json');
const FundPoolJson = require('../build/contracts/FundPoolDelegate.json');
const ControllerJson = require('../build/contracts/Controller.json');
const StrategyJson = require('../build/contracts/FarmStrategy.json');

const TokenABI = TokenJson["abi"];
const LockABI = LockJson["abi"];
const MerkleABI = MerkleJson["abi"];
const ReceiptMakerABI = ReceiptMakerJson["abi"];
const DistributorABI = DistributorJson["abi"];
const CrossChainABI = CrossChainJson["abi"];
const OracleABI = OracleJson["abi"];
const FundPoolABI = FundPoolJson["abi"];
const ControllerABI = ControllerJson["abi"];
const StrategyABI = StrategyJson["abi"];

const info = require('../info.json');

const contractsABI = {
    ERC20Token: TokenABI,
    Lock: LockABI,
    Merkle: MerkleABI,
    ReceiptMaker: ReceiptMakerABI,
    Distributor: DistributorABI,
    CrossChain: CrossChainABI,
    Oracle: OracleABI,
    FundPool: FundPoolABI,
    Controller: ControllerABI,
    Strategy: StrategyABI
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

async function callSendMethod(contract, functionName, account, paramsOption,value =0) {
    try {
        console.log(paramsOption);

        if (paramsOption) {
            return await contract.methods[functionName](...paramsOption).send({
                from: account,
                gas: info.gasInfo.gas,
                gasPrice: info.gasInfo.gasPrice,
                value: value
            });
        }
        return await contract.methods[functionName]().send({
            from: account,
            gas: info.gasInfo.gas,
            gasPrice: info.gasInfo.gasPrice,
            value: value
        });
    } catch (e) {
        console.log('callSendMethod: ', e);
        return {
            error: e
        };
    }
}

function callSendMethodWithOutResult(contract, functionName, account, paramsOption,nonce,value =0) {
    try {
        console.log(paramsOption);

        if (paramsOption) {
            return contract.methods[functionName](...paramsOption).send({
                from: account,
                gas: info.gasInfo.gas,
                gasPrice: info.gasInfo.gasPrice,
                value: value,
                nonce:nonce
            });
        }
        return contract.methods[functionName]().send({
            from: account,
            gas: info.gasInfo.gas,
            gasPrice: info.gasInfo.gasPrice,
            value: value
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
    callSendMethod: callSendMethod,
    callSendMethodWithOutResult:callSendMethodWithOutResult
}