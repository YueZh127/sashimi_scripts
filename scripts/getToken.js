const elfAbi = require('../build/contracts/ERC20_1.json');

async function getWETH(WETH,wETHAddress) {
    console.log(`get wETH... ${wETHAddress}`);
    this.wETH = await WETH.at(wETHAddress);
    return this.wETH;
}

async function getUSDT(USDT,USDTAddress) {
    console.log(`get usdt... ${USDTAddress}`);
    this.USDT = await USDT.at(USDTAddress);
    return this.USDT;
}

async function getELF(Web3,ELFAddress) {
    console.log(`get elf... ${ELFAddress}`);
    this.ELF = new Web3.eth.Contract(elfAbi,ELFAddress);
    return this.ELF;
}


module.exports = {
    getWETH: getWETH,
    getUSDT: getUSDT,
    getELF: getELF
}

