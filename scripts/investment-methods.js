
async function getSashimiInvestment(SashimiInvestment,InvestmentAddress) {
    console.log(`get investment... ${InvestmentAddress}`);
    this.investment = await SashimiInvestment.at(InvestmentAddress);
}

//transaction
async function harvest(sender,token){
    console.log(`Sending harvest ${token} tx..`);
    console.log(`Sender is ${sender}`);
    await this.investment.harvest(token, {from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

async function reBalance(token,sender){
    await this.investment.reBalance(token,{from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    this.investment.events;
    return t;
}

async function chooseProvider(token,providerId,sender){
    await this.investment.chooseProvider(
        token, providerId,{from: sender}).then(function (t){
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e){
        console.log(e);
    });
    return t;
}

async function addProvider(){
    await this.investment.addProvider(
        token, vault,{from: sender}).then(function (t){
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e){
        console.log(e);
    });
    return t;
}

async function emergenceWithdraw(token,prividerId,amount,to,sender){
    await this.investment.emergenceWithdraw(
        token,prividerId,amount,to,{from: sender}).then(function (t){
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e){
        console.log(e);
    });
    return t;
}

async function emergenceWithdrawETH(token,prividerId,amount,to,sender){
    await this.investment.emergenceWithdraw(
        token,prividerId,amount,to,{from: sender}).then(function (t){
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e){
        console.log(e);
    });
    return t;
}

async function emergenceTrigger(context, sender) {
    console.log('Sending queue tx..');
    await this.investment.emergenceTrigger(
        context.target,
        context.sig,
        context.params,
        {from: sender}
    ).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });

    return t;
}

//view
async function reservesRatios(token){
    let ratio = await this.investment.reservesRatios(token);
    return ratio.toString();
}

async function earned(token){
    let earned = await this.investment.earned(token);
    return earned.toString();
}

async function deposits(token){
    let deposits = await this.investment.deposits.call(token);
    return deposits.toString();
}

async function getProvider(providerId){
    let provider = await this.investment.providers.call(providerId);
    return provider;
}

async function getTokenProvider(token){
    let tokenProviderInfo = await this.investment.chosenProviders.call(token);
    return tokenProviderInfo.toString();
}


module.exports = {
    getSashimiInvestment: getSashimiInvestment,

    harvest: harvest,
    reBalance: reBalance,
    chooseProvider: chooseProvider,
    addProvider: addProvider,
    emergenceWithdraw: emergenceWithdraw,
    emergenceWithdrawETH: emergenceWithdrawETH,

    emergenceTrigger: emergenceTrigger,

    reservesRatios: reservesRatios,
    earned: earned,
    deposits: deposits,
    getProvider: getProvider,
    getTokenProvider: getTokenProvider
}