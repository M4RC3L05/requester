import type { Composer } from "../types.ts";

export const timeout =
  (options: { ms: number }): Composer => (fetchImpl) => (input, init) => {
    const timeoutSignal = AbortSignal.timeout(options.ms);
    let clonedInit = init ? { ...init } : init;

    if (clonedInit) {
      clonedInit.signal = clonedInit.signal
        ? AbortSignal.any([clonedInit.signal, timeoutSignal])
        : timeoutSignal;
    } else clonedInit = { signal: timeoutSignal };

    return fetchImpl(input, clonedInit);
  };
