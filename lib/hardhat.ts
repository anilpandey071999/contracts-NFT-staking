import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"; // eslint-disable-line node/no-extraneous-import
import { BigNumber, utils } from "ethers"; // eslint-disable-line node/no-extraneous-import
import { ethers, network } from "hardhat";

const provider = ethers.provider;

export const mineBlock = async (timestamp?: number): Promise<number> => {
  await provider.send("evm_mine", timestamp ? [timestamp] : []);
  return (await provider.getBlock("latest")).number;
};

export const increaseTime = async (seconds: number) => {
  await provider.send("evm_increaseTime", [seconds]);
};

export const setNextBlockTimestamp = async (timestamp: number) => {
  await provider.send("evm_setNextBlockTimestamp", [timestamp]);
};

export const impersonate = async (addr: string): Promise<SignerWithAddress> => {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [addr],
  });
  return await ethers.getSigner(addr);
};

export const unimpersonate = async (addr: string): Promise<void> => {
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [addr],
  });
};

export const ensureMinBalance = async (
  account: string,
  minBalance: BigNumber
): Promise<void> => {
  const balance = await provider.getBalance(account);
  if (balance.lt(minBalance)) {
    console.log(
      "balance",
      utils.formatEther(minBalance),
      "< minBalance",
      utils.formatEther(balance),
      "- topping up"
    );
    await provider.send("hardhat_setBalance", [
      account,
      minBalance.toHexString().replace("0x0", "0x"),
    ]);
  } else {
    console.log(
      "balance",
      utils.formatEther(minBalance),
      ">= minBalance",
      utils.formatEther(balance),
      "- nothing to do"
    );
  }
};
