const info = require('../info.json');

module.exports = {
    kovan: {
        timeLock: info.contracts.kovan.timeLock,
        chef: info.contracts.kovan.chef,
        factory: info.contracts.kovan.factory,
        investment: info.contracts.kovan.investment,
        lock: info.contracts.kovan.lock,
        maker: info.contracts.kovan.maker,
        merkle: info.contracts.kovan.merkle,
        distributor:info.contracts.kovan.distributor,
        cross:info.contracts.kovan.cross,
        oracle: info.contracts.kovan.oracle,
        fundPool: info.contracts.kovan.fundpool,
        controller: info.contracts.kovan.controllerDelegator
    },

    mainnet: {
        timeLock: info.contracts.mainnet.timeLock,
        chef: info.contracts.mainnet.chef,
        factory: info.contracts.mainnet.factory
    },

    bsctest: {
        cross:info.contracts.bsctest.cross
    },
}