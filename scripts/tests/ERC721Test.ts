/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";

async function main() {
  const signer = await getSigner(hre);
  const Token = await hre.ethers.getContractFactory("ERC721Test");
  const token = await Token.connect(signer).deploy();

  console.log("ERC721Test deployed to:", token.address);
  console.log("npx hardhat verify --network", hre.network.name, token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
