import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "hardhat-gas-reporter";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-foundry";

dotenv.config();

function loadAccounts() {
  return process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: loadAccounts(),
    },
    goerli: {
      url: `https://rpc.ankr.com/eth_goerli`,
      accounts: loadAccounts(),
    },
    bsctest: {
      url: `https://nd-172-544-791.p2pify.com/9d85333f5416e6296d44e6d309023483`,
      accounts: loadAccounts(),
    },
    bsc: {
      url: `https://bsc-dataseed.binance.org/`,
      accounts: loadAccounts(),
    },
    telosTestnet: {
      url: `https://testnet.telos.net/evm`,
      accounts: loadAccounts(),
    },
    telos: {
      url: `https://mainnet.telos.net/evm`,
      accounts: loadAccounts(),
    },
    mumbai: {
      url: `https://rpc-mumbai.maticvigil.com/`,
      accounts: loadAccounts(),
      gasPrice: 8000000000, // We need to have a number here. See issue: https://github.com/nomiclabs/hardhat/issues/1828
    },
    polygon: {
      url: `https://polygon-rpc.com`,
      accounts: loadAccounts(),
    },
    fuji: {
      url: `https://api.avax-test.network/ext/bc/C/rpc`,
      accounts: loadAccounts(),
    },
    avax: {
      url: `https://api.avax.network/ext/bc/C/rpc`,
      accounts: loadAccounts(),
    },
    step: {
      url: `https://rpc.step.network`,
      accounts: loadAccounts(),
    },
    hardhat: {
      forking: process.env.ARCHIVE_NODE_URL
        ? {
            url: process.env.ARCHIVE_NODE_URL || "",
          }
        : undefined,
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY as string,
      goerli: process.env.ETHERSCAN_API_KEY as string,
      polygon: process.env.POLYGONSCAN_API_KEY as string,
      avalanche: process.env.SNOWTRACE_API_KEY as string,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY as string,
      bsc: process.env.BSCSCAN_API_KEY as string,
      bscTestnet: process.env.BSCSCAN_API_KEY as string,
    },
  },
};

export default config;
