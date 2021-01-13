const info = require('../info.json');

module.exports = {
    kovan: {
        timeLock: info.contracts.kovan.timeLock,
        chef: info.contracts.kovan.chef,
        factory: info.contracts.kovan.factory,
        investment: info.contracts.kovan.investment,
        lock: info.contracts.kovan.lock,
        maker: info.contracts.kovan.maker,
        merkle: info.contracts.kovan.merkle
    },

    mainnet: {
        timeLock: info.contracts.mainnet.timeLock,
        chef: info.contracts.mainnet.chef,
        factory: info.contracts.mainnet.factory
    }
}