import { ethers } from "hardhat";
import { tokens } from "../../shared/data/addresses";

// !! CHANGE BEFORE PROD
const penaltyDays = "1"; // 1 day
const penaltyBP = "1000"; // %10
const minAmount = ethers.utils.parseEther("100").toString(); // min amount that is allowed to stake
const treasury = "0xD33459Dd26c2B46A60734aA128Dd59318B42eB10";
const distributor = "0x8588CC356bd53464626E777c18d6Fe14Ec81c8A0";
// !! CHANGE BEFORE PROD

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stakingParams: { [key: string]: any } = {
  mainnet: {
    stakingToken: tokens.mainnet.gpt,
    penaltyDays: 18,
    penaltyBP: 1800, // %18
    treasury: "0x8ab06ab6f50b4afee11716b8c85d00f8f37443db",
    minAmount,
    distributor: "0x814035d9768f71d9F03B9430De1AeA1F77c98844", // deployer
  },
  goerli: {
    stakingToken: tokens.goerli.gpt,
    penaltyDays,
    penaltyBP,
    treasury,
    minAmount,
    distributor,
  },
  bsctest: {
    stakingToken: tokens.bsctest.gpt,
    penaltyDays: 18,
    penaltyBP: 1800,
    treasury,
    minAmount,
    distributor,
  },
  hardhat: {
    stakingToken: tokens.bsctest.gpt,
    penaltyDays,
    penaltyBP,
    treasury,
    minAmount,
    distributor,
  },
  bsc: {
    stakingToken: tokens.bsc.gpt,
    penaltyDays: 18,
    penaltyBP: 1800, // %18
    treasury: "0x8ab06ab6f50b4afee11716b8c85d00f8f37443db",
    minAmount,
    distributor: "0x814035d9768f71d9F03B9430De1AeA1F77c98844", // deployer
  },
};
