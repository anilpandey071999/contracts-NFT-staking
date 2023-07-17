/* eslint-disable no-process-exit */
import hre, { ethers } from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { getSigner } from "../shared/utils/getSigner";

import { waifuSaleData } from "./data/data";

async function main() {
  const signer = await getSigner(hre);
  const network: string = hre.network.name;

  const params = waifuSaleData[network];

  const Sale = await ethers.getContractFactory("CryptoCptSaifuSale");
  const sale = await Sale.connect(signer).deploy(
    params.nftToken,
    params.paymentToken,
    params.startTime,
    params.price,
    params.refundTimeLimit
  );

  console.log("Sale deployed to:", sale.address);
  console.log(
    "npx hardhat verify --network",
    hre.network.name,
    sale.address,
    params.nftToken,
    params.paymentToken,
    params.startTime,
    params.price.toString(),
    params.refundTimeLimit
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
