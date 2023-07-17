export type Network = "mainnet" | "goerli" | "bsc" | "bsctest";
type Tokens = {
  [key in Network]: {
    [key: string]: string;
  };
};

export const tokens: Tokens = {
  mainnet: {
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    gpt: "0xd04e772bc0d591fbd288f2e2a86afa3d3cb647f8",
    claim1: "0x28366988FFb8a4024649e04107639419c55bC37c",
    stakingProxy: "0xF01c994e79586eeef069D3603AbAE385d64df0E6",
    stakingProxyAdmin: "0xa2b19Fc92C0A9Ef0386566a6978a34b2292f18e5",
    stakingImpl: "0x6a437c06359ec02113552268f5033a444780d8E5",
    waifu: "0x64f3882bf67ef5b94e8ec6cc4ebfbfbc93b93662",
  },
  goerli: {
    usdt: "0xDd4fB2fAa1c2556e627192fC849D59CE8Aa50610",
    usdc: "0x2208B79488be8db461e9bB129850dff7DFC8CA54",
  },
  bsc: {
    busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    gpt: "0x153c0c947177e631e3dfc594ba28750d3a921fb5",
    claim1: "0x8A58Fa390b4169353699236E9b41AB190333f466",
    stakingProxy: "0xEb6F2dDEe8B15Fe0842cc1Efa320D5Bb54f2e16b",
    stakingProxyAdmin: "0x6eFdD9a5f5eB1B5fd3BeCCAed092DD049831cB75",
    stakingImpl: "0x6357114198B1250b5fE43DCe772B656E57e31161",
    waifu: "0x57AD835cD8b356824f13644dFdA56e6c382f56F1",
    waifuSale: "0x2b0fA78a6A84b95cf944F89ed2Eb96e0B549Cf1B",
  },
  bsctest: {
    usdc: "0xdefe4df1afBAFB5EF5cfcb37DFa816778F6134BA",
    usdt: "0x2208B79488be8db461e9bB129850dff7DFC8CA54",
    gpt: "0xA2010fE3F5B6dfa2A4F6e6DD8822B36Afc80d287",
    gptStaking: "0x24Bf5388027F02E6a72675B52cbD8853d5b913f0",
    claim1: "0x8149e4Dab02Bb8b7083FD49fC6d913dfCB263504",
    waifu: "0xA2792b96530195a495Ca243c3b38EC9b5aa7fA29",
    waifuSale: "0x14e3A9D6Bf5f22140C33f5C9F8F5794D924241Ec",
    testERC20: "0xB96727DCF78c1f3567246087Bc4DeA4c3F65f16a",
  },
};
