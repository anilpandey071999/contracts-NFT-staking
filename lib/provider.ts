import { ethers } from "hardhat";

export async function getBlockNumber() {
  return (await ethers.provider.getBlock("latest")).number;
}

export async function getBlockTimestamp(block?: number | "latest") {
  return (await ethers.provider.getBlock(block || "latest")).timestamp;
}
