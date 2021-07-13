const info = require('../info.json');

module.exports = {
    kovan: {
        factory: info.contracts.kovan.factory,
        router:info.contracts.kovan.router,
        investment: info.contracts.kovan.investment,
        oracle: info.contracts.kovan.oracle,
    },
    bsctest: {
        cross:info.contracts.bsctest.cross
    },
}