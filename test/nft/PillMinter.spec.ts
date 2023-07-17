/* eslint-disable camelcase */
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  Pill__factory,
  Pill,
  PillMinter__factory,
  PillMinter,
  ERC20Test,
  ERC20Test__factory,
} from "../../typechain-types";
import { expect } from "chai";

describe("Pill NFTs", () => {
  let admin: SignerWithAddress;
  let treasury: SignerWithAddress;
  let minter: SignerWithAddress, user1: SignerWithAddress;
  let PillFactory: Pill__factory;
  let Pill: Pill;
  let PillMinterFactory: PillMinter__factory;
  let PillMinter: PillMinter;
  let ERC20TokenFactory: ERC20Test__factory;
  let ERC20Token1: ERC20Test;
  let ERC20Token2: ERC20Test;
  let ERC20Token3: ERC20Test;
  const MINTER_ROLE =
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
  const params = {
    name: "Layer AI Pill",
    symbol: "LAIC",
    contractUri: "https://store.layerai.com/nfts/Pills/contract.json",
    baseTokenUri: "https://store.layerai.com/nfts/Pills/",
  };

  before(async () => {
    [admin, minter, user1, treasury] = await ethers.getSigners();
    PillFactory = await ethers.getContractFactory("Pill", admin);
    Pill = (await upgrades.deployProxy(PillFactory, [
      params.name,
      params.symbol,
      params.contractUri,
      params.baseTokenUri,
    ])) as Pill;
    const expiration = [10, 20, 30, 40, 50];
    const setExpir = await Pill.setTierExpiration(expiration);
    await setExpir.wait();
    PillMinterFactory = await ethers.getContractFactory(
      "PillMinter",
      admin
    );
    ERC20TokenFactory = await ethers.getContractFactory("ERC20Test");
    ERC20Token1 = (await ERC20TokenFactory.deploy(
      "TEST1",
      "T1",
      18
    )) as ERC20Test;
    ERC20Token2 = (await ERC20TokenFactory.deploy(
      "TEST2",
      "T2",
      18
    )) as ERC20Test;
    ERC20Token3 = (await ERC20TokenFactory.deploy(
      "TEST3",
      "T3",
      18
    )) as ERC20Test;
  });

  beforeEach(async () => {
    PillMinter = (await PillMinterFactory.deploy(
      Pill.address,
      treasury.address
    )) as PillMinter;
    await Pill.grantRole(MINTER_ROLE, PillMinter.address);
  });

  const setUpForBuy = async () => {
    const paymentTokens = [ERC20Token1.address, ERC20Token2.address];
    const prices = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2")];
    await PillMinter.setTierWeights([1]);

    await PillMinter.connect(admin).setPaymentTokens(paymentTokens, prices);
    await ERC20Token1.transfer(
      user1.address,
      ethers.utils.parseEther("5").toString()
    );
    await ERC20Token1.connect(admin).approve(
      PillMinter.address,
      ethers.utils.parseEther("5").toString()
    );
  };

  it("should verify the Pill NFT address correctly", async () => {
    expect(await PillMinter.PillAddress()).to.be.eq(Pill.address);
  });

  it("should verify the Pill NFT address correctly", async () => {
    expect(await PillMinter.treasury()).to.be.eq(treasury.address);
  });

  it("should verify the Pill NFT address correctly", async () => {
    const paymentTokens = [ERC20Token1.address, ERC20Token2.address];
    const prices = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2")];

    await PillMinter.connect(admin).setPaymentTokens(paymentTokens, prices);

    const paymentTokensAfter = await Promise.all(
      paymentTokens.map(async (address, index) => {
        const tokenData = await PillMinter.paymentTokens(index);
        return {
          address_: tokenData[0],
          price_: tokenData[1].toString(),
        };
      })
    );

    for (let i = 0; i < paymentTokens.length; i++) {
      expect(paymentTokensAfter[i].address_).to.equal(paymentTokens[i]);
      expect(paymentTokensAfter[i].price_).to.equal(prices[i].toString());
    }
  });

  it("should reject mismatched payment token and price", async () => {
    const paymentTokens = [ERC20Token1.address, ERC20Token2.address];
    const prices = [ethers.utils.parseEther("1")];

    await expect(
      PillMinter.connect(admin).setPaymentTokens(paymentTokens, prices)
    ).to.be.rejectedWith(
      "PillMinter: payment tokens and prices must be the same length"
    );
  });

  it("should reject setting payment token and price by non-admin", async () => {
    const paymentTokens = [ERC20Token1.address, ERC20Token2.address];
    const prices = [ethers.utils.parseEther("1")];

    await expect(
      PillMinter.connect(minter).setPaymentTokens(paymentTokens, prices)
    ).to.be.rejected;
  });

  it("should successfully purchase NFT using token", async () => {
    await setUpForBuy();
    await expect(PillMinter.connect(admin).buy(ERC20Token1.address, 1))
      .to.emit(PillMinter, "Buy")
      .withArgs(admin.address, ERC20Token1.address, 1);
  });

  it("should reject the purchase of 0 NFTs", async () => {
    await setUpForBuy();
    await expect(
      PillMinter.connect(admin).buy(ERC20Token1.address, 0)
    ).to.be.rejectedWith("PillMinter: amount must be greater than 0");
  });

  it("should reject purchase of more than 10 NFTs", async () => {
    await setUpForBuy();
    await expect(
      PillMinter.connect(admin).buy(ERC20Token1.address, 11)
    ).to.be.rejectedWith(
      "PillMinter: amount must be less than or equal to 10"
    );
  });

  it("should reject purchase with an unsupported token", async () => {
    await setUpForBuy();
    await expect(
      PillMinter.connect(admin).buy(ERC20Token3.address, 1)
    ).to.be.rejectedWith("PillMinter: payment token not supported");
  });

  it("should reject purchase with an unsupported token", async () => {
    await PillMinter.setTierWeights([1]);
    expect(await PillMinter.tierWeights(0)).to.be.eq(1);
  });

  it("should reject setting tier weights from non-admin", async () => {
    await expect(PillMinter.connect(minter).setTierWeights([1])).to.be
      .rejected;
  });

  it("should successfully mint NFT using the minter contract", async () => {
    await PillMinter.setTierWeights([1]);
    await PillMinter.mint(user1.address);
    expect(await Pill.balanceOf(user1.address)).to.be.eq(1);
  });

  it("should reject minting NFT from non-minter address", async () => {
    await PillMinter.setTierWeights([1]);
    await expect(PillMinter.connect(minter).mint(user1.address)).to.be
      .rejected;
  });

  it("should successfully mint multiple NFTs using the minter contract", async () => {
    await PillMinter.setTierWeights([1]);
    await PillMinter.mintMultipleTo(user1.address, 10);
    expect(await Pill.balanceOf(user1.address)).to.be.eq(11);
  });

  it("should reject minting multiple NFTs from non-minter address", async () => {
    await PillMinter.setTierWeights([1]);
    await expect(
      PillMinter.connect(minter).mintMultipleTo(user1.address, 10)
    ).to.be.rejected;
  });

  describe("mintWithSignature", () => {
    let nonce: number;
    let deadline: number;
    let amount: number;
    let hash: string;
    let signature: string;

    beforeEach(async () => {
      await setUpForBuy();

      // grant role on Pillminter to minter
      await PillMinter.grantRole(MINTER_ROLE, minter.address);

      const { timestamp } = await ethers.provider.getBlock("latest");
      deadline = timestamp + 1000;
      amount = 1;
      nonce = (await PillMinter.nonces(user1.address)).toNumber();

      hash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256"],
        [user1.address, amount, nonce, deadline]
      );

      signature = await minter.signMessage(ethers.utils.arrayify(hash));
    });

    it("mints with correct signature", async () => {
      signature = await minter.signMessage(ethers.utils.arrayify(hash));
      await PillMinter
        .connect(user1)
        .mintWithSignature(1, nonce, deadline, signature);
    });

    it("does not mint with modified data", async () => {
      signature = await minter.signMessage(ethers.utils.arrayify(hash));

      // changed nonce
      await expect(
        PillMinter
          .connect(user1)
          .mintWithSignature(1, nonce + 1, deadline, signature)
      ).to.be.rejectedWith("PillMinter: invalid nonce");

      // changed amount
      await expect(
        PillMinter
          .connect(user1)
          .mintWithSignature(2, nonce, deadline, signature)
      ).to.be.rejectedWith("PillMinter: invalid signature");

      // changed deadline
      await expect(
        PillMinter
          .connect(user1)
          .mintWithSignature(1, nonce, deadline + 1, signature)
      ).to.be.rejectedWith("PillMinter: invalid signature");
    });

    it("does not mint when signed by non-minter", async () => {
      signature = await user1.signMessage(ethers.utils.arrayify(hash));
      await expect(
        PillMinter
          .connect(user1)
          .mintWithSignature(1, nonce, deadline, signature)
      ).to.be.rejectedWith("PillMinter: invalid signature");
    });

    it("does not mint when deadline has passed", async () => {
      hash = await PillMinter.getMessageHash(
        user1.address,
        amount,
        nonce,
        deadline
      );

      const { timestamp } = await ethers.provider.getBlock("latest");
      deadline = timestamp;

      signature = await minter.signMessage(ethers.utils.arrayify(hash));
      await expect(
        PillMinter
          .connect(user1)
          .mintWithSignature(1, nonce + 1, deadline, signature)
      ).to.be.rejectedWith("PillMinter: signature expired");
    });

    context("when replay attack is attempted", () => {
      beforeEach(async () => {
        // mint once correctly
        signature = await minter.signMessage(ethers.utils.arrayify(hash));
        await PillMinter
          .connect(user1)
          .mintWithSignature(1, nonce, deadline, signature);
      });

      it("does not mint with same data", async () => {
        signature = await minter.signMessage(ethers.utils.arrayify(hash));
        await expect(
          PillMinter
            .connect(user1)
            .mintWithSignature(1, nonce, deadline, signature)
        ).to.be.rejectedWith("PillMinter: invalid nonce");
      });

      it("does not mint with manually changed nonce", async () => {
        signature = await minter.signMessage(ethers.utils.arrayify(hash));
        await expect(
          PillMinter
            .connect(user1)
            .mintWithSignature(1, nonce + 1, deadline, signature)
        ).to.be.rejectedWith("PillMinter: invalid signature");
      });
    });
  });
});
