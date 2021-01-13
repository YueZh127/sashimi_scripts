
async function getMerkle(Merkle,MerkleAddress) {
    console.log(`get Merkle... ${MerkleAddress}`);
    this.merkle = await Merkle.at(MerkleAddress);
}

//only owner
async function recordReceipts(sender = this.merkle.sender){
    console.log(`Sending recordReceipts tx..`);
    console.log(`Sender is ${sender}`);
    await this.merkle.recordReceipts({from: sender}).then(function (t) {
        console.log("Transaction %s executed.", t.tx);
    }).catch(function (e) {
        console.log(e);
    });
    return t;
}

//view
async function generateMerklePath(receiptId){
    let merklePath = await this.merkle.generateMerklePath(receiptId);
    return merklePath.toString();
}

async function getMerkleTree(treeIndex){
    let tree = await this.merkle.getMerkleTree(treeIndex);
    return tree.toString();
}


module.exports = {
    getMerkle: getMerkle,

    recordReceipts: recordReceipts,
    generateMerklePath: generateMerklePath,
    getMerkleTree: getMerkleTree
}