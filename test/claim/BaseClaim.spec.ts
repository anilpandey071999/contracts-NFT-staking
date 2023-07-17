import { BaseClaimTest as BaseClaim, ERC20Test } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { getBlockTimestamp } from "../../lib/provider";

describe("Base Claim", function () {
  let admin: SignerWithAddress,
    nonAdmin: SignerWithAddress,
    buyer1: SignerWithAddress,
    buyer2: SignerWithAddress,
    nonbuyer: SignerWithAddress,
    userReward: { [key: string]: BigNumber },
    baseClaim: BaseClaim,
    rewardToken: ERC20Test,
    claimTime: number,
    baseClaimRewardTokenBalance: BigNumber;

  before(async () => {
    [admin, nonAdmin, buyer1, buyer2, nonbuyer] = await ethers.getSigners();

    userReward = {
      [buyer1.address]: ethers.utils.parseEther("10"),
      [buyer2.address]: ethers.utils.parseEther("0"),
    };

    const RewardToken = await ethers.getContractFactory("ERC20Test");
    rewardToken = (await RewardToken.connect(admin).deploy(
      "Reward token",
      "RWD",
      18
    )) as ERC20Test;

    const BaseClaim = await ethers.getContractFactory("BaseClaimTest");
    baseClaim = (await BaseClaim.deploy(rewardToken.address)) as BaseClaim;

    claimTime = await getBlockTimestamp();

    baseClaimRewardTokenBalance = ethers.utils.parseEther("100");
    await rewardToken
      .connect(admin)
      .transfer(baseClaim.address, baseClaimRewardTokenBalance);
  });

  it("should get the claim time", async () => {
    const contractClaimTime = await baseClaim.claimTime();
    expect(contractClaimTime).to.be.eq(BigNumber.from(claimTime));
  });

  it("returns correct time for total available after", async () => {
    expect(await baseClaim.totalAvailableAfter()).to.eq(claimTime);
  });

  it("should get the reward token address", async () => {
    const token = await baseClaim.rewardToken();
    expect(token).to.be.eq(rewardToken.address);
  });

  it("should add user reward after user buy some amount", async () => {
    const initialTotalRewards = await baseClaim.totalRewards();

    const user = buyer1.address;
    const amount = userReward[buyer1.address];

    await baseClaim.connect(buyer1).buy(amount);

    const { reward } = await baseClaim.userInfo(user);
    const newTotalRewards = await baseClaim.totalRewards();

    expect(reward).to.be.eq(amount);
    expect(newTotalRewards).to.be.eq(initialTotalRewards.add(amount));
  });

  it("should add user reward after user buy 0 amount", async () => {
    const initialTotalRewards = await baseClaim.totalRewards();

    const user = buyer2.address;
    const amount = userReward[buyer2.address];

    await baseClaim.connect(buyer2).buy(amount);

    const { reward } = await baseClaim.userInfo(user);
    const newTotalRewards = await baseClaim.totalRewards();

    expect(reward).to.be.eq(amount);
    expect(newTotalRewards).to.be.eq(initialTotalRewards.add(amount));
  });

  it("should let user claim if the reward is greater than 0", async () => {
    const user = buyer1.address;
    const amount = userReward[buyer1.address];

    await expect(baseClaim.connect(buyer1).claim())
      .to.emit(baseClaim, "RewardClaimed")
      .withArgs(user, amount, amount);

    const { withdrawn } = await baseClaim.userInfo(user);
    const totalWithdrawn = await baseClaim.totalWithdrawn();

    expect(withdrawn).to.be.eq(amount);
    expect(totalWithdrawn).to.be.eq(amount);
  });

  it("should not update user balance if all of the rewards have already been withdrawn", async () => {
    const user = buyer1.address;
    const initialRewardTokenBalance = await rewardToken.balanceOf(user);

    await baseClaim.connect(buyer1).claim();

    const updatedRewardTokenBalance = await rewardToken.balanceOf(user);

    expect(initialRewardTokenBalance).to.be.eq(updatedRewardTokenBalance);
  });

  it("should not let user claim if the reward is 0", async () => {
    await expect(baseClaim.connect(nonbuyer).claim()).to.be.revertedWith(
      "Address has no rewards"
    );
  });

  it("should not let user claim if claims are paused", async () => {
    await baseClaim.connect(admin).pauseClaims();

    await expect(baseClaim.connect(buyer1).claim()).to.be.revertedWith(
      "Claims are paused"
    );
  });

  it("should let admin withdraw tokens from contract", async () => {
    const contractBalance = await rewardToken.balanceOf(baseClaim.address);
    const initialAdminBalance = await rewardToken.balanceOf(admin.address);

    await baseClaim.connect(admin).emergencyWithdrawToken(rewardToken.address);

    const updatedAdminBalance = await rewardToken.balanceOf(admin.address);

    expect(updatedAdminBalance).to.be.eq(
      initialAdminBalance.add(contractBalance)
    );
  });

  it("should not let user withdraw tokens from contract", async () => {
    await expect(
      baseClaim.connect(nonAdmin).emergencyWithdrawToken(rewardToken.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
