import type { Composer } from "../types.ts";

export const timeout =
  (options: { ms: number }): Composer => (fetchImpl) => (input, init) => {
    const timeoutSignal = AbortSignal.timeout(options.ms);

    if (init) {
      init.signal = init.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;
    } else init = { signal: timeoutSignal };

    return fetchImpl(input, init);
  };
