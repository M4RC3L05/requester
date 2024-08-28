import type { Composer, Fetch } from "../types.ts";

type SkipOptions = { n: number };

export const skip = <F extends Fetch = Fetch>(
  { n }: SkipOptions,
  composer: Composer<F>,
): Composer<F> =>
(fetchImpl) => {
  let skipCount = 0;
  const composedFetch = composer(fetchImpl);

  return ((input, init) => {
    skipCount += 1;
    skipCount = Math.min(skipCount, n + 1);

    if (skipCount <= n) {
      return fetchImpl(input, init);
    } else {
      return composedFetch(input, init);
    }
  }) as F;
};
