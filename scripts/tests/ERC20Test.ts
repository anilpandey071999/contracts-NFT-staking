/* eslint-disable no-process-exit */
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";

async function main() {
  const name = "ERC20Test Token";
  const symbol = "ETST";
  const decimals = 18;

  const signer = await getSigner(hre);
  const Token = await hre.ethers.getContractFactory("ERC20Test");
  const token = await Token.connect(signer).deploy(name, symbol, decimals);

  console.log("ERC20Test deployed to:", token.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    token.address,
    name,
    symbol,
    decimals
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
