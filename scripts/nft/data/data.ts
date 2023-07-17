import { tokens } from "../../shared/data/addresses";
import { utils } from "ethers";

interface IERC721Data {
  [key: string]: {
    name: string;
    symbol: string;
    contractUri: string;
    baseTokenUri: string;
  };
}
interface ISaleData {
  [key: string]: {
    nftToken: string;
    paymentToken: string;
    startTime: number;
    price: string;
    refundTimeLimit: number;
  };
}

export const erc721DeployData: IERC721Data = {
  bsctest: {
    name: "Test token",
    symbol: "TEST",
    contractUri:
      "https://storage.googleapis.com/cactus-coconut/testnft/contract.json",
    baseTokenUri: "https://storage.googleapis.com/cactus-coconut/testnft/",
  },
  hardhat: {
    name: "Test token",
    symbol: "TEST",
    contractUri:
      "https://storage.googleapis.com/cactus-coconut/testnft/contract.json",
    baseTokenUri: "https://storage.googleapis.com/cactus-coconut/testnft/",
  },
};

export const waifuSaleData: ISaleData = {
  bsctest: {
    nftToken: tokens.bsctest.waifu,
    paymentToken: tokens.bsctest.gpt,
    startTime: 1680692400,
    price: utils.parseEther("5250").toString(),
    refundTimeLimit: 1680692400 + 5 * 86400,
  },
  bsc: {
    nftToken: tokens.bsc.waifu,
    paymentToken: tokens.bsc.gpt,
    startTime: 1680692400,
    price: utils.parseEther("6750").toString(),
    refundTimeLimit: 1683158399,
  },
  mainnet: {
    nftToken: tokens.mainnet.waifu,
    paymentToken: tokens.mainnet.gpt,
    startTime: 1680692400,
    price: utils.parseEther("5250").toString(),
    refundTimeLimit: 1683158399,
  },
};
