const info = require('./info.json');

module.exports = {
    keys: {
        ALICE: info.keys.ALICE,
        JACK: info.keys.JACK,
        LISA: info.keys.LISA,
        TEST: info.keys.TEST,
        WANG: info.keys.WANG,
        LI: info.keys.LI
    },
    keyList: info.keyList,
    address: {
        alice: info.addresses.alice,
        jack: info.addresses.jack,
        lisa: info.addresses.lisa,
        test: info.addresses.test,
        wang: info.addresses.wang,
        li: info.addresses.li
    },
    aelfAddresses: info.aelfAddresses,
    aelfAddress : info.aelfAddress,
    privateKeys: [
        info.keys.ALICE,
        info.keys.JAMES,
        info.keys.JACK,
        info.keys.LISA,
        info.keys.TEST,
        info.keys.WANG,
        info.keys.LI
    ]
}