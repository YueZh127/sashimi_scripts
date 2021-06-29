const contract = require("./basicContract");
const config = require('../truffle-config');
const info = require("../info.json");
const Web3 = require('web3');
const helper = require('./helper');
const BigNumber = require('bignumber.js')
const logger = require('log-js')();


let web3;
let bscWeb3;
let sendOptions = {from: info.addresses.test, gasPrice: config.networks.kovan.gasPrice};
let sendOwnerOptions = {from: info.addresses.wang, gasPrice: config.networks.kovan.gasPrice};

(async () => {
    try {
        let contractInfos = await helper.readJson("contract-config.json");
        let kovanInfo = contractInfos["kovan"];
        let bscInfo = contractInfos["bsc"];

        let mdxAdd = kovanInfo["tokens"].find(i => i.name === "mdx");
        let ethAdd = kovanInfo["tokens"].find(i => i.name === "eth");
        let usdtAdd = kovanInfo["tokens"].find(i => i.name === "usdt");
        let bsc_mdxAdd = bscInfo["tokens"].find(i => i.name === "mdx");
        let bsc_ethAdd = bscInfo["tokens"].find(i => i.name === "eth");
        let bsc_usdtAdd = bscInfo["tokens"].find(i => i.name === "usdt");

        web3 = new Web3(config.networks.kovan.provider());
        bscWeb3 = new Web3(config.networks.bsc.provider());

        logger.info("==== get contracts ====")
        logger.info("==== kovan ====")
        let factory = await contract.initContract("Factory", web3, kovanInfo["factory"]);
        let router = await contract.initContract("Router", web3, kovanInfo["router"]);
        let farm = await contract.initContract("Farm", web3, kovanInfo["farm"]);
        let boardRoomMDX = await contract.initContract("BoardMDX", web3, kovanInfo["boardRoomMDX"]);
        let mdx = await contract.initContract("MdxToken", web3, mdxAdd.address);
        let eth = await contract.initContract("ERC20Token", web3, ethAdd.address);
        let usdt = await contract.initContract("Tether", web3, usdtAdd.address);

        logger.info("==== bsc ====")
        let bsc_factory = await contract.initContract("Factory", bscWeb3, bscInfo["factory"]);
        let  bsc_router = await contract.initContract("Router", bscWeb3, bscInfo["router"]);
        let bsc_farm = await contract.initContract("Farm", bscWeb3, bscInfo["farm"]);
        let bsc_mdx = await contract.initContract("MdxToken", bscWeb3, bsc_mdxAdd.address);
        let bsc_eth = await contract.initContract("ERC20Token", bscWeb3, bsc_ethAdd.address);
        let bsc_usdt = await contract.initContract("Tether", bscWeb3, bsc_usdtAdd.address);

        logger.info("==== get MDX LP token info on bsc ====")

        let bsc_mdx_usdt = await contract.initContract("Pair", bscWeb3, bscInfo["lp"]["mdx-usdt"]);
        let bsc_eth_usdt = await contract.initContract("Pair", bscWeb3, bscInfo["lp"]["usdt-eth"]);
        let tokenInfos = [];
        tokenInfos.push(await getTokenInfos(bsc_mdx_usdt));
        tokenInfos.push(await getTokenInfos(bsc_eth_usdt));

        let reservesInfos = [];
        for (let tokenInfo of tokenInfos) {
            let reservesInfo = {};
            let symbol0 = bscInfo["tokens"].find(i => i.address.toLowerCase() === tokenInfo.token0.toLowerCase()).name;
            let symbol1 = bscInfo["tokens"].find(i => i.address.toLowerCase() === tokenInfo.token1.toLowerCase()).name;

            reservesInfo.symbol0 = symbol0;
            reservesInfo.symbol1 = symbol1;
            reservesInfo.amount0 = symbol0 === "usdt" ? (new BigNumber(tokenInfo.reserve0).div(10 ** 12)).integerValue().toFixed() : tokenInfo.reserve0;
            reservesInfo.amount1 = symbol1 === "usdt" ? (new BigNumber(tokenInfo.reserve1).div(10 ** 12)).integerValue().toFixed() : tokenInfo.reserve1;

            logger.info("==== price on bsc ==== ");
            logger.info(`${symbol0} price: ${(new BigNumber(tokenInfo.reserve1).div(new BigNumber(tokenInfo.reserve0))).toFixed()}${reservesInfo.symbol1}`);
            logger.info(`${symbol1} price: ${(new BigNumber(tokenInfo.reserve0).div(new BigNumber(tokenInfo.reserve1))).toFixed()}${reservesInfo.symbol0}`);
            reservesInfos.push(reservesInfo);
        }
        //
        await checkBalance(usdt);
        await checkBalance(eth);
        await checkBalance(mdx);
        await approve(usdt, kovanInfo["router"]);
        await approve(eth, kovanInfo["router"]);
        await approve(mdx, kovanInfo["router"]);

        let lp = [];
        for (let reservesInfo of reservesInfos) {
            let token0 = kovanInfo["tokens"].find(i => i.name === reservesInfo.symbol0);
            let token1 = kovanInfo["tokens"].find(i => i.name === reservesInfo.symbol1);
            let pair = await getPair(factory, token0.address, token1.address);
            let pairInfo = {};
            if (pair === "0x0000000000000000000000000000000000000000") {
                logger.info("==== create kovan LP token && add liquidity====")
                let addLiquidity = await router.methods.addLiquidity(
                    token0.address,
                    token1.address,
                    reservesInfo.amount0,
                    reservesInfo.amount1,
                    0,
                    0,
                    info.addresses.test,
                    info.deadline
                ).send(sendOptions);
                logger.info(`${addLiquidity.transactionHash} ==> status: ${addLiquidity.status}`)
                pair = await getPair(factory, token0.address, token1.address);
            }
            logger.info(`${reservesInfo.symbol0}-${reservesInfo.symbol1} ===> ${pair}`)
            pairInfo.lpToken = pair;
            pairInfo.token0 = reservesInfo.symbol0;
            pairInfo.token1 = reservesInfo.symbol1;
            lp.push(pairInfo);
            let lpAddress = await contract.initContract("Pair", web3, pair);
            let kovanTokenInfo = await getTokenInfos(lpAddress);
            logger.info("==== price on kovan ==== ");
            kovanTokenInfo.token0.toLowerCase() === usdtAdd.address.toLowerCase() ? kovanTokenInfo.reserve0 = (new BigNumber(kovanTokenInfo.reserve0)).times(10 ** 12).toFixed() : kovanTokenInfo.reserve0;
            kovanTokenInfo.token1.toLowerCase() === usdtAdd.address.toLowerCase() ? kovanTokenInfo.reserve1 = (new BigNumber(kovanTokenInfo.reserve1)).times(10 ** 12).toFixed() : kovanTokenInfo.reserve1;
            let symbol0 = kovanInfo["tokens"].find(i=> i.address.toLowerCase() === kovanTokenInfo.token0.toLowerCase()).name;
            let symbol1 = kovanInfo["tokens"].find(i=> i.address.toLowerCase() === kovanTokenInfo.token1.toLowerCase()).name;

            logger.info(`${symbol0} price: ${(new BigNumber(kovanTokenInfo.reserve1).div(new BigNumber(kovanTokenInfo.reserve0))).toFixed()}${symbol1}`);
            logger.info(`${symbol1} price: ${(new BigNumber(kovanTokenInfo.reserve0).div(new BigNumber(kovanTokenInfo.reserve1))).toFixed()}${symbol0}`);
        }
        //
        logger.info(`==== set lp pool ====`)
        logger.info(`==== get bsc lp pool info ===`)
        let bscPoolInfo = [];
        let bsc_totalAlloc = await bsc_farm.methods.totalAllocPoint().call();
        logger.info(`bsc total alloc point : ${bsc_totalAlloc}`)
        let pool1 = await getPoolInfo(bsc_farm, bsc_mdx_usdt, bscInfo);
        let pool2 = await getPoolInfo(bsc_farm, bsc_eth_usdt, bscInfo);
        bscPoolInfo.push(pool1);
        bscPoolInfo.push(pool2);

        let totalAlloc = await farm.methods.totalAllocPoint().call();
        logger.info(`kovan total alloc point : ${totalAlloc}`)

        if (bsc_totalAlloc !== totalAlloc)
        {
            for (let l of lp) {
                let point = bscPoolInfo.find(b => b.token0 === l.token0 && b.token1 === l.token1).point;
                let addPool = await farm.methods.add(point, l.lpToken, true).send(sendOptions);
                logger.info(`${addPool.transactionHash} ==> status: ${addPool.status}`)
            }
            totalAlloc = await farm.methods.totalAllocPoint().call();
            if (totalAlloc !== bsc_totalAlloc) {
                let needPoint = (new BigNumber(bsc_totalAlloc)).minus(new BigNumber(totalAlloc));
                // mdx-wbnb  0x2611779a52409d906fe9b98E16BeA813a83184cF
                let addPool = await farm.methods.add(needPoint, "0x2611779a52409d906fe9b98E16BeA813a83184cF", true).send(sendOptions);
                logger.info(`${addPool.transactionHash} ==> status: ${addPool.status}`)
            }
        }

        logger.info(`==== set single token pool ====`)
        let addMdx = await boardRoomMDX.methods.add(10000, mdxAdd.address, true).send(sendOptions);
        logger.info(`${addMdx.transactionHash} ==> status: ${addMdx.status}`)

    } catch
        (e) {
        console.log(e);
    }
    process.exit();
})
();

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

async function checkBalance(token) {
    let balance = await token.methods.balanceOf(info.addresses.test).call();
    let decimal = await token.methods.decimals().call();
    let symbol = await token.methods.symbol().call();
    if (new BigNumber(balance).lt((new BigNumber(100000000)).times(10 ** decimal))) {
        let amount = (new BigNumber(100000000)).times(10 ** decimal).minus(balance).toFixed();
        if (symbol == "USDT") {
            let issue = await token.methods.issue(amount*10).send(sendOwnerOptions);
            logger.info(`${issue.transactionHash} ==> status: ${issue.status}`)
            let transfer = await token.methods.transfer(info.addresses.test, amount*10).send(sendOwnerOptions);
            logger.info(`${transfer.transactionHash} ==> status: ${transfer.status}`)
        } else {
            let mint = await token.methods.mint(info.addresses.test, amount).send(sendOptions);
            logger.info(`${mint.transactionHash} ==> status: ${mint.status}`)
        }
    }
    balance = await token.methods.balanceOf(info.addresses.test).call();
    logger.info(`${symbol} balance is :${balance}`)
}

async function approve(token, router) {
    let symbol = await token.methods.symbol().call();
    let decimal = await token.methods.decimals().call();
    let allowance = await token.methods.allowance(info.addresses.test, router).call();
    if (new BigNumber(allowance).lte(0)) {
        let amount = (new BigNumber(10000000000)).times(10 ** decimal).minus(allowance).toFixed();
        let approve = await token.methods.approve(router, amount).send(sendOptions);
        logger.info(`${approve.transactionHash} ==> status: ${allowance.status}`)
        allowance = await token.methods.allowance(info.addresses.test, router).call();
    }
    logger.info(`${symbol} allowance is :${allowance}`)
}

async function getPair(factory, token0, token1) {
    return await factory.methods.getPair(token0, token1).call();
}

async function getPoolInfo(farmContract, lpAddress, configInfo) {
    let pool = {};
    let _pid = await farmContract.methods.LpOfPid(lpAddress.options.address).call();
    let poolInfo = await farmContract.methods.poolInfo(_pid).call();
    let token0 = await lpAddress.methods.token0().call();
    let token1 = await lpAddress.methods.token1().call();
    pool.point = poolInfo[1];
    pool.token0 = configInfo["tokens"].find(i => i.address.toLowerCase() === token0.toLowerCase()).name;
    pool.token1 = configInfo["tokens"].find(i => i.address.toLowerCase() === token1.toLowerCase()).name;
    return pool;
}