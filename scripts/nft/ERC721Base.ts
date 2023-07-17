/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";
import { erc721DeployData } from "./data/data";

async function main() {
  const signer = await getSigner(hre);
  const network: string = hre.network.name;

  const params = erc721DeployData[network];

  const Nft = await ethers.getContractFactory("ERC721Base");
  const nft = await Nft.connect(signer).deploy(
    params.name,
    params.symbol,
    params.contractUri,
    params.baseTokenUri
  );

  console.log("Nft deployed to:", nft.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    nft.address,
    params.name,
    params.symbol,
    params.contractUri,
    params.baseTokenUri
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
