import { utils } from "ethers";

const claimants = [
  // ["0x44C90EB63081D208fc58169B2B91CF79E264C8e5", "160000"],
  // ["0xa112fC0Beb3fCe06cCDED05978824d7c9FdE1682", "20000"],
  ["0x97804d60f9D695544fcFd1797605f5d1c90f445f", "100000"],
];

const duplicates = claimants.filter((i) => {
  return (
    claimants.filter((j) => {
      return i[0].toLowerCase() === j[0].toLowerCase();
    }).length > 1
  );
});

// get occurences of duplicates
// const occurences: any = duplicates.reduce((acc: any, i) => {
//   acc[i[0]] = (acc[i[0]] || 0) + 1;
//   return acc;
// }, {});

// log sorted duplicated by address
// console.log(
//   "duplicates",
//   duplicates.sort((a, b) => {
//     return a[0].toLowerCase() > b[0].toLowerCase() ? 1 : -1;
//   })
// );

// remove duplicates
const unique = claimants.filter((i) => {
  return (
    claimants.filter((j) => {
      return i[0].toLowerCase() === j[0].toLowerCase();
    }).length === 1
  );
});

// console.log(
//   "unique.length",
//   unique.length,
//   claimants.length,
//   duplicates.length
// );

// const sum = claimants.reduce((acc, i) => {
//   return acc + Number(i[1]);
// }, 0);

// console.log(sum);

const mapped = claimants.map((i) => {
  return [i[0], utils.parseEther(i[1]).toString()];
});

const addresses = [];
const values = [];

for (const i of mapped) {
  addresses.push(i[0]);
  values.push(i[1]);
}

// console.log(mapped);
console.log(addresses.toString());
console.log(values.toString());
