export const dateSeconds = (milis: number) => {
  return Math.floor(milis / 1000);
};

export const dateSecondsParse = (date: string) => {
  return dateSeconds(Date.parse(date));
};
