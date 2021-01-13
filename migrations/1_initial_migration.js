// const Migrations = artifacts.require("Migrations");
const TimeLock = artifacts.require("Timelock");

module.exports = function(deployer) {
  deployer.deploy(TimeLock);
};
