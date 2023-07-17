import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20Test, SpinTest } from "../../typechain-types";
import { mineBlock } from "../../lib/hardhat";
import { BigNumber, utils } from "ethers";

describe("Spin", function () {
  let owner: SignerWithAddress,
    nonOwner: SignerWithAddress,
    user: SignerWithAddress;

  let spin: SpinTest;
  let token: ERC20Test;
  let price: BigNumber;

  before(async () => {
    [owner, nonOwner, user] = await ethers.getSigners();

    price = utils.parseEther("10");
    const Token = await ethers.getContractFactory("ERC20Test");
    token = await Token.connect(owner).deploy("Test", "TST", 18);
  });

  beforeEach(async () => {
    const Spin = await ethers.getContractFactory("SpinTest");
    spin = await Spin.connect(owner).deploy(token.address, price);
  });

  describe("#setRollOptions", () => {
    it("sets roll options", async () => {
      const rollOptionsParams = [
        [0, 1, 2],
        [0, 100, 0],
        [50, 30, 20],
      ];

      const rollOptions = [
        [0, 0, 50],
        [1, 100, 30],
        [2, 0, 20],
      ];

      // non-owner
      await expect(
        spin
          .connect(nonOwner)
          .setRollOptions(
            rollOptionsParams[0],
            rollOptionsParams[1],
            rollOptionsParams[2]
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // owner
      await spin
        .connect(owner)
        .setRollOptions(
          rollOptionsParams[0],
          rollOptionsParams[1],
          rollOptionsParams[2]
        );

      const res = await spin.getRollOptions();

      expect(res.length).to.eq(rollOptions.length);
      expect(res[0].map((i) => i.toString())).to.eql(
        rollOptions[0].map((i) => i.toString())
      );

      expect(res[1].map((i) => i.toString())).to.eql(
        rollOptions[1].map((i) => i.toString())
      );

      expect(res[2].map((i) => i.toString())).to.eql(
        rollOptions[2].map((i) => i.toString())
      );

      expect(await spin.totalRollWeight()).to.eq(100);
    });
  });

  describe("#spin", () => {
    beforeEach(async () => {
      await token.mint(user.address, utils.parseEther("10000000"));
      await token
        .connect(user)
        .approve(spin.address, utils.parseEther("10000000"));
      // owner
      await spin.connect(owner).setRollOptions([0], [0], [100]);
    });

    context("when roll option is Nothing only", () => {
      beforeEach(async () => {
        // owner
        await spin.connect(owner).setRollOptions([0], [0], [100]);
      });

      it("spins", async () => {
        const userBalanceBefore = await token.balanceOf(user.address);
        const treasuryBalanceBefore = await token.balanceOf(owner.address);
        const userSpinBalanceBefore = await spin.balanceOf(user.address);

        await expect(spin.connect(user).spin())
          .to.emit(spin, "RollResult")
          .withArgs(user.address, 0, 0);

        const userBalanceAfter = await token.balanceOf(user.address);
        const treasuryBalanceAfter = await token.balanceOf(owner.address);
        const userSpinBalanceAfter = await spin.balanceOf(user.address);

        expect(userBalanceAfter).to.eq(userBalanceBefore.sub(price));
        expect(treasuryBalanceAfter).to.eq(treasuryBalanceBefore.add(price));
        expect(userSpinBalanceAfter).to.eq(userSpinBalanceBefore);
      });
    });

    context("when roll option is Reroll only", () => {
      beforeEach(async () => {
        // owner
        await spin.connect(owner).setRollOptions([1], [0], [100]);
      });

      it("spins", async () => {
        const userBalanceBefore = await token.balanceOf(user.address);
        const treasuryBalanceBefore = await token.balanceOf(owner.address);
        const userSpinBalanceBefore = await spin.balanceOf(user.address);

        await expect(spin.connect(user).spin())
          .to.emit(spin, "RollResult")
          .withArgs(user.address, 1, 0);

        const userBalanceAfter = await token.balanceOf(user.address);
        const treasuryBalanceAfter = await token.balanceOf(owner.address);
        const userSpinBalanceAfter = await spin.balanceOf(user.address);

        expect(userBalanceAfter).to.eq(userBalanceBefore);
        expect(treasuryBalanceAfter).to.eq(treasuryBalanceBefore);
        expect(userSpinBalanceAfter).to.eq(userSpinBalanceBefore);
      });
    });

    context("when roll option is Amount only", () => {
      beforeEach(async () => {
        // owner
        await spin.connect(owner).setRollOptions([2], [100], [100]);
      });

      it("spins", async () => {
        const userBalanceBefore = await token.balanceOf(user.address);
        const treasuryBalanceBefore = await token.balanceOf(owner.address);
        const userSpinBalanceBefore = await spin.balanceOf(user.address);

        await expect(spin.connect(user).spin())
          .to.emit(spin, "RollResult")
          .withArgs(user.address, 2, 100);

        const userBalanceAfter = await token.balanceOf(user.address);
        const treasuryBalanceAfter = await token.balanceOf(owner.address);
        const userSpinBalanceAfter = await spin.balanceOf(user.address);

        expect(userBalanceAfter).to.eq(userBalanceBefore.sub(price));
        expect(treasuryBalanceAfter).to.eq(treasuryBalanceBefore.add(price));
        expect(userSpinBalanceAfter).to.eq(userSpinBalanceBefore.add(100));
      });
    });

    context("when multiple roll options", () => {
      const reward = 100;

      beforeEach(async () => {
        const rollOptionsParams = [
          [0, 1, 2],
          [0, 0, reward],
          [50, 30, 20],
        ];

        // owner
        await spin
          .connect(owner)
          .setRollOptions(
            rollOptionsParams[0],
            rollOptionsParams[1],
            rollOptionsParams[2]
          );
      });

      it("spins", async () => {
        const totalSpins = 5;

        // get balances before
        const userBalanceBefore = await token.balanceOf(user.address);
        const treasuryBalanceBefore = await token.balanceOf(owner.address);
        const userSpinBalanceBefore = await spin.balanceOf(user.address);

        // spin
        for (let i = 0; i < totalSpins; i++) {
          await spin.connect(user).spin();
        }

        // get events
        const eventFilter = spin.filters.RollResult();
        const events = await spin.queryFilter(eventFilter, 0, "latest");

        // map events count by roll type
        const results: { [key: number]: number } = {};
        events.forEach((event) => {
          const type = event.args?.rollType;
          results[type] = results[type] ? results[type] + 1 : 1;
        });

        const rerolls = results[1] || 0;
        const amounts = results[2] || 0;

        // get balances after
        const userBalanceAfter = await token.balanceOf(user.address);
        const treasuryBalanceAfter = await token.balanceOf(owner.address);
        const userSpinBalanceAfter = await spin.balanceOf(user.address);

        // check balances
        expect(userBalanceAfter).to.eq(
          userBalanceBefore.sub(price.mul(totalSpins - rerolls))
        );

        expect(treasuryBalanceAfter).to.eq(
          treasuryBalanceBefore.add(price.mul(totalSpins - rerolls))
        );

        expect(userSpinBalanceAfter).to.eq(
          userSpinBalanceBefore.add(amounts * reward)
        );

        // console.log("results", results);
      });
    });
  });

  xdescribe("#draw", () => {
    it("draws", async () => {
      const rollOptionsParams = [
        [0, 1, 2],
        [0, 100, 0],
        [50, 30, 20],
      ];

      await spin
        .connect(owner)
        .setRollOptions(
          rollOptionsParams[0],
          rollOptionsParams[1],
          rollOptionsParams[2]
        );

      const results: { [key: number]: number } = {};
      for (let i = 0; i < 1000; i++) {
        await mineBlock();
        const res = await spin.draw();

        results[res.weight.toNumber()] = results[res.weight.toNumber()]
          ? results[res.weight.toNumber()] + 1
          : 1;
      }

      console.log("results", results);
    });
  });
});
