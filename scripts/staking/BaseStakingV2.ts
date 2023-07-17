/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";
import { stakingParams } from "./data/stakingParams";

async function main() {
  const signer = await getSigner(hre);
  const network: string = hre.network.name;

  const {
    stakingToken,
    penaltyDays,
    penaltyBP,
    treasury,
    minAmount,
    distributor,
  } = stakingParams[network];

  const BaseStaking = await ethers.getContractFactory("BaseStakingV2");
  const baseStaking = await BaseStaking.connect(signer).deploy(
    stakingToken,
    penaltyDays,
    penaltyBP,
    treasury,
    minAmount,
    distributor
  );

  console.log("BaseStakingV2 deployed to:", baseStaking.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    baseStaking.address,
    stakingToken,
    penaltyDays,
    penaltyBP,
    treasury,
    minAmount,
    distributor
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
