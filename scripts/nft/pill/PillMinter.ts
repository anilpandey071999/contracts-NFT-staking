/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../../shared/utils/getSigner";
import { PillData } from "./data";

const params = {
  PillAddress: PillData[hre.network.name].Pill,
  treasury: PillData[hre.network.name].treasury,
};

async function main() {
  const signer = await getSigner(hre);

  const Minter = await ethers.getContractFactory("PillMinter", signer);
  const minter = await Minter.connect(signer).deploy(
    params.PillAddress,
    params.treasury
  );

  console.log("PillMinter deployed to:", minter.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    minter.address,
    params.PillAddress,
    params.treasury
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
