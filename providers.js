const info = require('./info.json');
const Web3 = require('web3');
const ethUtils = require('ethereumjs-util')

async function useKovanProvider(senderPkey) {
    console.log('using kovan provider..');
    this.web3 = new Web3(info.kovan);
    this.pkey = senderPkey;
    this.web3.eth.accounts.wallet.add(this.pkey)
    this.walletOwnerAddress = '0x'+ethUtils.privateToAddress(ethUtils.toBuffer('0x' + this.pkey)).toString('hex')
    this.web3.eth.defaultAccount = this.walletOwnerAddress
    return this.web3;
}

async function useMainnetProvider() {
    console.log('using mainnet provider..');
    return new Web3(info.mainnet);
}

async function useBscTestProvider(senderPkey) {
    console.log('using bsc-test provider..');
    this.web3 = new Web3(info.bsctest);
    this.pkey = senderPkey;
    this.web3.eth.accounts.wallet.add(this.pkey)
    this.walletOwnerAddress = '0x'+ethUtils.privateToAddress(ethUtils.toBuffer('0x' + this.pkey)).toString('hex')
    this.web3.eth.defaultAccount = this.walletOwnerAddress
    return this.web3;
}

async function useBscProvider(senderPkey) {
    console.log('using bsc provider..');
    this.web3 = new Web3(info.bsc);
    this.pkey = senderPkey;
    this.web3.eth.accounts.wallet.add(this.pkey)
    this.walletOwnerAddress = '0x'+ethUtils.privateToAddress(ethUtils.toBuffer('0x' + this.pkey)).toString('hex')
    this.web3.eth.defaultAccount = this.walletOwnerAddress
    return this.web3;
}

async function addAccount(Web3, keys){
    console.log('add keys...');
    keys.forEach(function (k){
        console.log(k);
        Web3.eth.accounts.wallet.add(k);
    });
}

module.exports ={
    mainnet : info.mainnet,
    kovan : info.kovan,
    bsctest : info.bsctest,
    bsc : info.bsc,

    useKovanProvider : useKovanProvider,
    useMainnetProvider : useMainnetProvider,
    useBscTestProvider : useBscTestProvider,
    useBscProvider: useBscProvider,

    addAccount:addAccount
}