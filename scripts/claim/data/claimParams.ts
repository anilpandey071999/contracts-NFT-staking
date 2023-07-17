import { tokens } from "../../shared/data/addresses";

const now = 1678109819;

interface IClaimParams {
  [key: string]: {
    claimTime: number;
    token: string;
    vestingData: [number, number, number, number];
  };
}

export const claimParams: IClaimParams = {
  bsctest: {
    claimTime: 1682899200, // 1st May 2023
    token: tokens.bsctest.gpt,
    vestingData: [
      1000, // 10%
      90 * 86400, // 90 days
      608 * 86400, // 608 days ~ 20 months
      86400, // daily unlock
    ],
  },
  hardhat: {
    claimTime: now,
    token: tokens.bsctest.gpt,
    vestingData: [
      1000, // 10%
      90 * 86400, // 90 days
      608 * 86400, // 608 days ~ 20 months
      86400, // daily unlock
    ],
  },
  bsc: {
    claimTime: 1678446300,
    token: tokens.bsc.gpt,
    vestingData: [
      0, // 10%
      90 * 86400, // 90 days
      608 * 86400, // 608 days ~ 20 months
      86400, // daily unlock
    ],
  },
  mainnet: {
    claimTime: 1678446300,
    token: tokens.mainnet.gpt,
    vestingData: [
      1000, // 10%
      90 * 86400, // 90 days
      608 * 86400, // 608 days ~ 20 months
      86400, // daily unlock
    ],
  },
};
