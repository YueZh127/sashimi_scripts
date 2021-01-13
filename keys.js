const info = require('./info.json');

module.exports = {
    keys: {
        ALICE: info.keys.ALICE,
        JACK: info.keys.JACK,
        LISA: info.keys.LISA,
        TEST: info.keys.TEST
    },
    keyList: info.keyList,
    address: {
        alice: info.addresses.alice,
        jack: info.addresses.jack,
        lisa: info.addresses.lisa,
        test: info.addresses.test
    },
    aelfAddresses: info.aelfAddresses,
    aelfAddress : info.aelfAddress,
    privateKeys: [info.keys.ALICE, info.keys.JAMES, info.keys.JACK, info.keys.LISA, info.keys.TEST]
}