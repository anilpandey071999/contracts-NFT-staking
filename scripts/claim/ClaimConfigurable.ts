/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";
import { claimParams } from "./data/claimParams";

async function main() {
  const signer = await getSigner(hre);
  const network: string = hre.network.name;

  const { claimTime, token, vestingData } = claimParams[network];

  const Claim = await ethers.getContractFactory("ClaimConfigurable");
  const claim = await Claim.connect(signer).deploy(
    claimTime,
    token,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vestingData as any
  );

  console.log("Claim deployed to:", claim.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    "--constructor-args scripts/claim/claimArgs.ts",
    "--contract contracts/claim/ClaimConfigurable.sol:ClaimConfigurable",
    claim.address
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
