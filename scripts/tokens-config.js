const info = require('../info.json');

module.exports = {
    kovan: {
        weth: info.tokens.kovan.weth,
        usdt: info.tokens.kovan.usdt,
        usdc: info.tokens.kovan.usdc,
        wbtc: info.tokens.kovan.wbtc,
        dai: info.tokens.kovan.dai,
        elf: info.tokens.kovan.elf
    },

    mainnet: {
        weth: info.tokens.mainnet.weth,
        usdt: info.tokens.mainnet.usdt
    },

    bsctest: {
        shd: info.tokens.bsctest.shd
    }
}