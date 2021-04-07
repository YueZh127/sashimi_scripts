const info = require('../info.json');

module.exports = {
    kovan: {
        weth: info.tokens.kovan.weth,
        usdt: info.tokens.kovan.usdt,
        elf: info.tokens.kovan.elf,
        shd: info.tokens.kovan.shd
    },

    mainnet: {
        weth: info.tokens.mainnet.weth,
        usdt: info.tokens.mainnet.usdt
    },

    bsctest: {
        shd: info.tokens.bsctest.shd
    }
}