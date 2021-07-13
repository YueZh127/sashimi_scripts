const FactoryJson = require('../build/contracts/UniswapV2Factory.json');
const RouterJson = require('../build/contracts/UniswapV2Router02.json');

const config = require('../truffle-config');
const info = require("../info.json");
const Web3 = require('web3');
const helper = require('./helper');
const BigNumber = require('bignumber.js')

let web3;
let sendOptions = {from: info.addresses.test, gasPrice: config.networks.kovan.gasPrice};

(async () => {
    try {
        //read file"contract-config"
        let contractConfig = await helper.readJson("sashimi-grid");
        let addressesConfig = await helper.readJson("addresses");

        web3 = new Web3(config.networks.kovan.provider());

        // Factory
        for (let i in contractConfig["kovan"]["factory"])
        {
            let Factory = new web3.eth.Contract(FactoryJson.abi,  contractConfig["kovan"]["factory"][i]);
            if(Factory._address == undefined){
                this.factory = await Factory.deploy({data: FactoryJson.bytecode,arguments:[info.addresses.test]}).send(sendOptions);
                //truffle run verify PriceView@ --network kovan
                console.log("factoryAddress" + i + ":" + this.factory.options.address);
                contractConfig["kovan"]["factory"][i]= this.factory.options.address;
                Factory = new web3.eth.Contract(FactoryJson.abi, contractConfig["kovan"]["factory"][i]);
            }
            addressesConfig["UniswapV2Factory"] = Factory.options.address;
            let hash = await Factory.methods.pairCodeHash().call();
            console.log(hash);
        }

        let weth = contractConfig["kovan"]["tokens"].find(i => i.name === "weth");
        // Router
        for (let i in contractConfig["kovan"]["router"])
        {
            let Router = new web3.eth.Contract(RouterJson.abi,  contractConfig["kovan"]["router"][i]);
            if(Router._address == undefined){
                this.router = await Router.deploy({data: RouterJson.bytecode,arguments:[
                        contractConfig["kovan"]["factory"][i],
                        weth.address
                    ]}).send(sendOptions);
                //truffle run verify PriceView@ --network kovan
                console.log("routerAddress" + i + ":" + this.router.options.address);
                contractConfig["kovan"]["router"][i]= this.router.options.address;
                Router = new web3.eth.Contract(FactoryJson.abi, contractConfig["kovan"]["router"][i]);
            }
            addressesConfig["UniswapV2Router02"][i] = Router.options.address;
        }


        await helper.writeJsonSync("sashimi-grid", contractConfig);
        await helper.writeJsonSync("addresses",addressesConfig)

    } catch (e) {
        console.log(e);
    }
    process.exit();
})();