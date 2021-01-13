const helper = require('./helper');
const contract = require('truffle-contract');
const config = require('../truffle-config');

const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const tokens = require('./tokens-config');
const investment = require('./investment-methods');
const getToken = require('./getToken');

const SashimiInvestment = artifacts.require('test-sashimivault/SashimiInvestment');
const WETH = artifacts.require('canonical-weth/WETH9');
const USDT = artifacts.require('TetherToken');
const argv = require('minimist')(process.argv.slice(2), {string: ['network']});


module.exports = async function () {
    console.log(`network: ${argv['network']}\n`
        + `owner: ${config.sender}`);
    let owner = config.sender;
    let sender = keys.address.jack;

    let web3;
    if (argv['network'] === 'kovan') {
        web3 = await providers.useKovanProvider();
        let address = contracts.kovan.investment;
        let usdtToken = tokens.kovan.usdt;
        let wethToken = tokens.kovan.weth;
        await investment.getSashimiInvestment(SashimiInvestment,address);
        this.WETH = await getToken.getWETH(WETH,wethToken);
        this.USDT = await getToken.getUSDT(USDT,usdtToken);
    }

    // get token provider
    let providerId = await investment.getTokenProvider(this.USDT.address);
    if(providerId === 0)
    {
        console.log("Find provider:");

        console.log("Add provider:");
    }
    let providerInfo = await investment.getProvider(providerId);
    console.log();

    let balance = await this.USDT.balanceOf(sender);
    console.log(balance.toString());
    console.log('End.');
}


