/* eslint-disable no-process-exit */
import hre, { ethers, upgrades } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../../shared/utils/getSigner";

const params = {
  name: "LayerAI Pills",
  symbol: "LAIC",
  contractUri: "https://store.layerai.org/nfts/Pills/contract.json",
  baseTokenUri: "https://store.layerai.org/nfts/Pills/",
};

async function main() {
  const signer = await getSigner(hre);

  const Pill = await ethers.getContractFactory("Pill", signer);
  const Pill = await upgrades.deployProxy(Pill, [
    params.name,
    params.symbol,
    params.contractUri,
    params.baseTokenUri,
  ]);
  await Pill.deployed();

  console.log("Pill deployed to:", Pill.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    Pill.address,
    `'${params.name}'`,
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
