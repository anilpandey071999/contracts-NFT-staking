import { network } from "hardhat";
import { claimParams } from "./data/claimParams";

module.exports = Object.values(claimParams[network.name]);
