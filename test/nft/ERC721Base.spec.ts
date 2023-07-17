/* eslint-disable camelcase */
/* eslint-disable no-unused-expressions */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC721Base } from "../../typechain-types";

describe("ERC721Base", () => {
  const baseUri = "baseUri";
  const contractUri = "contractUri";

  let owner: SignerWithAddress,
    nonOwner: SignerWithAddress,
    addAddress: SignerWithAddress,
    royaltyReceiver: SignerWithAddress,
    user: SignerWithAddress,
    minter: SignerWithAddress;
  let nft: ERC721Base;

  const minterRole = ethers.utils.id("MINTER_ROLE");

  before(async () => {
    [owner, nonOwner, addAddress, royaltyReceiver, user, minter] =
      await ethers.getSigners();
  });

  beforeEach(async () => {
    const Nft = await ethers.getContractFactory("ERC721Base");
    nft = await Nft.deploy("Test", "TST", contractUri, baseUri);

    await nft.connect(owner).grantRole(minterRole, minter.address);
    await nft.connect(owner).allowlist(minter.address, true);
  });

  describe("contract URI", () => {
    it("allows setting contract uri to owner", async () => {
      // non owner
      await expect(nft.connect(nonOwner).setContractURI("newUri")).to.be
        .reverted;
      expect(await nft.contractURI()).to.eq(contractUri);

      // owner
      await nft.connect(owner).setContractURI("newUri");
      expect(await nft.contractURI()).to.eq("newUri");
    });
  });

  describe("base URI", () => {
    it("returns default base uri when not set", async () => {
      expect(await nft.tokenURI(1)).to.eq(baseUri + "1.json");
    });

    it("allows setting global base URI", async () => {
      const newBaseUri = "newBaseUri";
      // non owner
      await expect(nft.connect(nonOwner).setBaseTokenURI(newBaseUri)).to.be
        .reverted;
      expect(await nft.tokenURI(1)).to.eq(baseUri + "1.json");

      // owner
      await nft.connect(owner).setBaseTokenURI(newBaseUri);
      expect(await nft.tokenURI(1)).to.eq(newBaseUri + "1.json");
    });

    it("allows setting URI per token ID", async () => {
      const newBaseUri = "newBaseUri";
      // non owner
      await expect(nft.connect(nonOwner).setTokenURI(1, newBaseUri)).to.be
        .reverted;
      expect(await nft.tokenURI(1)).to.eq(baseUri + "1.json");

      // owner
      await nft.connect(owner).setTokenURI(1, newBaseUri);
      expect(await nft.tokenURI(1)).to.eq(newBaseUri);
      expect(await nft.tokenURI(2)).to.eq(baseUri + "2.json");
    });

    it("allows removing URI per token ID", async () => {
      const newBaseUri = "newBaseUri";
      await nft.connect(owner).setTokenURI(1, newBaseUri);

      // non owner
      await expect(nft.connect(nonOwner).removeTokenURI(1)).to.be.reverted;
      expect(await nft.tokenURI(1)).to.eq(newBaseUri);

      // owner
      await nft.connect(owner).removeTokenURI(1);
      expect(await nft.tokenURI(1)).to.eq(baseUri + "1.json");
    });
  });

  describe("allowlist", () => {
    it("should allow owner to add user to the allow list", async () => {
      const allowedUser = ethers.Wallet.createRandom().address;

      // fail, non-owner
      await expect(nft.connect(nonOwner).allowlist(allowedUser, true)).to.be
        .reverted;

      await expect(nft.connect(owner).allowlist(allowedUser, true))
        .to.emit(nft, "Allowlisted")
        .withArgs(allowedUser, true);

      expect(await nft.allowlisted(allowedUser)).to.be.true;

      await expect(nft.connect(owner).allowlist(allowedUser, false))
        .to.emit(nft, "Allowlisted")
        .withArgs(allowedUser, false);

      expect(await nft.allowlisted(allowedUser)).to.be.false;
    });

    it("should allow owner to add multiple users to the allow list", async () => {
      const allowedUsers = [];
      const statuses = [];

      for (let i = 0; i < 3; i++) {
        allowedUsers.push(ethers.Wallet.createRandom().address);
        statuses.push(true);
      }
      // fail, non-owner
      await expect(
        nft.connect(nonOwner).allowlistMultiple(allowedUsers, statuses)
      ).to.be.reverted;

      // fail, invalid length
      await expect(
        nft.connect(owner).allowlistMultiple(allowedUsers, [true])
      ).to.be.revertedWith("Invalid lengths");

      await nft.connect(owner).allowlistMultiple(allowedUsers, statuses);

      for (let i = 0; i < 3; i++) {
        expect(await nft.allowlisted(allowedUsers[i])).to.be.true;
      }
    });
  });

  describe("blocklist", () => {
    it("should allow owner to add user to the block list", async () => {
      const blockedUser = ethers.Wallet.createRandom().address;

      // fail, non-owner
      await expect(nft.connect(nonOwner).blocklist(blockedUser, true)).to.be
        .reverted;

      await expect(nft.connect(owner).blocklist(blockedUser, true))
        .to.emit(nft, "Blocklisted")
        .withArgs(blockedUser, true);

      expect(await nft.blocklisted(blockedUser)).to.be.true;

      await expect(nft.connect(owner).blocklist(blockedUser, false))
        .to.emit(nft, "Blocklisted")
        .withArgs(blockedUser, false);

      expect(await nft.blocklisted(blockedUser)).to.be.false;
    });

    it("should allow owner to add multiple users to the allow list", async () => {
      const blockedUsers = [];
      const statuses = [];

      for (let i = 0; i < 3; i++) {
        blockedUsers.push(ethers.Wallet.createRandom().address);
        statuses.push(true);
      }
      // fail, non-owner
      await expect(
        nft.connect(nonOwner).blocklistMultiple(blockedUsers, statuses)
      ).to.be.reverted;

      // fail, invalid length
      await expect(
        nft.connect(owner).blocklistMultiple(blockedUsers, [true])
      ).to.be.revertedWith("Invalid lengths");

      await nft.connect(owner).blocklistMultiple(blockedUsers, statuses);

      for (let i = 0; i < 3; i++) {
        expect(await nft.blocklisted(blockedUsers[i])).to.be.true;
      }
    });
  });

  describe("pause", () => {
    it("should pause the contract", async () => {
      // fail - calling by non owner
      await expect(nft.connect(nonOwner).pause()).to.be.reverted;

      // success
      expect(await nft.paused()).to.be.false;

      expect(await nft.connect(owner).pause())
        .to.emit(nft, "Paused")
        .withArgs(owner.address);

      expect(await nft.paused()).to.be.true;
    });

    it("should unpause the contract", async () => {
      // fail - calling by non owner
      await expect(nft.connect(nonOwner).unpause()).to.be.reverted;

      // success
      await nft.connect(owner).pause();
      expect(await nft.paused()).to.be.true;

      expect(await nft.connect(owner).unpause())
        .to.emit(nft, "Unpaused")
        .withArgs(owner.address);

      expect(await nft.paused()).to.be.false;
    });
  });

  describe("mint", () => {
    it("allows minting a single token", async () => {
      const [to, tokenId] = [owner.address, 1];

      // non owner
      await expect(nft.connect(nonOwner).mint(to, tokenId)).to.be.reverted;

      // Success when contract is paused and called by minter
      await nft.connect(owner).pause();
      await nft.connect(minter).mint(to, tokenId);
      expect(await nft.ownerOf(tokenId)).to.eq(to);
    });
  });

  describe("mint multiple", () => {
    it("allows minting tokens to multiple addresses", async () => {
      const to = [owner.address, nonOwner.address, addAddress.address];
      const tokenIds = [1, 2, 3];

      // non owner
      await expect(nft.connect(nonOwner).mintMultiple(to, tokenIds)).to.be
        .reverted;

      // Success when contract is paused and called by owner
      await nft.connect(owner).pause();
      await nft.connect(minter).mintMultiple(to, tokenIds);

      // check all addresses
      for (let i = 0; i < tokenIds.length; i++) {
        expect(await nft.ownerOf(tokenIds[i])).to.eq(to[i]);
      }
    });
  });

  describe("burn", () => {
    let tokenOwner: SignerWithAddress;
    let tokenId: number;

    beforeEach(async () => {
      tokenOwner = royaltyReceiver;
      tokenId = 1;

      await nft.connect(owner).mint(tokenOwner.address, tokenId);
    });

    it("allows token owner to burn the token", async () => {
      // Fail, calling by non-owner
      await expect(nft.connect(nonOwner).burn(tokenId)).to.be.revertedWith(
        "ERC721: caller is not token owner or approved"
      );

      // Success
      await nft.connect(owner).setTokenURI(tokenId, "Custom_URI");
      expect(await nft._tokenURI(tokenId)).to.be.eq("Custom_URI");

      await expect(nft.connect(tokenOwner).burn(tokenId))
        .to.emit(nft, "Transfer")
        .withArgs(tokenOwner.address, ethers.constants.AddressZero, tokenId);

      expect(await nft._tokenURI(tokenId)).to.be.eq("");
    });
  });

  describe("transfer", () => {
    it("should transfer when contract is unpaused", async () => {
      const tokenIds = [0, 1, 2, 3];
      const receivers = [...Array(tokenIds.length)].map(() => user.address); // array of duplicated user address

      await nft.connect(owner).mintMultiple(receivers, tokenIds);

      // fail when contract is paused
      await nft.connect(owner).pause();
      let tokenId = tokenIds[0];

      await expect(
        nft.connect(user).transferFrom(user.address, nonOwner.address, tokenId)
      ).to.be.revertedWith("Pausable: paused");

      // success when contract is not paused
      await nft.connect(owner).unpause();
      await expect(
        nft.connect(user).transferFrom(user.address, nonOwner.address, tokenId)
      )
        .to.emit(nft, "Transfer")
        .withArgs(user.address, nonOwner.address, tokenId);

      // success when contract is paused but user is in allowed list
      await nft.connect(owner).pause();
      await nft.connect(owner).allowlist(user.address, true);
      tokenId = tokenIds[1];

      await expect(
        nft.connect(user).transferFrom(user.address, nonOwner.address, tokenId)
      )
        .to.emit(nft, "Transfer")
        .withArgs(user.address, nonOwner.address, tokenId);

      // fail when contract is not paused but user is in blocked list
      await nft.connect(owner).unpause();
      await nft.connect(owner).blocklist(user.address, true);
      tokenId = tokenIds[2];

      await expect(
        nft.connect(user).transferFrom(user.address, nonOwner.address, tokenId)
      ).to.be.revertedWith("Blocklisted");

      // fail if source is blocklisted
      await nft.connect(user).setApprovalForAll(owner.address, true);

      await expect(
        nft.connect(owner).transferFrom(user.address, nonOwner.address, tokenId)
      ).to.be.revertedWith("Blocklisted");

      // fail if destination is blocklisted
      await nft.connect(owner).blocklist(user.address, false);
      await nft.connect(owner).blocklist(nonOwner.address, true);
      await expect(
        nft.connect(user).transferFrom(user.address, nonOwner.address, tokenId)
      ).to.be.revertedWith("Blocklisted");
    });
  });

  describe("royalty", () => {
    it("should set default royalty", async () => {
      const feeNumerator = 200; // 2%
      // fail - calling by non owner
      await expect(
        nft
          .connect(nonOwner)
          .setDefaultRoyalty(royaltyReceiver.address, feeNumerator)
      ).to.be.reverted;

      // fail - invalid royalty
      await expect(
        nft.connect(owner).setDefaultRoyalty(royaltyReceiver.address, 100000)
      ).to.be.revertedWith("ERC2981: royalty fee will exceed salePrice");

      // success
      await nft
        .connect(owner)
        .setDefaultRoyalty(royaltyReceiver.address, feeNumerator);

      const nftSalePrice = ethers.utils.parseEther("10");
      const royalty = ethers.utils.parseEther("0.2");

      const [receiver, value] = await nft.royaltyInfo(0, nftSalePrice);

      expect(receiver).to.be.eq(royaltyReceiver.address);
      expect(value).to.be.eq(royalty);
    });

    it("should delete default royalty", async () => {
      // fail - calling by non owner
      await expect(nft.connect(nonOwner).deleteDefaultRoyalty()).to.be.reverted;

      // success
      await nft.connect(owner).deleteDefaultRoyalty();

      const [receiver, value] = await nft.royaltyInfo(0, "99999999");

      expect(receiver).to.be.eq(ethers.constants.AddressZero);
      expect(value).to.be.eq(0);
    });

    it("should set royalty specific to token", async () => {
      const tokenId_0 = 0;
      const tokenId_1 = 1;
      const royaltyReceiver_0 = royaltyReceiver.address;
      const royaltyReceiver_1 = owner.address;
      const royaltyReceiver_default = nonOwner.address;
      const feeNumerator_0 = 200; // 2%
      const feeNumerator_1 = 250; // 2/5 %
      const feeNumerator_default = 5000; // 50 %

      // fail - calling by non owner
      await expect(
        nft
          .connect(nonOwner)
          .setTokenRoyalty(tokenId_0, royaltyReceiver_0, feeNumerator_0)
      ).to.be.reverted;

      // success;
      // set royalty for tokens with id 0 and 1
      await nft
        .connect(owner)
        .setTokenRoyalty(tokenId_0, royaltyReceiver_0, feeNumerator_0);
      await nft
        .connect(owner)
        .setTokenRoyalty(tokenId_1, royaltyReceiver_1, feeNumerator_1);

      // set default royalty
      await nft
        .connect(owner)
        .setDefaultRoyalty(royaltyReceiver_default, feeNumerator_default);

      const nftSalePrice_0 = ethers.utils.parseEther("10");
      const nftSalePrice_1 = ethers.utils.parseEther("15");
      const nftSalePrice_dafult = ethers.utils.parseEther("100");

      const royalty_0 = ethers.utils.parseEther("0.2"); // 10e18 * 2 / 100
      const royalty_1 = ethers.utils.parseEther("0.375"); // 15e18 * 2.5 / 100
      const royalty_default = ethers.utils.parseEther("50"); // 100e18 * 50 / 100

      const [receiver_0, value_0] = await nft.royaltyInfo(0, nftSalePrice_0);
      const [receiver_1, value_1] = await nft.royaltyInfo(1, nftSalePrice_1);
      const [receiver_default, value_default] = await nft.royaltyInfo(
        9999,
        nftSalePrice_dafult
      );

      expect(receiver_0).to.be.eq(royaltyReceiver_0);
      expect(value_0).to.be.eq(royalty_0);

      expect(receiver_1).to.be.eq(royaltyReceiver_1);
      expect(value_1).to.be.eq(royalty_1);

      expect(receiver_default).to.be.eq(royaltyReceiver_default);
      expect(value_default).to.be.eq(royalty_default);
    });

    it("should reset token royalty", async () => {
      const tokenId_0 = 0;
      const tokenId_1 = 1;
      const royaltyReceiver_0 = royaltyReceiver.address;
      const royaltyReceiver_1 = owner.address;
      const feeNumerator_0 = 200; // 2%
      const feeNumerator_1 = 250; // 2/5 %

      // fail - calling by non owner
      await expect(nft.connect(nonOwner).resetTokenRoyalty(tokenId_0)).to.be
        .reverted;

      // success;
      // set royalty for tokens with id 0 and 1
      await nft
        .connect(owner)
        .setTokenRoyalty(tokenId_0, royaltyReceiver_0, feeNumerator_0);
      await nft
        .connect(owner)
        .setTokenRoyalty(tokenId_1, royaltyReceiver_1, feeNumerator_1);

      // reset royalty for token 1

      await nft.connect(owner).resetTokenRoyalty(tokenId_1);

      const nftSalePrice_0 = ethers.utils.parseEther("10");
      const nftSalePrice_1 = ethers.utils.parseEther("15");

      const royalty_0 = ethers.utils.parseEther("0.2");
      const royalty_1 = 0;

      const [receiver_0, value_0] = await nft.royaltyInfo(0, nftSalePrice_0);
      const [receiver_1, value_1] = await nft.royaltyInfo(1, nftSalePrice_1);

      expect(receiver_0).to.be.eq(royaltyReceiver_0);
      expect(value_0).to.be.eq(royalty_0);

      expect(receiver_1).to.be.eq(ethers.constants.AddressZero);
      expect(value_1).to.be.eq(royalty_1);
    });
  });
});
