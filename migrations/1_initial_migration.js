const Bridge = artifacts.require("Bridge");

module.exports = async function (deployer, network, accounts) {
  if (network === "development") {
    await deployer.deploy(Bridge, "Wrapped TON Coin", "TONCOIN", [accounts[0]]);
  }

 if (network === "ropsten") {
   await deployer.deploy(Bridge, "Wrapped TON Coin", "TONCOIN", [accounts[5], accounts[4], accounts[6]], {from:accounts[5]});
 }

 if (network === "mainnet") {
   await deployer.deploy(Bridge, "Wrapped TON Coin", "TONCOIN", [0xC4c9bd836ab8b446519736166919e3d62491E041,
                                                                 0xCF4A7c26186aA41390E246FA04115A0495085Ab9,
                                                                 0x17DcaB1B1481610F6C7a7A98cf0370dC0EC704a6,
                                                                 0x32162CAaEd276E77EF63194820586C942009a962,
                                                                 0x039f4e886432bd4f3cb5062f9861EFef3F6aDA28,
                                                                 0xFf441F9889Aa475d9D3b1C638C59B84c5179846D,
                                                                 0x0933738699dc733C46A0D4CBEbDA2f842e1Ac7d9,
                                                                 0x7F2bbaaC14F0f1834E6D0219F8855A5F619Fe2C4,
                                                                 0xfc5c6A2d01A984ba9eab7CF87A6D169aA9720c0C], {from:accounts[0]});
 }
};
