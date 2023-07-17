/* eslint-disable no-unused-expressions */
import { BaseStakingV2, ERC20Test } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { increaseTime } from "../../lib/hardhat";

describe("Base Staking V2", function () {
  let admin: SignerWithAddress,
    nonAdmin: SignerWithAddress,
    buyer1: SignerWithAddress,
    nonBuyer: SignerWithAddress,
    treasury: SignerWithAddress,
    distributor: SignerWithAddress,
    penaltyDays: BigNumber,
    penaltyBP: BigNumber,
    minAmountToStake: BigNumber,
    stakingToken: ERC20Test,
    staking: BaseStakingV2;

  before(async () => {
    [admin, nonAdmin, buyer1, distributor, nonBuyer, treasury] =
      await ethers.getSigners();

    penaltyDays = BigNumber.from(10);
    penaltyBP = BigNumber.from(1000); // 10%
    minAmountToStake = BigNumber.from(5);

    const StakingToken = await ethers.getContractFactory("ERC20Test");
    stakingToken = (await StakingToken.connect(admin).deploy(
      "Staking Token",
      "TOK",
      18
    )) as ERC20Test;
  });

  beforeEach(async () => {
    const Staking = await ethers.getContractFactory("BaseStakingV2");
    staking = (await Staking.deploy(
      stakingToken.address,
      penaltyDays,
      penaltyBP,
      treasury.address,
      minAmountToStake,
      distributor.address
    )) as BaseStakingV2;

    await staking.setStakingAllowed(true);

    for (const account of [distributor, buyer1]) {
      await stakingToken
        .connect(admin)
        .transfer(account.address, ethers.utils.parseEther("1000000"));
    }
  });

  describe("Staked token name and symbol", () => {
    it("should get the staked token name", async () => {
      const name = await staking.name();
      expect(name).to.be.eq("Staked Staking Token");
    });

    it("should get the staked token symbol", async () => {
      const symbol = await staking.symbol();
      expect(symbol).to.be.eq("stTOK");
    });
  });

  describe("Staking", () => {
    beforeEach(async () => {
      // approve tokens
      await stakingToken
        .connect(buyer1)
        .approve(staking.address, ethers.constants.MaxUint256);
    });

    it("should allow users to stake", async () => {
      const amount = ethers.utils.parseEther("100");

      await staking.connect(buyer1).stake(amount);
      expect(await staking.balanceOf(buyer1.address)).to.be.eq(amount);

      await staking.connect(buyer1).stake(amount);
      expect(await staking.balanceOf(buyer1.address)).to.be.eq(amount.mul(2));
    });

    it("prevents staking when staking not allowed", async () => {
      const amount = ethers.utils.parseEther("100");

      await staking.connect(admin).setStakingAllowed(false);

      // expect staking to fail
      await expect(staking.connect(buyer1).stake(amount)).to.revertedWith(
        "Staking not allowed"
      );
    });

    it("prevents staking when amount lower than min amount", async () => {
      const amount = minAmountToStake.sub(1);

      // expect staking to fail
      await expect(staking.connect(buyer1).stake(amount)).to.revertedWith(
        "Amount less than min amount"
      );
    });
  });

  describe("Unstaking", () => {
    const stakeAmount = ethers.utils.parseEther("1000");

    beforeEach(async () => {
      // approve tokens
      await stakingToken
        .connect(buyer1)
        .approve(staking.address, ethers.constants.MaxUint256);

      // stake tokens
      await staking.connect(buyer1).stake(stakeAmount);
    });

    it("should allow users to unstake", async () => {
      const unstakeAmount = ethers.utils.parseEther("100");

      let totalUnstake = BigNumber.from(0);

      // fails if unstaking more than stake
      await expect(
        staking.connect(buyer1).unstake(stakeAmount.add(1))
      ).to.revertedWith("Amount exceeds balance");

      // create 5 vesting positions
      for (let i = 0; i < 5; i++) {
        await staking.connect(buyer1).unstake(unstakeAmount.sub(i));
        totalUnstake = totalUnstake.add(unstakeAmount.sub(i));
      }

      expect(await staking.balanceOf(buyer1.address)).to.be.eq(
        stakeAmount.sub(totalUnstake)
      );

      // check vesting length
      expect(await staking.getVestingLength(buyer1.address)).to.be.eq(5);

      const vesting = await staking.getVesting(buyer1.address);
      expect(vesting[0].amount).to.eq(unstakeAmount);
      expect(vesting[0].index).to.eq(0);

      expect(vesting[4].amount).to.eq(unstakeAmount.sub(4));
      expect(vesting[4].index).to.eq(4);
    });
  });

  describe("Claiming", () => {
    const stakeAmount = ethers.utils.parseEther("1000");
    const unstakes: { amount: BigNumber; index: BigNumber }[] = [];

    beforeEach(async () => {
      // approve tokens
      await stakingToken
        .connect(buyer1)
        .approve(staking.address, ethers.constants.MaxUint256);

      // stake tokens
      await staking.connect(buyer1).stake(stakeAmount);

      const unstakeAmount = ethers.utils.parseEther("100");

      for (let i = 0; i < 5; i++) {
        await staking.connect(buyer1).unstake(unstakeAmount.sub(i));
        unstakes.push({
          amount: unstakeAmount.sub(i),
          index: BigNumber.from(i),
        });
      }
    });

    it("should allow users to claim with penalty", async () => {
      // check vesting length
      expect(await staking.getVestingLength(buyer1.address)).to.be.eq(5);

      const penalty = unstakes[2].amount.mul(penaltyBP).div(10000);

      const tokenBalanceBefore = await stakingToken.balanceOf(buyer1.address);
      const treasuryBalanceBefore = await stakingToken.balanceOf(
        treasury.address
      );

      // expect claim with index 2 to emit claim event
      await expect(staking.connect(buyer1).claim(2))
        .to.emit(staking, "Claimed")
        .withArgs(buyer1.address, unstakes[2].amount.sub(penalty), penalty); // penalty is 10 %

      // check vesting length
      expect(await staking.getVestingLength(buyer1.address)).to.be.eq(4);

      // check vesting
      const vesting = await staking.getVesting(buyer1.address);
      expect(vesting[2].amount).to.eq(unstakes[4].amount);
      expect(vesting[2].index).to.eq(2);

      // check balance
      const tokenBalanceAfter = await stakingToken.balanceOf(buyer1.address);
      const treasuryBalanceAfter = await stakingToken.balanceOf(
        treasury.address
      );

      expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(
        unstakes[2].amount.sub(penalty)
      );
      expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.be.eq(penalty);
    });

    it("should allow users to claim without penalty", async () => {
      const tokenBalanceBefore = await stakingToken.balanceOf(buyer1.address);
      const treasuryBalanceBefore = await stakingToken.balanceOf(
        treasury.address
      );

      await increaseTime(+penaltyDays.mul(86400));

      // expect claim with index 2 to emit claim event
      await expect(staking.connect(buyer1).claim(2))
        .to.emit(staking, "Claimed")
        .withArgs(buyer1.address, unstakes[2].amount, 0);

      // check vesting length
      expect(await staking.getVestingLength(buyer1.address)).to.be.eq(4);

      // check balance
      const tokenBalanceAfter = await stakingToken.balanceOf(buyer1.address);
      const treasuryBalanceAfter = await stakingToken.balanceOf(
        treasury.address
      );

      expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(
        unstakes[2].amount
      );
      expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.be.eq(0);
    });

    it("prevents claim if index out of bounds", async () => {
      await expect(staking.connect(buyer1).claim(6)).to.revertedWith(
        "Invalid index"
      );
    });

    it("prevents claim if user has no vesting", async () => {
      await expect(staking.connect(nonBuyer).claim(0)).to.revertedWith(
        "Invalid index"
      );
    });
  });

  describe("Restricted functions", () => {
    it("should let admin set penalty day", async () => {
      await expect(staking.connect(admin).setPenaltyDays(5))
        .to.emit(staking, "PenaltyDaysUpdated")
        .withArgs(5);

      expect(await staking.penaltyDays()).to.be.eq(5);

      // non owner
      await expect(staking.connect(nonAdmin).setPenaltyDays(5)).to.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should let admin set penalty base point", async () => {
      await expect(staking.connect(admin).setPenaltyBP(5000))
        .to.emit(staking, "PenaltyBPUpdated")
        .withArgs(5000);

      expect(await staking.penaltyBP()).to.be.eq(5000);

      await expect(
        staking.connect(nonAdmin).setPenaltyBP(5000)
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("should let admin set treasury", async () => {
      const randomAddress = ethers.Wallet.createRandom().address;

      await expect(staking.connect(admin).setTreasury(randomAddress))
        .to.emit(staking, "TreasuryUpdated")
        .withArgs(randomAddress);

      expect(await staking.treasury()).to.be.eq(randomAddress);

      await expect(
        staking.connect(nonAdmin).setTreasury(randomAddress)
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("should let admin update minimum stake amount", async () => {
      await expect(staking.connect(admin).setMinAmount(10))
        .to.emit(staking, "SetMinAmount")
        .withArgs(10);

      expect(await staking.minAmount()).to.be.eq(10);

      await expect(staking.connect(nonAdmin).setMinAmount(10)).to.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should let admin update Distributor address", async () => {
      const randomAddress = ethers.Wallet.createRandom().address;

      await expect(staking.connect(admin).setDistributor(randomAddress))
        .to.emit(staking, "SetDistributor")
        .withArgs(randomAddress);

      expect(await staking.distributor()).to.be.eq(randomAddress);

      await expect(
        staking.connect(nonAdmin).setDistributor(randomAddress)
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("should let admin update staking allowed", async () => {
      expect(await staking.stakingAllowed()).to.be.true;

      await expect(staking.connect(admin).setStakingAllowed(false))
        .to.emit(staking, "SetStakingAllowed")
        .withArgs(false);

      expect(await staking.stakingAllowed()).to.be.false;

      // if new value is as same as old value
      await expect(
        staking.connect(admin).setStakingAllowed(false)
      ).to.revertedWith("Already set");

      await expect(
        staking.connect(nonAdmin).setStakingAllowed(true)
      ).to.revertedWith("Ownable: caller is not the owner");
    });
  });
});
