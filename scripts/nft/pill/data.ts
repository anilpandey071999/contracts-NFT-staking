import { utils } from "ethers";
import { tokens } from "../../shared/data/addresses";

const { parseEther } = utils;
interface IPaymentToken {
  address: string;
  price: string;
}
interface IPillData {
  Pill: string;
  PillImpl: string;
  minter: string;
  tiers: number[];
  tierWeights: number[];
  treasury: string;
  royalty: number;
  PillMinter: string;
  paymentTokens: IPaymentToken[];
  minterOnPillMinter: string;
}

const ONE_MONTH = 30 * 86400;

// 12 mo - 95.25%

// 18 mo - 3%

// 24 mo - 1%

// 30 mo - 0.5%

// 36 mo - 0.25%

export const PillData: Record<string, IPillData> = {
  hardhat: {
    Pill: "0xa606a4Ee414504c0C74F133B5e88d0dA0fc41a32",
    PillImpl: "0xd90d1a6eAC5Bdb233eE48e898bE87b4132985c73",
    minter: "",
    minterOnPillMinter: "0xef78e7f41e173a4aab455c4371c0d3a128e6f74b",
    tiers: [
      ONE_MONTH * 12,
      ONE_MONTH * 18,
      ONE_MONTH * 24,
      ONE_MONTH * 30,
      ONE_MONTH * 36,
    ],
    tierWeights: [9525, 300, 100, 50, 25],
    treasury: "0x0BaE4384E388549B433AF3E5D57696c22bde4C63",
    royalty: 1500,
    PillMinter: "",
    paymentTokens: [
      {
        address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        price: parseEther("1").toString(),
      },
      {
        address: tokens.bsctest.gpt,
        price: parseEther("20").toString(),
      },
      {
        address: tokens.bsctest.testERC20,
        price: parseEther("20").toString(),
      },
    ],
  },
  bsctest: {
    Pill: "0x9F5C68f054654aE1AabCfB9bD9d44370Bbc0F22a",
    PillImpl: "0x4957c6F7CBA307A310658243846F9ba8F679e4C1",
    minter: "0xb081f2Df5785eF2002E078612a763D84770278FA",
    minterOnPillMinter: "0xef78e7f41e173a4aab455c4371c0d3a128e6f74b",
    tiers: [
      ONE_MONTH * 12,
      ONE_MONTH * 18,
      ONE_MONTH * 24,
      ONE_MONTH * 30,
      ONE_MONTH * 36,
    ],
    tierWeights: [9525, 300, 100, 50, 25],
    treasury: "0x0BaE4384E388549B433AF3E5D57696c22bde4C63",
    royalty: 1500,
    PillMinter: "",
    paymentTokens: [],
  },
  bsc: {
    Pill: "0xd94300FDFBd14E9524bB7BA7f971a18290A62bf9",
    PillImpl: "0xafc9a9fAeac462FF8C4a01DDd5679FaF41a25b49",
    minter: "0x972722CA5e6E26C9E46282dCFfde907a54dFb6Cd",
    minterOnPillMinter: "0x8e3ce45aa0c2e0e6970498bbd99d42b4b614e36a",
    tiers: [
      ONE_MONTH * 12,
      ONE_MONTH * 18,
      ONE_MONTH * 24,
      ONE_MONTH * 30,
      ONE_MONTH * 36,
    ],
    tierWeights: [9525, 300, 100, 50, 25],
    treasury: "0x8Ab06AB6F50b4AfEe11716B8c85D00f8F37443dB",
    royalty: 1500,
    PillMinter: "0x972722CA5e6E26C9E46282dCFfde907a54dFb6Cd",
    paymentTokens: [],
  },
};
