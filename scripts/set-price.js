const contract = require("./basicContract");
const config = require('../truffle-config');
const info = require("../info.json");
const Web3 = require('web3');
const helper = require('./helper');
const BigNumber = require('bignumber.js');
const logger = require('log-js')();
const priceInfo = require('./data/price-info.json');


let web3;
let sendOptions = {from: info.addresses.test, gasPrice: config.networks.kovan.gasPrice};
let sendOwnerOptions = {from: info.addresses.wang, gasPrice: config.networks.kovan.gasPrice};

(async () => {
    try {
        let contractInfos = await helper.readJson("contract-config.json");
        let kovanInfo = contractInfos["kovan"];
        let mdxAdd = kovanInfo["tokens"].find(i => i.name === "mdx");
        let ethAdd = kovanInfo["tokens"].find(i => i.name === "eth");
        let usdtAdd = kovanInfo["tokens"].find(i => i.name === "usdt");

        web3 = new Web3(config.networks.kovan.provider());
        let tokenList = [];
        let mdx = await contract.initContract("MdxToken", web3, mdxAdd.address);
        let eth = await contract.initContract("ERC20Token", web3, ethAdd.address);
        let usdt = await contract.initContract("Tether", web3, usdtAdd.address);
        tokenList.push(mdx);
        tokenList.push(eth);
        tokenList.push(usdt)

        let factory = await contract.initContract("Factory", web3, kovanInfo["factory"]);
        let router = await contract.initContract("Router", web3, kovanInfo["router"]);

        let mdx_usdt = await contract.initContract("Pair", web3, kovanInfo["lp"]["mdx-usdt"]);
        let eth_usdt = await contract.initContract("Pair", web3, kovanInfo["lp"]["usdt-eth"]);
        //current price
        let changeToken = priceInfo.token;
        let anchorToken = priceInfo.anchorToken;
        let tokenInfos = [];
        let currentPriceInfo = {};
        tokenInfos.push(await getTokenInfos(mdx_usdt));
        tokenInfos.push(await getTokenInfos(eth_usdt));

        for (let tokenInfo of tokenInfos) {
            let symbol0 = kovanInfo["tokens"].find(i => i.address.toLowerCase() === tokenInfo.token0.toLowerCase()).name;
            let symbol1 = kovanInfo["tokens"].find(i => i.address.toLowerCase() === tokenInfo.token1.toLowerCase()).name;

            let amount0 = symbol0 === "usdt" ? (new BigNumber(tokenInfo.reserve0).times(10 ** 12)).integerValue().toFixed() : tokenInfo.reserve0;
            let amount1 = symbol1 === "usdt" ? (new BigNumber(tokenInfo.reserve1).times(10 ** 12)).integerValue().toFixed() : tokenInfo.reserve1;
            let price0 = (new BigNumber(amount1)).div(new BigNumber(amount0));
            let price1 = (new BigNumber(amount0)).div(new BigNumber(amount1));

            if ((symbol0 === changeToken && symbol1 === anchorToken) || (symbol1 === changeToken && symbol0 === anchorToken)) {
                currentPriceInfo.changeToken = changeToken;
                currentPriceInfo.anchorToken = anchorToken;
                currentPriceInfo.anchorTokenAddress = symbol0 === anchorToken ? tokenInfo.token0 : tokenInfo.token1;
                currentPriceInfo.changeTokenAddress = symbol1 === changeToken ? tokenInfo.token1 : tokenInfo.token0;
                currentPriceInfo.anchorPrice = symbol0 === anchorToken ? price0 : price1;
                currentPriceInfo.changePrice = symbol1 === changeToken ? price1 : price0;
                currentPriceInfo.anchorReserve = symbol0 === anchorToken ? tokenInfo.reserve0 : tokenInfo.reserve1;
                currentPriceInfo.chanageReserve = symbol1 === changeToken ? tokenInfo.reserve1 : tokenInfo.reserve0;
                logger.info("==== current price  ==== ");
                logger.info(`${changeToken} : ${currentPriceInfo.changePrice}`);
                logger.info(`${anchorToken} : ${currentPriceInfo.anchorPrice}`);
                logger.info(`${changeToken} : ${currentPriceInfo.chanageReserve}`);
                logger.info(`${anchorToken} : ${currentPriceInfo.anchorReserve}`);
            }
        }
        logger.info(``)
        let p = 1 - priceInfo.loss;
        let wantPrice = currentPriceInfo.changePrice.times(p);
        logger.info(`want ${currentPriceInfo.changeToken} price: ${wantPrice}`)
        let amountIn;
        let amountOut;
        amountIn = helper.helperMethod(
            0.997, 1.997 * currentPriceInfo.chanageReserve,
            currentPriceInfo.chanageReserve * currentPriceInfo.chanageReserve * ((p - 1) / p));
        if (amountIn === null){logger.info("Wrong data");process.exit()}
        amountOut = await router.methods.getAmountOut(
            (new BigNumber(amountIn)).integerValue().toFixed(),
            currentPriceInfo.chanageReserve,
            currentPriceInfo.anchorReserve,
            currentPriceInfo.changeTokenAddress,
            currentPriceInfo.anchorTokenAddress
        ).call();


        logger.info(`${amountIn.toFixed()} ${amountOut}`)

        await checkBalance(currentPriceInfo.changeTokenAddress, (new BigNumber(amountIn)).toFixed(), tokenList);
        await approve(currentPriceInfo.anchorTokenAddress, router, (new BigNumber(amountOut)).toFixed(), tokenList);

        let swap = await router.methods.swapExactTokensForTokens(
            (new BigNumber(amountIn)).integerValue().toFixed(), 0,
            [currentPriceInfo.changeTokenAddress, currentPriceInfo.anchorTokenAddress],
            info.addresses.test,
            info.deadline
        ).send(sendOptions);
        logger.info(`${swap.transactionHash} ==> status: ${swap.status}`)

        // check change price
        let afterTokenInfos = [];
        afterTokenInfos.push(await getTokenInfos(mdx_usdt));
        afterTokenInfos.push(await getTokenInfos(eth_usdt));

        for (let after of afterTokenInfos) {
            let symbol0 = kovanInfo["tokens"].find(i => i.address.toLowerCase() === after.token0.toLowerCase()).name;
            let symbol1 = kovanInfo["tokens"].find(i => i.address.toLowerCase() === after.token1.toLowerCase()).name;

            let amount0 = symbol0 === "usdt" ? (new BigNumber(after.reserve0).times(10 ** 12)).integerValue().toFixed() : after.reserve0;
            let amount1 = symbol1 === "usdt" ? (new BigNumber(after.reserve1).times(10 ** 12)).integerValue().toFixed() : after.reserve1;
            let price0 = (new BigNumber(amount1)).div(new BigNumber(amount0));
            let price1 = (new BigNumber(amount0)).div(new BigNumber(amount1));
            logger.info(`${symbol0}: ${price0} ${symbol1}`)
            logger.info(`${symbol1}: ${price1} ${symbol0}`)
        }
    }catch (e) {
        console.log(e);
    }
    process.exit();
})();

async function getTokenInfos(lpAddress) {
    let tokenInfo = {};
    let token0 = await lpAddress.methods.token0().call();
    let token1 = await lpAddress.methods.token1().call();
    let reservesInfo = await lpAddress.methods.getReserves().call();
    tokenInfo.token0 = token0;
    tokenInfo.token1 = token1;
    tokenInfo.reserve0 = reservesInfo[0];
    tokenInfo.reserve1 = reservesInfo[1];
    return tokenInfo;
}

async function checkBalance(token, amount, tokenList) {
    let tokenContract = await getTokenContract(token, tokenList);
    let balance = await tokenContract.methods.balanceOf(info.addresses.test).call();
    let symbol = await tokenContract.methods.symbol().call();
    if (new BigNumber(balance).lt((new BigNumber(amount)))) {
        if (symbol == "USDT") {
            let issue = await tokenContract.methods.issue(amount).send(sendOwnerOptions);
            logger.info(`${issue.transactionHash} ==> status: ${issue.status}`)
            let transfer = await tokenContract.methods.transfer(info.addresses.test, amount).send(sendOwnerOptions);
            logger.info(`${transfer.transactionHash} ==> status: ${transfer.status}`)
        } else {
            let mint = await tokenContract.methods.mint(info.addresses.test, amount).send(sendOptions);
            logger.info(`${mint.transactionHash} ==> status: ${mint.status}`)
        }
    }
    balance = await tokenContract.methods.balanceOf(info.addresses.test).call();
    logger.info(`${symbol} balance is :${balance}`)
}

async function approve(token, router, amount, tokenList) {
    let tokenContract = await getTokenContract(token, tokenList);
    let symbol = await tokenContract.methods.symbol().call();
    let allowance = await tokenContract.methods.allowance(info.addresses.test, router.options.address).call();
    if (new BigNumber(allowance).lte(amount)) {
        let approve = await tokenContract.methods.approve(router.options.address, amount).send(sendOptions);
        logger.info(`${approve.transactionHash} ==> status: ${allowance.status}`)
        allowance = await tokenContract.methods.allowance(info.addresses.test, router.options.address).call();
    }
    logger.info(`${symbol} allowance is :${allowance}`)
}

async function getTokenContract(token, tokenList) {
    let tokenContract;
    for (let t of tokenList) {
        tokenContract = t.options.address.toLowerCase() === token.toLowerCase() ? t : null;
        if (tokenContract !== null)
            return tokenContract
    }
}