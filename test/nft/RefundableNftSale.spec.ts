/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {
  RefundableNftSale,
  ERC721Base,
  ERC20Test,
} from "../../typechain-types";
import { mineBlock, setNextBlockTimestamp } from "../../lib/hardhat";

describe("RefundableNftSale", () => {
  const provider = ethers.provider;

  let owner: SignerWithAddress,
    nonOwner: SignerWithAddress,
    buyers: SignerWithAddress[];

  let refundableNftSale: RefundableNftSale;
  let nft: ERC721Base;
  let paymentToken: ERC20Test;
  let startTime: number;
  let endTime: number;
  let price: BigNumber;
  let refundTimeLimit: number;

  before(async () => {
    [owner, nonOwner, ...buyers] = await ethers.getSigners();

    price = BigNumber.from("10");

    const PaymentToken = await ethers.getContractFactory("ERC20Test");
    paymentToken = await PaymentToken.deploy("Test", "TST", 18);

    // Increasing buyers' balances
    await Promise.all(
      buyers.map(
        async (buyer) =>
          await paymentToken.transfer(
            buyer.address,
            ethers.utils.parseEther("1000")
          )
      )
    );
  });

  beforeEach(async () => {
    const blockNumber = (await provider.getBlock("latest")).timestamp;
    refundTimeLimit = blockNumber + 8640000;

    const Nft = await ethers.getContractFactory("ERC721Base");
    nft = await Nft.deploy("Test", "TST", "contract URI", "base token URI");

    const RefundableNftSale = await ethers.getContractFactory(
      "RefundableNftSale"
    );

    startTime = blockNumber;
    endTime = startTime + 8640000;
    refundableNftSale = await RefundableNftSale.deploy(
      nft.address,
      paymentToken.address,
      startTime,
      endTime,
      price,
      refundTimeLimit
    );

    // Approving refundableNftSale contract in behalf of buyers
    await Promise.all(
      buyers.map(
        async (buyer) =>
          await paymentToken
            .connect(buyer)
            .approve(refundableNftSale.address, ethers.constants.MaxUint256)
      )
    );
  });

  describe("setRefundTimeLimit", () => {
    it("it should set the refund time limit", async () => {
      expect(await refundableNftSale.refundTimeLimit()).to.be.eq(
        refundTimeLimit
      );

      // fail - calling by non owner
      await expect(
        refundableNftSale.connect(nonOwner).setRefundTimeLimit(999)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // fail - invalid time (less than now)
      await expect(
        refundableNftSale.connect(owner).setRefundTimeLimit(999)
      ).to.be.revertedWith("invalid time");

      // success - calling be owner
      const now = (await provider.getBlock("latest")).timestamp;

      await expect(
        refundableNftSale.connect(owner).setRefundTimeLimit(now + 10)
      )
        .to.emit(refundableNftSale, "RefundTimeChanged")
        .withArgs(refundTimeLimit, now + 10);

      expect(await refundableNftSale.refundTimeLimit()).to.be.eq(now + 10);
    });
  });

  describe("setStartTime", () => {
    it("it should set start time", async () => {
      expect(await refundableNftSale.startTime()).to.be.eq(startTime);

      // fail - calling by non owner
      await expect(
        refundableNftSale.connect(nonOwner).setStartTime(999)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // success - calling be owner
      const now = (await provider.getBlock("latest")).timestamp;

      await expect(refundableNftSale.connect(owner).setStartTime(now + 10))
        .to.emit(refundableNftSale, "StartTimeChanged")
        .withArgs(startTime, now + 10);

      expect(await refundableNftSale.startTime()).to.be.eq(now + 10);
    });
  });

  describe("setEndTime", () => {
    it("it should set end time", async () => {
      expect(await refundableNftSale.endTime()).to.be.eq(endTime);

      // fail - calling by non owner
      await expect(
        refundableNftSale.connect(nonOwner).setEndTime(999)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // success - calling be owner
      const now = (await provider.getBlock("latest")).timestamp;

      await expect(refundableNftSale.connect(owner).setEndTime(now + 10))
        .to.emit(refundableNftSale, "EndTimeChanged")
        .withArgs(endTime, now + 10);

      expect(await refundableNftSale.endTime()).to.be.eq(now + 10);
    });
  });

  describe("setPrice", () => {
    it("it should set price", async () => {
      expect(await refundableNftSale.price()).to.be.eq(price);

      // fail - calling by non owner
      await expect(
        refundableNftSale.connect(nonOwner).setPrice(999)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // success - call be owner
      const newPrice = "10";
      await expect(refundableNftSale.connect(owner).setPrice(newPrice))
        .to.emit(refundableNftSale, "PriceChange")
        .withArgs(price, newPrice);

      expect(await refundableNftSale.price()).to.be.eq(newPrice);
    });
  });

  describe("listTokens", () => {
    it("it should list NFTs", async () => {
      const tokenIds = [0, 1, 2, 3];

      // fail - calling by non owner
      await expect(
        refundableNftSale.connect(nonOwner).listTokens(tokenIds)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // success - call be owner
      await expect(refundableNftSale.connect(owner).listTokens(tokenIds))
        .to.emit(refundableNftSale, "TokenListed")
        .withArgs(tokenIds[0]);

      expect(await refundableNftSale.getAvailableTokensLength()).to.be.eq(4);

      for (let i = 0; i < tokenIds.length; i++) {
        const availableTokensArray =
          await refundableNftSale.getAvailableTokens();

        expect(availableTokensArray[i]).to.be.eq(i);
        expect(await refundableNftSale.availableTokens(i)).to.be.eq(i);
      }
    });
  });

  describe("buyToken", () => {
    const tokenIds = [...Array(10).keys()];

    beforeEach(async () => {
      // list tokens
      await refundableNftSale.connect(owner).listTokens(tokenIds);
      await nft.connect(owner).mintMultiple(
        tokenIds.map(() => refundableNftSale.address),
        tokenIds
      );
    });

    it("should let user buy an NFT", async () => {
      let expectedAvailableTokens = [...tokenIds];
      for (let i = 0; i < tokenIds.length; i++) {
        const buyer = buyers[i];

        const tx = await refundableNftSale.connect(buyer).buyToken();

        const receipt = await tx.wait();

        const tokenSoldEvent = receipt.events?.filter((x) => {
          return x.event === "TokenSold";
        })[0];

        const {
          tokenId: nftId,
          buyer: nftBuyer,
          price: nftPrice,
        } = tokenSoldEvent?.args as any;

        expect(tokenIds).contains(+nftId);
        expect(buyers.map((buyer) => buyer.address)).contains(nftBuyer);
        expect(nftPrice).to.be.eq(price);

        expect(buyers.map((buyer) => buyer.address)).contains(
          await nft.ownerOf(nftId)
        );

        expect(await refundableNftSale.getAvailableTokensLength()).to.be.eq(
          tokenIds.length - i - 1
        );

        expectedAvailableTokens = expectedAvailableTokens.filter(
          (id) => id !== +nftId
        );

        expect(
          (await refundableNftSale.getAvailableTokens()).map((el) => +el)
        ).to.have.members(expectedAvailableTokens);
        expect(await refundableNftSale.getSoldTokensLength()).to.be.eq(i + 1);
        expect((await refundableNftSale.getSoldTokens())[i]).to.be.eq(nftId);

        expect(await refundableNftSale.isTokenAvailable(nftId)).to.be.false;
        expect(await refundableNftSale.isTokenSold(nftId)).to.be.true;

        expect(
          (await refundableNftSale.refundableTokens(nftId)).buyer
        ).to.be.eq(nftBuyer);
        expect(
          (await refundableNftSale.refundableTokens(nftId)).price
        ).to.be.eq(price);
        expect(
          (await refundableNftSale.refundableTokens(nftId)).tokenId
        ).to.be.eq(nftId);

        expect(
          await paymentToken.balanceOf(refundableNftSale.address)
        ).to.be.eq(price.mul(i + 1));
      }

      // when no token is available
      await expect(
        refundableNftSale.connect(buyers[0]).buyToken()
      ).to.be.revertedWith("Not tokens available");

      // when sale is ended
      await refundableNftSale.connect(owner).setEndTime(0);
      await expect(
        refundableNftSale.connect(buyers[0]).buyToken()
      ).to.be.revertedWith("Ended");
      await refundableNftSale.connect(owner).setEndTime(endTime);

      // when paused
      await refundableNftSale.connect(owner).pause();
      await expect(
        refundableNftSale.connect(buyers[0]).buyToken()
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("refundToken", () => {
    const tokenIds = [0, 1];
    let buyer_0: SignerWithAddress, buyer_1: SignerWithAddress;

    beforeEach(async () => {
      [buyer_0, buyer_1] = buyers;

      // list tokens
      await refundableNftSale.connect(owner).listTokens(tokenIds);
      await nft.connect(owner).mintMultiple(
        tokenIds.map(() => refundableNftSale.address),
        tokenIds
      );

      // buy tokens
      const tx1 = await refundableNftSale.connect(buyer_0).buyToken();
      const tx2 = await refundableNftSale.connect(buyer_1).buyToken();

      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const tokenSoldEvent1 = receipt1.events?.filter((x) => {
        return x.event === "TokenSold";
      })[0];
      const tokenSoldEvent2 = receipt2.events?.filter((x) => {
        return x.event === "TokenSold";
      })[0];

      const { tokenId: buyer_0_nft } = tokenSoldEvent1?.args as any;
      const { tokenId: buyer_1_nft } = tokenSoldEvent2?.args as any;

      tokenIds[0] = buyer_0_nft;
      tokenIds[1] = buyer_1_nft;

      await nft
        .connect(buyer_0)
        .setApprovalForAll(refundableNftSale.address, true);
      await nft
        .connect(buyer_1)
        .setApprovalForAll(refundableNftSale.address, true);
    });

    it("should refund token", async () => {
      let tokenId = tokenIds[0];
      const now = (await provider.getBlock("latest")).timestamp;

      await expect(refundableNftSale.connect(buyer_0).refundToken(tokenId))
        .to.emit(refundableNftSale, "TokenRefunded")
        .withArgs(tokenId, buyer_0.address, price, now + 1);

      expect(await refundableNftSale.claimable(buyer_0.address)).to.be.eq(
        price
      );

      expect(await refundableNftSale.getRefundedTokensLength()).to.be.eq(1);
      expect((await refundableNftSale.getRefundedTokens())[0]).to.be.eq(
        tokenId
      );
      expect(await refundableNftSale.isTokenRefunded(tokenId)).to.be.true;
      expect(await nft.ownerOf(tokenId)).to.be.eq(refundableNftSale.address);

      // when token is not refundable
      tokenId = 999;
      await expect(
        refundableNftSale.connect(buyer_0).refundToken(tokenId)
      ).to.be.rejectedWith("Cannot refund 0 price");

      // when refund time limit is passed
      await setNextBlockTimestamp(refundTimeLimit);
      await mineBlock();

      tokenId = tokenIds[1];
      await expect(
        refundableNftSale.connect(buyer_1).refundToken(tokenId)
      ).to.be.rejectedWith("Refund limit passed");

      // when contract is paused
      await refundableNftSale.connect(owner).pause();
      await expect(
        refundableNftSale.connect(buyer_1).refundToken(tokenId)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("claim", () => {
    const tokenIds = [0, 1];
    let buyer_0: SignerWithAddress, buyer_1: SignerWithAddress;

    beforeEach(async () => {
      [buyer_0, buyer_1] = buyers;

      // list tokens
      await refundableNftSale.connect(owner).listTokens(tokenIds);
      await nft.connect(owner).mintMultiple(
        tokenIds.map(() => refundableNftSale.address),
        tokenIds
      );

      // buy tokens
      const tx1 = await refundableNftSale.connect(buyer_0).buyToken();
      const tx2 = await refundableNftSale.connect(buyer_0).buyToken();

      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();

      const tokenSoldEvent1 = receipt1.events?.filter((x) => {
        return x.event === "TokenSold";
      })[0];
      const tokenSoldEvent2 = receipt2.events?.filter((x) => {
        return x.event === "TokenSold";
      })[0];

      const { tokenId: buyer_0_nft } = tokenSoldEvent1?.args as any;
      const { tokenId: buyer_1_nft } = tokenSoldEvent2?.args as any;

      tokenIds[0] = buyer_0_nft;
      tokenIds[1] = buyer_1_nft;

      await nft
        .connect(buyer_0)
        .setApprovalForAll(refundableNftSale.address, true);
      await nft
        .connect(buyer_1)
        .setApprovalForAll(refundableNftSale.address, true);
    });

    it("should claim refunded funds", async () => {
      const tokenId = tokenIds[0];
      let now = (await provider.getBlock("latest")).timestamp;

      await expect(refundableNftSale.connect(buyer_0).refundToken(tokenId))
        .to.emit(refundableNftSale, "TokenRefunded")
        .withArgs(tokenId, buyer_0.address, price, now + 1);

      expect(await refundableNftSale.claimable(buyer_0.address)).to.be.eq(
        price
      );
      expect(await refundableNftSale.totalClaims()).to.be.eq(price);

      now = (await provider.getBlock("latest")).timestamp;
      await expect(refundableNftSale.connect(buyer_0).refundToken(tokenIds[1]))
        .to.emit(refundableNftSale, "TokenRefunded")
        .withArgs(tokenIds[1], buyer_0.address, price, now + 1);

      expect(await refundableNftSale.claimable(buyer_0.address)).to.be.eq(
        price.mul(2)
      );
      expect(await refundableNftSale.totalClaims()).to.be.eq(price.mul(2));

      // claim when refunds not over yet
      await expect(
        refundableNftSale.connect(buyer_0).claim()
      ).to.be.rejectedWith("Refunds not over");

      // when refund time limit is passed
      await setNextBlockTimestamp(refundTimeLimit);
      await mineBlock();

      // with nothing refunded
      await expect(
        refundableNftSale.connect(buyer_1).claim()
      ).to.be.rejectedWith("Nothing to claim");

      now = (await provider.getBlock("latest")).timestamp;
      const balanceBefore = await paymentToken.balanceOf(buyer_0.address);

      await expect(refundableNftSale.connect(buyer_0).claim())
        .to.emit(refundableNftSale, "Claimed")
        .withArgs(buyer_0.address, price.mul(2), now + 1);

      const balanceAfter = await paymentToken.balanceOf(buyer_0.address);
      expect(balanceAfter.sub(balanceBefore)).to.eq(price.mul(2));

      expect(await refundableNftSale.claimable(buyer_0.address)).to.be.eq(0);
      expect(await refundableNftSale.totalClaims()).to.be.eq(0);

      await expect(
        refundableNftSale.connect(buyer_0).claim()
      ).to.be.rejectedWith("Nothing to claim");
    });
  });

  describe("withdrawERC20", () => {
    const balance = ethers.utils.parseEther("1000");
    const receiver = ethers.Wallet.createRandom().address;

    beforeEach(async () => {
      await paymentToken
        .connect(owner)
        .transfer(refundableNftSale.address, balance);
    });

    it("should withdraw erc20 token", async () => {
      await refundableNftSale
        .connect(owner)
        .withdrawERC20(paymentToken.address, receiver, 0);

      expect(await paymentToken.balanceOf(receiver)).to.be.eq(balance);

      // fail - call by non owner

      expect(
        refundableNftSale
          .connect(nonOwner)
          .withdrawERC20(paymentToken.address, receiver, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("withdrawERC721", () => {
    const tokenId = 0;
    const receiver = ethers.Wallet.createRandom().address;

    beforeEach(async () => {
      await nft.connect(owner).mint(refundableNftSale.address, tokenId);
    });

    it("should withdraw erc20 token", async () => {
      await refundableNftSale
        .connect(owner)
        .withdrawERC721(nft.address, receiver, tokenId);

      expect(await nft.ownerOf(tokenId)).to.be.eq(receiver);

      // fail - call by non owner

      expect(
        refundableNftSale
          .connect(nonOwner)
          .withdrawERC721(nft.address, receiver, tokenId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("withdrawERC721Multiple", () => {
    const tokenIds = [0, 1];
    const receiver = ethers.Wallet.createRandom().address;

    beforeEach(async () => {
      await nft.connect(owner).mintMultiple(
        tokenIds.map(() => refundableNftSale.address),
        tokenIds
      );
    });

    it("should withdraw erc20 token", async () => {
      await refundableNftSale
        .connect(owner)
        .withdrawERC721Multiple(nft.address, receiver, tokenIds);

      expect(await nft.ownerOf(tokenIds[0])).to.be.eq(receiver);
      expect(await nft.ownerOf(tokenIds[1])).to.be.eq(receiver);

      // fail - call by non owner

      expect(
        refundableNftSale
          .connect(nonOwner)
          .withdrawERC721Multiple(nft.address, receiver, tokenIds)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
