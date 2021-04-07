const config = require('../truffle-config');
const providers = require('../providers');
const keys = require("../keys");
const contracts = require('./contracts-config');
const tokens = require('./tokens-config');
const contract = require("./basicContract");
const logger = require('log-js')();
// const claimedInfo = require("../merkleInfo");
const claimedInfo = require("../merkleInfo.json");

const sender = keys.address.test;

const argv = require('minimist')(process.argv.slice(2), {string: ['network']});


module.exports = async function () {
    logger.info(`network: ${argv['network']}\n`
        + `owner: ${config.sender}`);

    let senderPkey = keys.keys.TEST;
    logger.status = false

    let web3;
    let SHDContract;
    let DistributorContract;

    if (argv['network'] === 'kovan') {
        web3 = await providers.useKovanProvider(senderPkey);
        let distributorAddress = contracts.kovan.distributor;
        let shdToken = tokens.kovan.shd;
        DistributorContract = await contract.initContract('Distributor', web3, distributorAddress);
        SHDContract = await contract.initContract('ERC20Token', web3, shdToken);
    }

    let times = 0;
    let claimedAccountInfos = claimedInfo.claims;
    for (let key in claimedAccountInfos) {
        let account = key;
        let index = claimedAccountInfos[key].index;
        let amount = BigInt(claimedAccountInfos[key].amount);
        let proof = claimedAccountInfos[key].proof;

        logger.info(`Check if claimed ...`);
        let isClaimed = await contract.callViewMethod(
            DistributorContract,
            'isClaimed',
            [index]
        );
        if (!isClaimed) {
            let beforeBalance = await CheckAccountBalance(SHDContract, account);
            logger.info(`Before claim, SHD balance is ${beforeBalance}`)

            logger.info(`Begin claim ... `)
            let claimed = await contract.callSendMethod(
                DistributorContract,
                'claim',
                sender,
                [index, account, amount, proof]
            );
            logger.info(`claimed tx: ${claimed.transactionHash}: ${claimed.status}`);

            let balance = await CheckAccountBalance(SHDContract, account);
            logger.info(`After claimed, account ${account}: SHD balance is ${balance}`);
            console.assert(BigInt(balance) === BigInt(beforeBalance) + amount,
                'account balance is incorrect ...')
        }
        else {
            logger.info(`account ${account} is already claimed`);
            let balance = await CheckAccountBalance(SHDContract, account);
            logger.info(`account ${account}: SHD balance is ${balance}`);
        }
        times++;
    }
    console.log(times);
    console.log('End.');
}

async function CheckAccountBalance(Contract, account) {
    return await contract.callViewMethod(
        Contract,
        'balanceOf',
        [account]
    );
}