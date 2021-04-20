const Bridge = artifacts.require("Bridge");

module.exports = async function (deployer, network, accounts) {
  if (network === "development") {
    await deployer.deploy(Bridge, "Wrapped TON Coin", "TONCOIN", [accounts[0]]);
  }

 if (network === "ropsten") {
   await deployer.deploy(Bridge, "Wrapped TON Coin", "TONCOIN", [accounts[5]], {from:accounts[5]});
 }
};
