require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    arc: {
      url: "https://rpc.arc-testnet.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 5042002
    }
  }
};
