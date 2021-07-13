const TokenJson = require('../build/contracts/ERC20.json');
const TetherJson = require('../build/contracts/TetherToken.json');
const WETH9Json = require('../build/contracts/WETH9.json')

const SashimiFactory = require('../build/contracts/UniswapV2Factory.json')
const SashimiRouter = require('../build/contracts/UniswapV2Router02.json')
const PairJson = require('../build/contracts/UniswapV2Pair.json');

const TokenABI = TokenJson["abi"];
const TetherABI = TetherJson["abi"];
const WETHABI = WETH9Json["abi"]

const FactoryABI = SashimiFactory["abi"];
const RouterABI = SashimiRouter["abi"];
const PairABI = PairJson["abi"];

const info = require('../info.json');

const contractsABI = {
    ERC20Token: TokenABI,
    Tether: TetherABI,
    WETH: WETHABI,

    Factory: FactoryABI,
    Router: RouterABI,
    Pair: PairABI
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

function callSendMethodWithoutResult(contract, functionName, account, paramsOption,nonce,value =0) {
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
    callSendMethodWithoutResult:callSendMethodWithoutResult
}