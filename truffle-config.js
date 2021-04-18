require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  compilers: {
    solc: {
      version: '0.7.4',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 6721975,
    },
    ropsten: {
      provider: () => {
        return new HDWalletProvider(
          ``, //mnemonic
          ``, //endpoint
          0, 20
        );
      },
      network_id: "3",
      gasPrice: 25e9,
      gas: 6721975,
    },
    mainnet: {
      provider: () => {
        return new HDWalletProvider(
          ``, //mnemonic
          ``, //endpoint
           0, 20
        );
      },
      network_id: "1",
      gasPrice: 25e9,
      gas: 6721975,
    }
  },
  mocha: {
    enableTimeouts: false,
    useColors: true,
    reporter: "eth-gas-reporter",
    reporterOptions: {
      currency: "USD",
      gasPrice: 10,
    },
  },
  plugins: ["truffle-contract-size", 'truffle-plugin-verify'],
  api_keys: {
  }
};
