import type { Composer, Fetch } from "../types.ts";

export const timeout =
  <F extends Fetch = Fetch>({ ms }: { ms: number }): Composer<F> =>
  (fetchImpl) =>
    ((input, init) => {
      const timeoutSignal = AbortSignal.timeout(ms);
      let clonedInit = init ? { ...init } : init;

      if (clonedInit) {
        clonedInit.signal = clonedInit.signal
          ? AbortSignal.any([clonedInit.signal, timeoutSignal])
          : timeoutSignal;
      } else clonedInit = { signal: timeoutSignal };

      return fetchImpl(input, clonedInit);
    }) as F;
