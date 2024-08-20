require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ override: true });
require("hardhat-tracer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
  },

  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.ENDPOINT}`,
      // url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ENDPOINT}`,
      accounts: [process.env.PRIVATEKEY]
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETH_API_KEY,
    },
  },
};
