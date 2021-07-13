const FactoryJson = require('../build/contracts/UniswapV2Factory.json');
const RouterJson = require('../build/contracts/UniswapV2Router02.json');
const PairJson = require('../build/contracts/UniswapV2Pair.json')
const TokenJson = require('../build/contracts/ERC20.json');
const TetherJson = require('../build/contracts/TetherToken.json');

const config = require('../truffle-config');
const info = require("../info.json");
const Web3 = require('web3');
const helper = require('./helper');
const logger = require('log-js')();
const BigNumber = require('bignumber.js')
const expect = require('chai').expect;

const MINIMUM_LIQUIDITY = 10 ** 3;

let web3;
let sendOptions = {from: info.addresses.test, gasPrice: config.networks.kovan.gasPrice};
let feeToAddress = info.addresses.feeTo;
let tester = info.addresses.test;
let routerList = [];
let factoryList = [];
let lpTokenList = [];
let gridList= [];
let token0;
let token1;

web3 = new Web3(config.networks.kovan.provider());

describe('Initialize', function () {
    this.timeout(200000);
    before(async function () {
        this.contractConfig = await helper.readJson("sashimi-grid");
        let kovanInfo = this.contractConfig["kovan"];

        for (var i in kovanInfo["factory"]) {
            let Factory = new web3.eth.Contract(FactoryJson.abi, kovanInfo["factory"][i]);
            factoryList.push(Factory);
        }

        for (var i in kovanInfo["router"]) {
            let Router = new web3.eth.Contract(RouterJson.abi, kovanInfo["router"][i]);
            routerList.push(Router);
        }

        let token0Address = kovanInfo["tokens"].find(i => i.name === "usdt");
        token0 = new web3.eth.Contract(TetherJson.abi, token0Address.address);
        let token1Address = kovanInfo["tokens"].find(i => i.name === "elf"); 
        token1 = new web3.eth.Contract(TokenJson.abi, token1Address.address);
    });

    it('set fee to address', async function () {
        for (let factory of factoryList) {
            let getAddress = await getFeeToAddress(factory);
            if (getAddress === feeToAddress)
                console.log(feeToAddress);
            else {
                let setFeeToAddress = await factory.methods.setFeeTo(feeToAddress).send(sendOptions);
                logger.info(`${setFeeToAddress.transactionHash} ==> status: ${setFeeToAddress.status}`)
                getAddress = await getFeeToAddress(factory);
                expect(getAddress.toString()).to.be.equal(feeToAddress.toString());
            }
        }
    });

    it('set fee rate: [5,30,100]', async function () {
        let rate = this.contractConfig["kovan"]["feeRate"];
        let i = 0;
        for (let router of routerList) {
            let getRate = await getFeeRate(router);
            if (getRate === "0") {
                let set = await router.methods.setFeeRate(rate[i]).send(sendOptions);
                logger.info(`${set.transactionHash} ==> status: ${set.status}`)
                getRate = await getFeeRate(router);
                expect(getRate.toString()).to.be.equal(rate[i]);
            }
            logger.info(`==== router: ${router.options.address} fee rate is ${getRate} ====`);
            i++;
        }
    });

    // The first test need set router
    it('set router', async function () {
        for (var router of routerList) {
            var getFactory = await router.methods.factory().call();
            logger.info(`==== ${router.options.address} factory is  ${getFactory} ====`)
            var factory = factoryList.find(l => l.options.address == getFactory)
            var setRouter = await factory.methods.setRouter(router.options.address).send(sendOptions);
            logger.info(`${setRouter.transactionHash} ==> status: ${setRouter.status}`);
        }
    });

    it('create pair and add liquidity', async function () {
        let i = 0;
        for (var factory of factoryList) {
            var pair = await getPair(factory);
            if (pair === "0x0000000000000000000000000000000000000000") {
                await createPair(factory);
                pair = await getPair(factory);
            }
            this.contractConfig["kovan"]["usdt-dai"][i] = pair;
            i++;
        }
        await helper.writeJsonSync("sashimi-grid", this.contractConfig);
    });
});

describe('add liquidity', function () {
    this.timeout(200000);
    beforeEach(async function () {
        this.contractConfig = await helper.readJson("sashimi-grid");
        let kovanInfo = this.contractConfig["kovan"];
        for (var i in kovanInfo["factory"]) {
            let gridInfo = {};
            let Factory = new web3.eth.Contract(FactoryJson.abi, kovanInfo["factory"][i]);
            let Router = new web3.eth.Contract(RouterJson.abi, kovanInfo["router"][i]);
            let lpToken = new web3.eth.Contract(PairJson.abi, kovanInfo["usdt-dai"][i]);
            let rate = kovanInfo["feeRate"][i];
            let kLast = kovanInfo["kLast"][i];
            gridInfo.rate = rate;
            gridInfo.factory = Factory;
            gridInfo.router = Router;
            gridInfo.lpToken = lpToken;
            gridInfo.kLast = kLast;
            gridList.push(gridInfo);
        }
        let token0Address = kovanInfo["tokens"].find(i => i.name === "elf");
        token0 = new web3.eth.Contract(TetherJson.abi, token0Address.address);
        let token1Address = kovanInfo["tokens"].find(i => i.name === "usdt");
        token1 = new web3.eth.Contract(TokenJson.abi, token1Address.address);
    });

    it('check lp token kLast', async function () {
        let i = 0;
        for (let grid of gridList) {
            let lpToken = grid.lpToken;
            let kLast = await lpToken.methods.kLast().call();
            grid.kLast = kLast;
            this.contractConfig["kovan"]["kLast"][i] = kLast;
            i++;
        }
        await helper.writeJsonSync("sashimi-grid", this.contractConfig);
    });

    it('add liquidity', async function () {
        for (let grid of gridList){
            let router = grid.router;
            let lpToken = grid.lpToken;
            // check fee rate
            let getRate = await getFeeRate(router);
            expect(getRate.toString()).to.be.equal(grid.rate);
            logger.info(`grid rate is :${getRate}`)
            // add liquidity
            // check balance and mint balance
            let token0Decimal = new BigNumber(await token0.methods.decimals().call());
            let token1Decimal = new BigNumber(await token1.methods.decimals().call());
            let token0Amount = (new BigNumber(10).times(10 ** token0Decimal)).integerValue().toFixed();

            // quote
            let reserve = await lpToken.methods.getReserves().call();
            let token1Amount
            if (new BigNumber(reserve[0]).lte(0) && new BigNumber(reserve[1]).lte(0))
                token1Amount = (new BigNumber(1000).times(10 ** token1Decimal)).integerValue().toFixed();
            else{
                token1Amount = new BigNumber(await router.methods.quote(token0Amount,reserve[0],reserve[1]).call()).toFixed();
            }
            logger.info(`${token0Amount}, ${token1Amount}`)

            await checkBalance(token0, tester, token0Amount);
            await checkBalance(token1, tester, token1Amount);
            await approve(token0, router.options.address, tester);
            await approve(token1, router.options.address, tester);

            let originToken0Balance = await getBalance(token0, tester);
            let originToken1Balance = await getBalance(token1, tester);
            let originLpTokenBalance = await getBalance(lpToken, tester);
            let token0OriginInRouter = await getBalance(token0, router.options.address);
            let token1OriginInRouter = await getBalance(token1, router.options.address);
            let token0OriginInPair = await getTokenInPair(router, lpToken.options.address, token0.options.address);
            let token1OriginInPair = await getTokenInPair(router, lpToken.options.address, token1.options.address);
            let feeToOriginBalance =  await getBalance(lpToken, feeToAddress);

            let totalSupply = new BigNumber(await lpToken.methods.totalSupply().call());
            let expectLPTokenAmount = totalSupply.eq(0) ?
                calculateLpTokenWithoutSupply(token0Amount, token1Amount) :
                (await calculateLpToken(lpToken, token0Amount, token1Amount, totalSupply)).integerValue();
            logger.info(`Expect to get Lp token : ${expectLPTokenAmount.toFixed()}`);
            logger.info(`Origin Lp balance : ${originLpTokenBalance}`);

            logger.info("==== add liquidity ====");
            let addLiquidity = await router.methods.addLiquidity(
                token0.options.address,
                token1.options.address,
                token0Amount,
                token1Amount,
                0,
                0,
                tester,
                info.deadline
            ).send(sendOptions);
            logger.info(`${addLiquidity.transactionHash} ==> status: ${addLiquidity.status}`)

            let lpTokenBalance = await lpToken.methods.balanceOf(tester).call();
            logger.info(`User lp token balance ${lpTokenBalance}`)
            let token0InRouter = await getBalance(token0, router.options.address);
            let token1InRouter = await getBalance(token1, router.options.address);
            let token0InPair = await getTokenInPair(router, lpToken.options.address, token0.options.address);
            let token1InPair = await getTokenInPair(router, lpToken.options.address, token1.options.address);
            let feeToBalance =  await getBalance(lpToken, feeToAddress);
            let afterLast = await lpToken.methods.kLast().call();
            logger.info(`${grid.kLast}`)
            logger.info(`${afterLast}`)
            //expect(lpTokenBalance.toString()).to.be.equal(new BigNumber(originLpTokenBalance).plus(expectLPTokenAmount).toFixed().toString());
            expect(new BigNumber(await getBalance(token0, tester)).eq(new BigNumber(originToken0Balance).minus(new BigNumber(token0Amount)))).to.be.ok;
            expect(new BigNumber(await getBalance(token1, tester)).eq(new BigNumber(originToken1Balance).minus(new BigNumber(token1Amount)))).to.be.ok;
            expect(new BigNumber(token0InRouter).eq(new BigNumber(token0Amount).plus(token0OriginInRouter))).to.be.ok;
            expect(new BigNumber(token1InRouter).eq(new BigNumber(token1Amount).plus(token1OriginInRouter))).to.be.ok;
            expect(new BigNumber(token0InPair).eq(new BigNumber(token0OriginInPair).plus(new BigNumber(token0Amount)))).to.be.ok;
            expect(new BigNumber(token1InPair).eq(new BigNumber(token1OriginInPair).plus(new BigNumber(token1Amount)))).to.be.ok;
        }
    });
});

describe('swap', function () {
    this.timeout(100000);
    before(async function () {
        this.contractConfig = await helper.readJson("sashimi-grid");
        let kovanInfo = this.contractConfig["kovan"];
        for (var i in kovanInfo["factory"]) {
            let gridInfo = {};
            let Factory = new web3.eth.Contract(FactoryJson.abi, kovanInfo["factory"][i]);
            let Router = new web3.eth.Contract(RouterJson.abi, kovanInfo["router"][i]);
            let lpToken = new web3.eth.Contract(PairJson.abi, kovanInfo["usdt-dai"][i]);
            let rate = kovanInfo["feeRate"][i];
            gridInfo.rate = rate;
            gridInfo.factory = Factory;
            gridInfo.router = Router;
            gridInfo.lpToken = lpToken;
            gridList.push(gridInfo);
        }
        let token0Address = kovanInfo["tokens"].find(i => i.name === "elf");
        token0 = new web3.eth.Contract(TetherJson.abi, token0Address.address);
        let token1Address = kovanInfo["tokens"].find(i => i.name === "usdt");
        token1 = new web3.eth.Contract(TokenJson.abi, token1Address.address);
    });

    it('0.05% fee rate swap', async function(){
        let grid = gridList.find(g => g.rate === "5");
        let router = grid.router;
        let lpToken = grid.lpToken;
        let amountInToken = token0;
        let amountOutToken = token1;
        let decimals = new BigNumber(await token0.methods.decimals().call());
        let amountIn = new BigNumber(10).times(10** decimals);
        let reserve = await lpToken.methods.getReserves().call();
        let reserve0 = reserve[0];
        let reserve1 = reserve[1];
        let expectAmountOut = await router.methods.getAmountOut(amountIn,reserve0,reserve1).call();
        let check = checkAmountOut(amountIn,expectAmountOut,reserve0,reserve1,grid.rate);
        expect(check).to.be.ok;
        let rate = checkFeeRate(expectAmountOut,reserve1,reserve0,amountIn);
        expect(rate.eq((new BigNumber(10000).minus(grid.rate)).div(10000).decimalPlaces(4)));

        let tokenInOriginAmount = await getBalance(amountInToken,tester);
        let tokenOutOriginAmount = await getBalance(amountOutToken,tester);
        let tokenInOriginInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutOriginInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInOriginInPair = await getTokenInPair(router, lpToken.options.address, amountInToken.options.address);
        let tokenOutOriginInPair = await getTokenInPair(router, lpToken.options.address, amountOutToken.options.address);

        logger.info("==== swap ====")
        let swap = await router.methods.swapExactTokensForTokens(
            amountIn,
            0,
            [amountInToken.options.address, amountOutToken.options.address],
            tester,
            info.deadline
        ).send(sendOptions);
        logger.info(`${swap.transactionHash} ==> status: ${swap.status}`)

        let tokenInInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInInPair = await getTokenInPair(router, lpToken.options.address, token0.options.address);
        let tokenOutInPair = await getTokenInPair(router, lpToken.options.address, token1.options.address);
        let afterReserve = await lpToken.methods.getReserves().call();

        expect(new BigNumber(afterReserve[0]).eq(new BigNumber(reserve0).plus(amountIn))).to.be.ok;
        expect(new BigNumber(afterReserve[1]).eq(new BigNumber(reserve1).minus(expectAmountOut))).to.be.ok;
        expect(new BigNumber(await getBalance(amountInToken, tester)).eq(new BigNumber(tokenInOriginAmount).minus(amountIn))).to.be.ok;
        expect(new BigNumber(await getBalance(amountOutToken, tester)).eq(new BigNumber(tokenOutOriginAmount).plus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInRouter).eq(amountIn.plus(tokenInOriginInRouter))).to.be.ok;
        expect(new BigNumber(tokenOutInRouter).eq(new BigNumber(tokenOutOriginInRouter).minus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInPair).eq(new BigNumber(tokenInOriginInPair).plus(amountIn))).to.be.ok;
        expect(new BigNumber(tokenOutInPair).eq(new BigNumber(tokenOutOriginInPair).minus(new BigNumber(expectAmountOut)))).to.be.ok;
    });

    it('0.3% fee rate swap', async function(){
        let grid = gridList.find(g => g.rate === "30");
        let router = grid.router;
        let lpToken = grid.lpToken;
        let amountInToken = token0;
        let amountOutToken = token1;
        let decimals = new BigNumber(await token0.methods.decimals().call());
        let amountIn = new BigNumber(10).times(10** decimals);
        let reserve = await lpToken.methods.getReserves().call();
        let reserve0 = reserve[0];
        let reserve1 = reserve[1];
        let expectAmountOut = await router.methods.getAmountOut(amountIn,reserve0,reserve1).call();
        let check = checkAmountOut(amountIn,expectAmountOut,reserve0,reserve1,grid.rate);
        expect(check).to.be.ok;
        let rate = checkFeeRate(expectAmountOut,reserve1,reserve0,amountIn);
        expect(rate.eq((new BigNumber(10000).minus(grid.rate)).div(10000).decimalPlaces(4)));

        let tokenInOriginAmount = await getBalance(amountInToken,tester);
        let tokenOutOriginAmount = await getBalance(amountOutToken,tester);
        let tokenInOriginInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutOriginInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInOriginInPair = await getTokenInPair(router, lpToken.options.address, amountInToken.options.address);
        let tokenOutOriginInPair = await getTokenInPair(router, lpToken.options.address, amountOutToken.options.address);

        logger.info("==== swap ====")
        let swap = await router.methods.swapExactTokensForTokens(
            amountIn,
            0,
            [amountInToken.options.address, amountOutToken.options.address],
            tester,
            info.deadline
        ).send(sendOptions);
        logger.info(`${swap.transactionHash} ==> status: ${swap.status}`)

        let tokenInInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInInPair = await getTokenInPair(router, lpToken.options.address, token0.options.address);
        let tokenOutInPair = await getTokenInPair(router, lpToken.options.address, token1.options.address);
        let afterReserve = await lpToken.methods.getReserves().call();

        expect(new BigNumber(afterReserve[0]).eq(new BigNumber(reserve0).plus(amountIn))).to.be.ok;
        expect(new BigNumber(afterReserve[1]).eq(new BigNumber(reserve1).minus(expectAmountOut))).to.be.ok;
        expect(new BigNumber(await getBalance(amountInToken, tester)).eq(new BigNumber(tokenInOriginAmount).minus(amountIn))).to.be.ok;
        expect(new BigNumber(await getBalance(amountOutToken, tester)).eq(new BigNumber(tokenOutOriginAmount).plus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInRouter).eq(amountIn.plus(tokenInOriginInRouter))).to.be.ok;
        expect(new BigNumber(tokenOutInRouter).eq(new BigNumber(tokenOutOriginInRouter).minus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInPair).eq(new BigNumber(tokenInOriginInPair).plus(amountIn))).to.be.ok;
        expect(new BigNumber(tokenOutInPair).eq(new BigNumber(tokenOutOriginInPair).minus(new BigNumber(expectAmountOut)))).to.be.ok;
    });

    it('1% fee rate swap', async function(){
        let grid = gridList.find(g => g.rate === "100");
        let router = grid.router;
        let lpToken = grid.lpToken;
        let amountInToken = token0;
        let amountOutToken = token1;
        let decimals = new BigNumber(await token0.methods.decimals().call());
        let amountIn = new BigNumber(10).times(10** decimals);
        let reserve = await lpToken.methods.getReserves().call();
        let reserve0 = reserve[0];
        let reserve1 = reserve[1];
        let expectAmountOut = await router.methods.getAmountOut(amountIn,reserve0,reserve1).call();
        let check = checkAmountOut(amountIn,expectAmountOut,reserve0,reserve1,grid.rate);
        expect(check).to.be.ok;
        let rate = checkFeeRate(expectAmountOut,reserve1,reserve0,amountIn);
        expect(rate.eq((new BigNumber(10000).minus(grid.rate)).div(10000).decimalPlaces(4)));

        let tokenInOriginAmount = await getBalance(amountInToken,tester);
        let tokenOutOriginAmount = await getBalance(amountOutToken,tester);
        let tokenInOriginInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutOriginInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInOriginInPair = await getTokenInPair(router, lpToken.options.address, amountInToken.options.address);
        let tokenOutOriginInPair = await getTokenInPair(router, lpToken.options.address, amountOutToken.options.address);

        logger.info("==== swap ====")
        let swap = await router.methods.swapExactTokensForTokens(
            amountIn,
            0,
            [amountInToken.options.address, amountOutToken.options.address],
            tester,
            info.deadline
        ).send(sendOptions);
        logger.info(`${swap.transactionHash} ==> status: ${swap.status}`)

        let tokenInInRouter = await getBalance(amountInToken, router.options.address);
        let tokenOutInRouter = await getBalance(amountOutToken, router.options.address);
        let tokenInInPair = await getTokenInPair(router, lpToken.options.address, token0.options.address);
        let tokenOutInPair = await getTokenInPair(router, lpToken.options.address, token1.options.address);
        let afterReserve = await lpToken.methods.getReserves().call();

        expect(new BigNumber(afterReserve[0]).eq(new BigNumber(reserve0).plus(amountIn))).to.be.ok;
        expect(new BigNumber(afterReserve[1]).eq(new BigNumber(reserve1).minus(expectAmountOut))).to.be.ok;
        expect(new BigNumber(await getBalance(amountInToken, tester)).eq(new BigNumber(tokenInOriginAmount).minus(amountIn))).to.be.ok;
        expect(new BigNumber(await getBalance(amountOutToken, tester)).eq(new BigNumber(tokenOutOriginAmount).plus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInRouter).eq(amountIn.plus(tokenInOriginInRouter))).to.be.ok;
        expect(new BigNumber(tokenOutInRouter).eq(new BigNumber(tokenOutOriginInRouter).minus(new BigNumber(expectAmountOut)))).to.be.ok;
        expect(new BigNumber(tokenInInPair).eq(new BigNumber(tokenInOriginInPair).plus(amountIn))).to.be.ok;
        expect(new BigNumber(tokenOutInPair).eq(new BigNumber(tokenOutOriginInPair).minus(new BigNumber(expectAmountOut)))).to.be.ok;
    });

});


async function getFeeRate(router) {
    var feeRate = await router.methods.feeRate().call();
    return feeRate;
}

async function getFeeToAddress(factory) {
    var feeTo = await factory.methods.feeTo().call();
    return feeTo;
}

async function createPair(factory) {
    var createResult = await factory.methods.createPair(token0.options.address, token1.options.address).send(sendOptions);
    logger.info(`${createResult.transactionHash} ==> status: ${createResult.status}`)
}

async function getPair(factory) {
    var getLpToken = await factory.methods.getPair(token0.options.address, token1.options.address).call();
    return getLpToken;
}

async function checkBalance(token, to, amount) {
    let balance = await token.methods.balanceOf(to).call();
    let symbol = await token.methods.symbol().call();
    if (new BigNumber(balance).lt(amount)) {
        let transferAmount = new BigNumber(amount).minus(balance).toFixed();
        if (symbol == "USDT") {
            let transfer = await token.methods.transfer(to, transferAmount).send(sendOptions);
            logger.info(`${transfer.transactionHash} ==> status: ${transfer.status}`)
        } else {
            let mint = await token.methods.mint(to, transferAmount).send(sendOptions);
            logger.info(`${mint.transactionHash} ==> status: ${mint.status}`)
        }
    }
    balance = await token.methods.balanceOf(to).call();
    logger.info(`${symbol} balance is :${balance}`)
}

async function getBalance(token, user) {
    return (await token.methods.balanceOf(user).call());
}

async function getTokenInPair(router, lpTokenAddress, token) {
    return (await router.methods.getTokenInPair(lpTokenAddress, token).call())
}


async function approve(token, spender, to) {
    let symbol = await token.methods.symbol().call();
    let decimal = await token.methods.decimals().call();
    let allowance = await token.methods.allowance(to, spender).call();
    if (new BigNumber(allowance).lte(0)) {
        let amount = (new BigNumber(10000000000)).times(10 ** decimal).minus(allowance).toFixed();
        let approve = await token.methods.approve(spender, amount).send(sendOptions);
        logger.info(`${approve.transactionHash} ==> status: ${allowance.status}`)
        allowance = await token.methods.allowance(to, spender).call();
    }
    logger.info(`${symbol} allowance is :${allowance}`)
}

function calculateLpTokenWithoutSupply(amount0, amount1) {
    var calculate = (new BigNumber(amount0).times(amount1)).sqrt().minus(MINIMUM_LIQUIDITY);
    return calculate;
}

async function calculateLpToken(lpToken, amount0, amount1, totalSupply) {
    let reserve = await lpToken.methods.getReserves().call();
    let reserve0 = new BigNumber(reserve[0]);
    let reserve1 = new BigNumber(reserve[1]);
    let a = new BigNumber(amount0).times(totalSupply).div(reserve0);
    let b = new BigNumber(amount1).times(totalSupply).div(reserve1);
    return BigNumber.minimum([a, b]);
}

function checkAmountOut(amountIn, exceptAmountOut, reserveIn, reserveOut, feeRate) {
    let K = new BigNumber(reserveIn).times(reserveOut);
    logger.info(K.toFixed())
    let p = (new BigNumber(10000).minus(feeRate)).div(10000);
    let x = new BigNumber(reserveIn).plus(p.times(new BigNumber(amountIn)));
    let y = new BigNumber(reserveOut).minus(exceptAmountOut);
    //精度损失
    let K1 = x.times(y);
    let K1_1 = x.times(y.minus(1));
    logger.info(`${K1.toFixed()}`);
    logger.info(`${K1_1.toFixed()}`);
    let check = K.gte(K1_1) && K.lte(K1);
    return check;
}

function checkFeeRate(expectAmountOut,reserveOut,reserveIn,amountIn){
    let noFeeAmountOut = new BigNumber(amountIn).times(reserveOut).div(new BigNumber(reserveIn).plus(amountIn));
    let rate = new BigNumber(expectAmountOut).div(noFeeAmountOut);
    logger.info(rate.toFixed());
    return rate.decimalPlaces(4);
}