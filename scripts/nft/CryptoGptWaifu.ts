/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";

async function main() {
  const signer = await getSigner(hre);

  const Nft = await ethers.getContractFactory("CryptoCptSaifu");
  const nft = await Nft.connect(signer).deploy();

  console.log("Nft deployed to:", nft.address);
  console.log("npx hardhat verify --network", hre.network.name, nft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
