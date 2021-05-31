const info = require('../controllerInfo.json');
const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const contract = require("./basicContract");
const logger = require('log-js')();
const argv = require('minimist')(process.argv.slice(2), {
    string: ['network']
});
const controller = contracts.kovan.controller;

const owner = keys.address.wang;
const tester = keys.address.test;
const symbols = info.symbol;

let tokenAddresses = [];
let flexible = [];
let fixed = [];
let poolsInfo = [];

module.exports = async function () {

    logger.info(`network: ${argv['network']}\n`
        + `owner: ${owner}`);
    let web3;
    let Controller;
    let fundContracts = [];
    let strategyContracts = [];
    let senderPkey = keys.keys.WANG;

    let fundPools = info.poolInfo;
    let strategies = info.strategyInfo;

    if (argv['network'] === 'kovan') {
        web3 = await providers.useKovanProvider(senderPkey);
        await providers.addAccount(web3, keys.keyList);
        Controller = await contract.initContract('Controller', web3, controller);
        for (let i = 0; i < fundPools.length; i++) {
            let fundContract = await contract.initContract('FundPool', web3, fundPools[i]);
            fundContracts.push(fundContract);
        }
        for (let i = 0; i < strategies.length; i++) {
            let strategyContract = await contract.initContract('Strategy', web3, strategies[i]);
            strategyContracts.push(strategyContract);
        }
    }

    // set Strategist
    logger.info('=== set strategist ===')
    let strategist = await contract.callViewMethod(
        Controller,
        'strategist'
    )
    logger.info(strategist)
    if (strategist !== tester) {
        let setStrategist = await contract.callSendMethod(
            Controller,
            'setStrategist',
            owner,
            [tester]
        );
        logger.info(`setStrategist tx: ${setStrategist.transactionHash}: ${setStrategist.status}`);
        let strategist = await contract.callViewMethod(
            Controller,
            'strategist'
        )
        logger.info(strategist)
        console.assert(strategist === tester, `actual strategist is ${strategist}`);
    }

    //set pool
    // check pool symbol, type
    logger.info('=== check pool ===')
    await GetPools(Controller);

    logger.info('=== set pool ===')
    for (const fc of fundContracts) {
        await SetPool(fc,Controller)
    }
    await GetPools(Controller);

    logger.info('=== add strategy ===')
    for (const s of strategyContracts){
        await AddStrategy(Controller,s.address);
    }

    logger.info('=== set strategy ===')
    for (const s of strategyContracts){
        // check strategy symbol
        let tokens = await CheckTokenPair(s);
        for (let pools of poolsInfo){
            if (tokens.includes(pools.symbol)){
                await SetStrategy(Controller,s.address,pools.pool)
            }
        }
    }
    console.log(`end`);
}


async function SetPool(fundPool, controller){
    let fcToken = await contract.callViewMethod(
        fundPool,
        'token',
    );
    logger.info(`pool ${fundPool.address} token symbol is ${fcToken}`)
    if (!isInSymbolList(fcToken)){
        logger.error(` pool ${fundPool.address} does not set except symbol`);
        return;
    }
    let poolType = await contract.callViewMethod(
        fundPool,
        'profitRatePerBlock'
    );
    if (poolType == 0 && !flexible.includes(fundPool.address))
    {
        let setPool = await contract.callSendMethod(
            controller,
            'setPool',
            tester,
            [fcToken, fundPool.address]
        );
        logger.info(`setPool tx: ${setPool.transactionHash}: ${setPool.status}`);
        let getFlexible = await contract.callViewMethod(
            controller,
            'getFlexiblePools',
        );
        console.assert(getFlexible.includes(fundPool.address), `${fundPool} didn't set flexiblePools`)
    }
    else if (poolType != 0 && !fixed.includes(fundPool.address))
    {
        let setPool = await contract.callSendMethod(
            controller,
            'setPool',
            tester,
            [fcToken, fundPool.address]
        );
        logger.info(`setPool tx: ${setPool.transactionHash}: ${setPool.status}`);
        let getFixed = await contract.callViewMethod(
            controller,
            'getFixedPools',
        );
        console.assert(getFixed.includes(fundPool.address), `${fundPool} didn't set fixedPools`)
    }
    else {
       logger.info(`${fundPool.address} already set.`)
    }
    let info = {"symbol": fcToken,"pool": fundPool.address}
    poolsInfo.push(info)
}

async function GetPools(controller){
    let getFlexible = await contract.callViewMethod(
        controller,
        'getFlexiblePools',
    );
    let getFixed = await contract.callViewMethod(
        controller,
        'getFixedPools',
    );
    flexible = getFlexible;
    fixed = getFixed;

    logger.info(`Flexible pools: ${flexible}`)
    logger.info(`Fixed pools: ${fixed}`)
}

async function AddStrategy(controller,strategyContract){
    let getStrategies = await contract.callViewMethod(
        controller,
        'getStrategies'
    )
    if (getStrategies.includes(strategyContract)) return;
    let result = await contract.callSendMethod(
        controller,
        'addStrategy',
        owner,
        [strategyContract]
    );
    logger.info(`addStrategy tx: ${result.transactionHash}: ${result.status}`);
    getStrategies = await contract.callViewMethod(
        controller,
        'getStrategies'
    )
    console.assert(getStrategies.includes(strategyContract),`Strategy add failed`)
    logger.info(`Strategy: ${getStrategies}`)
}

async function SetStrategy(controller,strategyContract,fundPool){
    let check = await contract.callViewMethod(
        controller,
        'approvedStrategies',
        [fundPool,strategyContract]
    )
    if (check != 0)
    {
        logger.info(`pool: ${fundPool} ==== strategy: ${strategyContract} already set`)
        return;
    }
    let result =  await contract.callSendMethod(
        controller,
        'setStrategy',
        owner,
        [fundPool,strategyContract]
    )
    logger.info(`setStrategy tx: ${result.transactionHash}: ${result.status}`);
}

async function CheckTokenPair(strategyContract){
    let tokens = [];
    let token0 = await contract.callViewMethod(
        strategyContract,
        'token0'
    );
    let token1 = await contract.callViewMethod(
        strategyContract,
        'token1'
    );
    tokens.push(token0);
    tokens.push(token1);
    return tokens;
}


function isInSymbolList(token){
    Object.values(symbols).forEach(function (address) {tokenAddresses.push(address.toLowerCase())});
    return tokenAddresses.includes(token.toLowerCase())
}