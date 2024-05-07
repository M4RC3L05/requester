import type { Composer } from "../types.ts";

type RetryOptions = {
  shouldRetry?: (data: { response?: Response; error?: Error }) => boolean;
  maxRetries?: number;
  retryDelay?: number;
};

type DefaultRetryOptions = Required<
  Pick<RetryOptions, "maxRetries" | "retryDelay" | "shouldRetry">
>;

const optionsDefaults: DefaultRetryOptions = {
  maxRetries: 3,
  shouldRetry: ({ error }) => !!error,
  retryDelay: 0,
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

const normalizeOptions = (options?: RetryOptions): DefaultRetryOptions => {
  const withDefaults = { ...optionsDefaults, ...(options ?? {}) };

  if (withDefaults.maxRetries < 1) withDefaults.maxRetries = 1;
  if (withDefaults.retryDelay < 0) withDefaults.retryDelay = 0;

  return withDefaults;
};

export const retry = (
  options?: RetryOptions,
): Composer => {
  const { maxRetries, shouldRetry, retryDelay } = normalizeOptions(options);

  return (fetchImpl) => async (input, init) => {
    let currentTry = 0;
    let response: Response | undefined;
    let error: Error | undefined;
    const timers: number[] = [];

    do {
      response = undefined;
      error = undefined;
      currentTry += 1;

      // Apply delay on retries and if retry delay is not 0 and the request was not aborted.
      if (currentTry > 1 && retryDelay > 0 && !init?.signal?.aborted) {
        await new Promise<void>((resolve) => {
          const i = setTimeout(resolve, retryDelay);
          timers.push(i);

          unrefTimer(i);
        });
      }

      try {
        response = await fetchImpl(input, init);
      } catch (err) {
        error = err;
      }
    } while (shouldRetry({ error, response }) && currentTry < maxRetries);

    timers.forEach((timer) => clearTimeout(timer));

    // Only throw max retries error if the max retries allows more than one request.
    if (maxRetries > 1 && currentTry >= maxRetries) {
      throw new Error(`Max retries of "${maxRetries}" reached`);
    }

    if (error) throw error;

    return response!;
  };
};
