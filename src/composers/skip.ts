import type { Composer } from "../types.ts";

type SkipOptions = { n: number };

export const skip =
  ({ n }: SkipOptions, composer: Composer): Composer => (fetchImpl) => {
    let skipCount = 0;
    const composedFetch = composer(fetchImpl);

    return (input, init) => {
      skipCount += 1;
      skipCount = Math.min(skipCount, n + 1);

      if (skipCount <= n) {
        return fetchImpl(input, init);
      } else {
        return composedFetch(input, init);
      }
    };
  };
