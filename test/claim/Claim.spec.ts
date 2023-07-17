import { Claim, ERC20Test } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { getBlockTimestamp } from "../../lib/provider";

describe("Claim", function () {
  let owner: SignerWithAddress,
    nonOwner: SignerWithAddress,
    claimant1: SignerWithAddress,
    claimant2: SignerWithAddress,
    claimant3: SignerWithAddress,
    Claim: ContractFactory,
    claimContract: Claim,
    token: ERC20Test;

  before(async () => {
    [owner, nonOwner, claimant1, claimant2, claimant3] =
      await ethers.getSigners();

    const Token = await ethers.getContractFactory("ERC20Test");
    token = (await Token.connect(owner).deploy("Test", "TST", 6)) as ERC20Test;

    Claim = await ethers.getContractFactory("Claim");
  });

  it("shows 0 claimable amount as default", async () => {
    claimContract = (await Claim.connect(owner).deploy(
      await getBlockTimestamp(),
      token.address
    )) as Claim;

    expect(await claimContract.connect(owner).rewardToken()).to.eq(
      token.address
    );
    expect(await claimContract.connect(owner).totalRewards()).to.eq(0);
    expect(await claimContract.connect(owner).totalWithdrawn()).to.eq(0);

    for (const claimant of [claimant1, claimant2, claimant3]) {
      const userInfo = await claimContract
        .connect(owner)
        .userInfo(claimant.address);
      expect(userInfo.reward).to.eq(0);
      expect(userInfo.withdrawn).to.eq(0);
    }
  });

  describe("#addClaimants()", async () => {
    beforeEach(async () => {
      claimContract = (await Claim.connect(owner).deploy(
        await getBlockTimestamp(),
        token.address
      )) as Claim;
    });

    it("prevents non-owner to set claimants", async () => {
      const claimants = [claimant1.address, claimant2.address];
      const rewards = [1, 2];

      await expect(
        claimContract.connect(nonOwner).addClaimants(claimants, rewards)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("prevents setting claimants with malformed request", async () => {
      const claimants = [claimant1.address];
      const rewards = [1, 2];

      await expect(
        claimContract.connect(owner).addClaimants(claimants, rewards)
      ).to.be.revertedWith("Arrays do not have equal length");
    });

    it("enables owner to set claimants", async () => {
      const claimants = [claimant1.address, claimant2.address];
      const rewards = [1, 2];

      await expect(
        claimContract.connect(owner).addClaimants(claimants, rewards)
      ).to.emit(claimContract, "ClaimantsAdded");

      let userInfo = await claimContract
        .connect(owner)
        .userInfo(claimant1.address);
      expect(userInfo.reward).to.eq(1);
      expect(userInfo.withdrawn).to.eq(0);

      userInfo = await claimContract.connect(owner).userInfo(claimant2.address);
      expect(userInfo.reward).to.eq(2);
      expect(userInfo.withdrawn).to.eq(0);

      userInfo = await claimContract.connect(owner).userInfo(claimant3.address);
      expect(userInfo.reward).to.eq(0);
      expect(userInfo.withdrawn).to.eq(0);

      expect(await claimContract.connect(owner).totalRewards()).to.eq(3);
      expect(await claimContract.connect(owner).totalWithdrawn()).to.eq(0);
    });

    it("enables owner to re-set claimants", async () => {
      let claimants = [claimant1.address, claimant2.address];
      let rewards = [100, 200];

      await expect(
        claimContract.connect(owner).addClaimants(claimants, rewards)
      ).to.emit(claimContract, "ClaimantsAdded");

      claimants = [claimant1.address, claimant2.address];
      rewards = [50, 220];

      await expect(
        claimContract.connect(owner).addClaimants(claimants, rewards)
      ).to.emit(claimContract, "ClaimantsAdded");

      expect(await claimContract.connect(owner).totalRewards()).to.eq(270);
      expect(await claimContract.connect(owner).totalWithdrawn()).to.eq(0);
    });

    it("enables owner to freeze claimants", async () => {
      const claimants = [
        claimant1.address,
        claimant2.address,
        claimant3.address,
      ];
      const rewards = [100, 200, 300];

      await expect(
        claimContract.connect(owner).addClaimants(claimants, rewards)
      ).to.emit(claimContract, "ClaimantsAdded");

      await token.transfer(claimContract.address, 300);
      await claimContract.connect(claimant1).claim();

      await expect(
        claimContract.connect(owner).freezeRewards(claimants.slice(0, 2))
      ).to.emit(claimContract, "RewardsFrozen");

      const userInfo = await claimContract
        .connect(owner)
        .userInfo(claimant1.address);
      expect(userInfo.reward).to.eq(20);
      expect(userInfo.withdrawn).to.eq(20);

      expect(await claimContract.connect(owner).totalRewards()).to.eq(320);
      expect(await claimContract.connect(owner).totalWithdrawn()).to.eq(20);
    });
  });

  describe("#updateClaimTimestamp", async () => {
    it("prevents non-owner to set claimants", async () => {
      const timestamp = await getBlockTimestamp();

      claimContract = (await Claim.connect(owner).deploy(
        timestamp + 1500,
        token.address
      )) as Claim;

      await expect(
        claimContract.connect(nonOwner).updateClaimTimestamp(timestamp + 3600)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      expect(await claimContract.connect(nonOwner).claimTime()).to.eq(
        timestamp + 1500
      );
    });

    it("enables changing claimTime for owner", async () => {
      const timestamp = await getBlockTimestamp();
      claimContract = (await Claim.connect(owner).deploy(
        timestamp + 1500,
        token.address
      )) as Claim;

      await claimContract.connect(owner).updateClaimTimestamp(timestamp + 3600);
      expect(await claimContract.connect(nonOwner).claimTime()).to.eq(
        timestamp + 3600
      );
    });
  });
});
