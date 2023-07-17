/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../../shared/utils/getSigner";
import { PillData } from "./data";

const MINTER_ROLE = ethers.utils.id("MINTER_ROLE");

async function main() {
  const signer = await getSigner(hre);

  const Minter = await ethers.getContractFactory("PillMinter", signer);
  const minter = await Minter.attach(PillData[hre.network.name].minter);

  const Pill = await ethers.getContractFactory("Pill", signer);
  const Pill = await Pill.attach(PillData[hre.network.name].Pill);

  console.log("Setting Pill tiers...");
  await Pill.setTierExpiration(PillData[hre.network.name].tiers);
  console.log("Pill tiers set.");

  console.log("Setting Pill minter role...");
  await Pill.grantRole(MINTER_ROLE, minter.address);
  console.log("Pill minter set.");

  // pause Pill
  console.log("Pausing Pill...");
  await Pill.pause();
  console.log("Pill paused.");

  // set expiry in the future
  console.log("Setting expiry in the future...");
  await Pill.setExpiryStart(ethers.constants.MaxUint256);
  console.log("Expiry set in the future.");

  // set Pill uri scheme
  console.log("Setting Pill uri scheme...");
  await Pill.setUriScheme(1);

  // Pill set royalty
  console.log("Setting royalty...");
  await Pill.setDefaultRoyalty(
    PillData[hre.network.name].treasury,
    PillData[hre.network.name].royalty
  );
  console.log("Royalty set.");

  // add minter to allowlist
  console.log("Adding minter to allowlist...");
  await Pill.allowlist(minter.address, true);
  console.log("Minter added to allowlist.");

  // set tier weights
  console.log("Setting Pill tier weights...");
  await minter.setTierWeights(PillData[hre.network.name].tierWeights);
  console.log("Pill tier weights set.");

  // set minter role for relayer on Pill minter
  console.log("Setting minter role for relayer on Pill minter...");
  await minter.grantRole(
    MINTER_ROLE,
    PillData[hre.network.name].minterOnPillMinter
  );
  console.log("Minter role for relayer on Pill minter set.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
