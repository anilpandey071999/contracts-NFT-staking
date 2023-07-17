/* eslint-disable camelcase */
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Pill__factory, Pill } from "../../typechain-types";
import { expect } from "chai";

describe("Pill NFTs", () => {
  let admin: SignerWithAddress;
  let minter: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let PillFactory: Pill__factory;
  let Pill: Pill;

  const params = {
    name: "Layer AI Pill",
    symbol: "LAIC",
    contractUri: "https://store.layerai.com/nfts/Pills/contract.json",
    baseTokenUri: "https://store.layerai.com/nfts/Pills/",
  };

  const tierExpirations = [10, 20, 30, 40, 50];

  before(async () => {
    [admin, minter, user1, user2, user3] = await ethers.getSigners();
    PillFactory = await ethers.getContractFactory("Pill", admin);
  });

  beforeEach(async () => {
    Pill = (await upgrades.deployProxy(PillFactory, [
      params.name,
      params.symbol,
      params.contractUri,
      params.baseTokenUri,
    ])) as Pill;
  });

  const setTierExpiration = async () => {
    const expiration = tierExpirations;
    const setExpir = await Pill.setTierExpiration(expiration);
    await setExpir.wait();
  };

  it("should not let reinitialization of a contract", async () => {
    await expect(
      Pill.initialize(
        params.name,
        params.symbol,
        params.contractUri,
        params.baseTokenUri
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("should set tier expiration", async () => {
    await Pill.setTierExpiration([10, 20, 50, 60]);
    expect(await Pill.tierExpiration(0)).to.be.eq(10);
  });

  it("should not set tier expiration with mismatched lengths", async () => {
    const expiration: number[] = [];
    await expect(Pill.setTierExpiration(expiration)).to.be.revertedWith(
      "Invalid length"
    );
    for (let i = 0; i < 257; i++) {
      expiration.push(i);
    }
    await expect(Pill.setTierExpiration(expiration)).to.be.revertedWith(
      "Invalid length"
    );
  });

  it("should not set tier expiration if not admin", async () => {
    const expiration: number[] = [];
    for (let i = 0; i < 257; i++) {
      expiration.push(i);
    }
    await expect(Pill.connect(user1).setTierExpiration(expiration)).to.be
      .reverted;
  });

  it("should be able to mint one NFT at a time", async () => {
    await setTierExpiration();
    await Pill.mint(minter.address, 1);
    expect(await Pill.ownerOf(1)).to.be.eq(minter.address);
  });

  it("should be not able to mint NFT", async () => {
    await setTierExpiration();
    await expect(Pill.mint(minter.address, 6)).to.be.revertedWith(
      "Pill: Invalid tier"
    );
  });

  it("should be not able to mint NFT calling from none minter address", async () => {
    await setTierExpiration();
    await expect(Pill.connect(user1).mint(minter.address, 6)).to.be.reverted;
  });

  it("should be able to mintMultiple", async () => {
    await setTierExpiration();
    const to = [
      admin.address,
      minter.address,
      user1.address,
      user2.address,
      user3.address,
    ];
    const tier = [0, 1, 2, 3, 4];
    await Pill.mintMultiple(to, tier);
    expect(await Pill.ownerOf(1)).to.be.eq(admin.address);
  });

  it("should not be able to mintMultiple", async () => {
    await setTierExpiration();
    const to = [admin.address, minter.address, user1.address, user2.address];
    const tier = [0, 1, 2, 3, 4];
    await expect(Pill.mintMultiple(to, tier)).to.be.revertedWith(
      "Pill: Invalid lengths"
    );
  });

  it("should not be able to mintMultiple NFT calling from none minter address", async () => {
    await setTierExpiration();
    const to = [
      admin.address,
      minter.address,
      user1.address,
      user2.address,
      user3.address,
    ];
    const tier = [0, 1, 2, 3, 4];
    await expect(Pill.connect(user1).mintMultiple(to, tier)).to.be.reverted;
  });

  context("when paused", () => {
    const MINTER_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("MINTER_ROLE")
    );

    beforeEach(async () => {
      await setTierExpiration();
      await Pill.mintMultiple([user1.address, user2.address], [1, 2]);

      await Pill.pause();
      await Pill.grantRole(MINTER_ROLE, minter.address);
    });

    it("allows minting to allowlisted minter", async () => {
      await expect(
        Pill.connect(minter).mint(user1.address, 1)
      ).to.be.rejectedWith("Pausable: paused");

      await Pill.allowlist(minter.address, true);

      await Pill.connect(minter).mint(user1.address, 1);
    });

    it("prevents transfers", async () => {
      await expect(
        Pill.connect(user1).transferFrom(user1.address, user2.address, 1)
      ).to.be.rejectedWith("Pausable: paused");
    });
  });

  it("should set token URI", async () => {
    await Pill.setTokenURI(1, "test token uri");
    expect(await Pill._tokenURI(1)).to.be.eq("test token uri");
  });

  it("should set base token URI", async () => {
    await Pill.setBaseTokenURI("test token uri");
    expect(await Pill.baseTokenURI()).to.be.eq("test token uri");
  });

  describe("getExpiry", () => {
    beforeEach(async () => {
      await setTierExpiration();
    });

    it("returns 0 if timer hasn't started yet", async () => {
      const block = await ethers.provider.getBlock("latest");
      await Pill.setExpiryStart(block.timestamp + 100000);
      await Pill.connect(admin).mint(user1.address, 3);

      const { tier, time } = await Pill.getExpiry(1);
      expect(time).to.eq(0);
      expect(tier).to.eq(3);
    });

    it("returns expiry time if tier was set after start time", async () => {
      const block = await ethers.provider.getBlock("latest");

      const expiryStart = block.timestamp - tierExpirations[0] - 10;
      await Pill.setExpiryStart(expiryStart);
      await Pill.connect(admin).mint(user1.address, 0);

      const { time: expiryTime } = await Pill.expiryOf(1);
      const { tier, time } = await Pill.getExpiry(1);
      expect(time).to.eq(expiryTime);
      expect(tier).to.eq(0);
    });

    it("returns expiry time if tier was before start time", async () => {
      await Pill.connect(admin).mint(user1.address, 0);
      const { time: expiryTime } = await Pill.expiryOf(1);

      const block = await ethers.provider.getBlock("latest");

      const expiryStart = expiryTime.toNumber() - 8;
      await Pill.setExpiryStart(expiryStart);

      // mine block
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      const { tier, time } = await Pill.getExpiry(1);
      expect(time).to.eq(expiryStart + tierExpirations[0]);
      expect(tier).to.eq(0);
    });
  });

  describe("uriScheme", () => {
    it("sets urischeme", async () => {
      await expect(Pill.connect(user1).setUriScheme(2)).to.be.reverted;

      await Pill.connect(admin).setUriScheme(2);
      expect(await Pill.uriScheme()).to.eq(2);
    });

    it("returns the correct uri for static scheme", async () => {
      await Pill.connect(admin).setUriScheme(1);

      const uri = await Pill.tokenURI(1);

      console.log("uri", uri);
      expect(uri).to.eq(params.baseTokenUri + "Pill.json");
    });

    it("returns the correct uri for default (by token ID) scheme", async () => {
      await Pill.connect(admin).setUriScheme(0);

      const uri = await Pill.tokenURI(1);

      console.log("uri", uri);
      expect(uri).to.eq(params.baseTokenUri + "1.json");
    });

    it("returns the correct uri for tier scheme", async () => {
      await setTierExpiration();
      await Pill.connect(admin).setUriScheme(2);
      await Pill.connect(admin).mint(user1.address, 2);

      const uri = await Pill.tokenURI(1);

      console.log("uri", uri);
      expect(uri).to.eq(params.baseTokenUri + "tier/2.json");
    });
  });
});
