import { ethers } from "hardhat";
import {
  VestedClaimTest as VestedClaim,
  ERC20Test,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { getBlockTimestamp } from "../../lib/provider";
import { setNextBlockTimestamp, mineBlock } from "../../lib/hardhat";

describe("VestedClaim", function () {
  let admin: SignerWithAddress,
    buyer1: SignerWithAddress,
    buyer2: SignerWithAddress,
    nonbuyer: SignerWithAddress,
    vestedClaim: VestedClaim,
    rewardToken: ERC20Test,
    vestedClaimRewardTokenBalance: BigNumber,
    claimTime: number,
    userReward: { [key: string]: BigNumber };

  before(async () => {
    [admin, buyer1, buyer2, nonbuyer] = await ethers.getSigners();

    userReward = {
      [buyer1.address]: ethers.utils.parseEther("1000"),
      [buyer2.address]: ethers.utils.parseEther("1000"),
    };

    const RewardToken = await ethers.getContractFactory("ERC20Test");
    rewardToken = (await RewardToken.connect(admin).deploy(
      "Reward token",
      "RWD",
      18
    )) as ERC20Test;
  });

  describe("Happy Flow Test Cases", () => {
    before(async () => {
      claimTime = (await getBlockTimestamp()) + 86400;

      const VestedClaim = await ethers.getContractFactory("VestedClaimTest");
      vestedClaim = (await VestedClaim.deploy(
        claimTime,
        rewardToken.address
      )) as VestedClaim;

      vestedClaimRewardTokenBalance = ethers.utils.parseEther("10000");
      await rewardToken
        .connect(admin)
        .transfer(vestedClaim.address, vestedClaimRewardTokenBalance);

      await vestedClaim.connect(buyer1).buy(userReward[buyer1.address]);
      await vestedClaim.connect(buyer2).buy(userReward[buyer2.address]);
    });

    it("returns correct time for total available at", async () => {
      expect(await vestedClaim.totalAvailableAfter()).to.eq(
        claimTime + 86400 * 545
      );
    });

    it("should return 0 if user claims before claim time", async () => {
      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), BigNumber.from(0));

      const { withdrawn, reward } = await vestedClaim.userInfo(buyer1.address);

      expect(withdrawn).to.be.eq(BigNumber.from(0));
      expect(reward).to.be.eq(userReward[buyer1.address]);
    });

    it("should let buyer1 claim the first round", async () => {
      await setNextBlockTimestamp(claimTime);
      await mineBlock();

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const claimedAmount = userReward[buyer1.address].mul(20).div(100);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should not affect buyer1 balance at the day 90", async () => {
      await setNextBlockTimestamp(claimTime + 90 * 86400);
      await mineBlock();

      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), initialWithdrawn);

      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance);
    });

    it("should let buyer1 claim the second round (day 1)", async () => {
      await setNextBlockTimestamp(claimTime + 91 * 86400);
      await mineBlock();

      const daysCount = 1;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const claimedAmount = secondRoundReward.mul(daysCount).div(totalDays);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should let buyer1 claim the second round (day 2)", async () => {
      await setNextBlockTimestamp(claimTime + 92 * 86400);
      await mineBlock();

      const daysCount = 2;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const firstRoundReward = userReward[buyer1.address].mul(20).div(100);
      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const totalUnlocked = secondRoundReward
        .mul(daysCount)
        .div(totalDays)
        .add(firstRoundReward);
      const claimedAmount = totalUnlocked.sub(initialWithdrawn);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should let buyer1 claim the second round (day 455)", async () => {
      await setNextBlockTimestamp(claimTime + 545 * 86400);
      await mineBlock();

      const daysCount = 455;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const firstRoundReward = userReward[buyer1.address].mul(20).div(100);
      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const totalUnlocked = secondRoundReward
        .mul(daysCount)
        .div(totalDays)
        .add(firstRoundReward);
      const claimedAmount = totalUnlocked.sub(initialWithdrawn);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });
  });

  describe("Non buyer Test Cases", () => {
    before(async () => {
      claimTime = (await getBlockTimestamp()) + 86400;

      const VestedClaim = await ethers.getContractFactory("VestedClaimTest");
      vestedClaim = (await VestedClaim.deploy(
        claimTime,
        rewardToken.address
      )) as VestedClaim;
    });

    it("should not let nonbuyer user claim before claim time", async () => {
      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim the first round", async () => {
      await setNextBlockTimestamp(claimTime);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim at the day 90", async () => {
      await setNextBlockTimestamp(claimTime + 90 * 86400);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim the second round (day 1)", async () => {
      await setNextBlockTimestamp(claimTime + 91 * 86400);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim the second round (day 2)", async () => {
      await setNextBlockTimestamp(claimTime + 92 * 86400);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim the second round (day 455)", async () => {
      await setNextBlockTimestamp(claimTime + 545 * 86400);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });

    it("should not let nonbuyer user claim after 455 days", async () => {
      await setNextBlockTimestamp(claimTime + 600 * 86400);
      await mineBlock();

      await expect(vestedClaim.connect(nonbuyer).claim()).to.be.revertedWith(
        "Address has no rewards"
      );
    });
  });

  describe("Claim First Round Before 90 Days,then Claim Second Round After 600 Days Test Cases", () => {
    before(async () => {
      claimTime = (await getBlockTimestamp()) + 86400;

      const VestedClaim = await ethers.getContractFactory("VestedClaimTest");
      vestedClaim = (await VestedClaim.deploy(
        claimTime,
        rewardToken.address
      )) as VestedClaim;

      vestedClaimRewardTokenBalance = ethers.utils.parseEther("10000");
      await rewardToken
        .connect(admin)
        .transfer(vestedClaim.address, vestedClaimRewardTokenBalance);

      await vestedClaim.connect(buyer1).buy(userReward[buyer1.address]);
    });

    it("should let buyer1 claim the first round", async () => {
      await setNextBlockTimestamp(claimTime);
      await mineBlock();

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const claimedAmount = userReward[buyer1.address].mul(20).div(100);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should let buyer1 claim the second round after 600 days", async () => {
      await setNextBlockTimestamp(claimTime + 600 * 86400);
      await mineBlock();

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const claimedAmount = userReward[buyer1.address].mul(80).div(100);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });
  });
  describe("Claim All Rewards After 600 days Test Cases", () => {
    before(async () => {
      claimTime = (await getBlockTimestamp()) + 86400;

      const VestedClaim = await ethers.getContractFactory("VestedClaimTest");
      vestedClaim = (await VestedClaim.deploy(
        claimTime,
        rewardToken.address
      )) as VestedClaim;

      vestedClaimRewardTokenBalance = ethers.utils.parseEther("10000");
      await rewardToken
        .connect(admin)
        .transfer(vestedClaim.address, vestedClaimRewardTokenBalance);

      await vestedClaim.connect(buyer1).buy(userReward[buyer1.address]);
    });

    it("should let buyer1 claim add rewards after 600 days", async () => {
      await setNextBlockTimestamp(claimTime + 600 * 86400);
      await mineBlock();

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn, reward } =
        await vestedClaim.userInfo(buyer1.address);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, reward, reward);

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance.add(reward));
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(reward));
    });
  });

  describe("Claim Multiple Times Test Cases", async () => {
    before(async () => {
      claimTime = (await getBlockTimestamp()) + 86400;

      const VestedClaim = await ethers.getContractFactory("VestedClaimTest");
      vestedClaim = (await VestedClaim.deploy(
        claimTime,
        rewardToken.address
      )) as VestedClaim;

      vestedClaimRewardTokenBalance = ethers.utils.parseEther("10000");
      await rewardToken
        .connect(admin)
        .transfer(vestedClaim.address, vestedClaimRewardTokenBalance);

      await vestedClaim.connect(buyer1).buy(userReward[buyer1.address]);
    });

    it("should let buyer1 claim the first round", async () => {
      await setNextBlockTimestamp(claimTime);
      await mineBlock();

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const claimedAmount = userReward[buyer1.address].mul(20).div(100);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should not let buyer1 claim the first round again", async () => {
      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), initialWithdrawn);

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance);
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn);
    });

    it("should let buyer1 claim the second round (day 1)", async () => {
      await setNextBlockTimestamp(claimTime + 91 * 86400);
      await mineBlock();

      const daysCount = 1;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const claimedAmount = secondRoundReward.mul(daysCount).div(totalDays);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should not let buyer1 claim the second round (day 1) again", async () => {
      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), initialWithdrawn);

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance);
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn);
    });

    it("should let buyer1 claim the second round (day 2)", async () => {
      await setNextBlockTimestamp(claimTime + 92 * 86400);
      await mineBlock();

      const daysCount = 2;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const firstRoundReward = userReward[buyer1.address].mul(20).div(100);
      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const totalUnlocked = secondRoundReward
        .mul(daysCount)
        .div(totalDays)
        .add(firstRoundReward);
      const claimedAmount = totalUnlocked.sub(initialWithdrawn);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should not let buyer1 claim the second round (day 2)", async () => {
      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), initialWithdrawn);

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance);
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn);
    });

    it("should let buyer1 claim the rest of reward after 600 days", async () => {
      await setNextBlockTimestamp(claimTime + 600 * 86400);
      await mineBlock();

      const daysCount = 455;
      const totalDays = 455;

      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      const firstRoundReward = userReward[buyer1.address].mul(20).div(100);
      const secondRoundReward = userReward[buyer1.address].mul(80).div(100);
      const totalUnlocked = secondRoundReward
        .mul(daysCount)
        .div(totalDays)
        .add(firstRoundReward);
      const claimedAmount = totalUnlocked.sub(initialWithdrawn);

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(
          buyer1.address,
          claimedAmount,
          initialWithdrawn.add(claimedAmount)
        );

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(
        initialUserBalance.add(claimedAmount)
      );
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn.add(claimedAmount));
    });

    it("should not let buyer1 claim after all rewards are claimed", async () => {
      const initialUserBalance = await rewardToken.balanceOf(buyer1.address);
      const { withdrawn: initialWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );

      await expect(vestedClaim.connect(buyer1).claim())
        .to.emit(vestedClaim, "RewardClaimed")
        .withArgs(buyer1.address, BigNumber.from(0), initialWithdrawn);

      const { withdrawn: updatedWithdrawn } = await vestedClaim.userInfo(
        buyer1.address
      );
      const updatedUserBalance = await rewardToken.balanceOf(buyer1.address);

      expect(updatedUserBalance).to.be.eq(initialUserBalance);
      expect(updatedWithdrawn).to.be.eq(initialWithdrawn);
    });
  });
});
