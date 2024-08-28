import type { Composer, Fetch } from "../types.ts";

type DelayOptions = {
  unref?: boolean;
  ms: number;
};

const checkMethod = (obj: unknown, method: string) =>
  typeof obj === "object" && obj !== null &&
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  typeof obj[method] === "function";

const unrefTimer = (timer?: unknown) => {
  try {
    if (
      checkMethod(globalThis?.Deno, "unrefTimer") && typeof timer === "number"
    ) {
      globalThis.Deno.unrefTimer(timer);
    } else if (checkMethod(timer, "unref")) {
      (timer as { unref: () => void }).unref();
    }
  } catch {
    //
  }
};

type NormalizedOptions = Required<DelayOptions>;

const normalizeOptions = (options: DelayOptions): NormalizedOptions => {
  const normalized = { ...options };

  if (!normalized.unref) normalized.unref = false;

  return normalized as NormalizedOptions;
};

export const delay = <F extends Fetch = Fetch>(
  options: DelayOptions,
): Composer<F> => {
  const { ms, unref } = normalizeOptions(options);

  return (fetchImpl) =>
    (async (input, init) => {
      let timer: number | undefined;

      await new Promise<void>((resolve) => {
        const onAbort = () => {
          resolve();
          clearTimeout(timer);
        };

        timer = setTimeout(() => {
          init?.signal?.removeEventListener("abort", onAbort);

          resolve();
        }, ms);

        if (unref) unrefTimer(timer);

        init?.signal?.addEventListener("abort", onAbort, { once: true });
      });

      clearTimeout(timer);

      return fetchImpl(input, init);
    }) as F;
};
