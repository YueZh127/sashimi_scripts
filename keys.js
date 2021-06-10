const {addresses, aelfAddress, aelfAddresses, keyList, keys, mdexTokenOwner} = require('./info.json');

module.exports = {
    keys: {
        ALICE: keys.ALICE,
        JACK: keys.JACK,
        LISA: keys.LISA,
        TEST: keys.TEST,
        WANG: keys.WANG,
        LI: keys.LI
    },
    keyList: keyList,
    address: {
        alice: addresses.alice,
        jack: addresses.jack,
        lisa: addresses.lisa,
        test: addresses.test,
        wang: addresses.wang,
        li: addresses.li,
        tokenOwner: mdexTokenOwner
    },
    aelfAddresses: aelfAddresses,
    aelfAddress : aelfAddress
}