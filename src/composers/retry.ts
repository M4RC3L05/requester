import type { Composer } from "../types.ts";

type RetryOptions = {
  shouldRetry?: (data: { response?: Response; error?: Error }) => boolean;
  maxRetries?: number;
};

const optionsDefaults: Required<RetryOptions> = {
  maxRetries: 3,
  shouldRetry: ({ error }) => !!error,
};

const normalizeOptions = (options?: RetryOptions): Required<RetryOptions> => {
  const withDefaults = { ...optionsDefaults, ...(options ?? {}) };

  if (withDefaults.maxRetries < 1) withDefaults.maxRetries = 1;

  return withDefaults;
};

export const retry = (
  options?: RetryOptions,
): Composer =>
(fetchImpl) => {
  let currentTry = 0;

  const { maxRetries, shouldRetry } = normalizeOptions(options);

  return async (input, init) => {
    let response: Response | undefined;
    let error: Error | undefined;

    do {
      response = undefined;
      error = undefined;
      currentTry += 1;

      try {
        response = await fetchImpl(input, init);
      } catch (err) {
        error = err;
      }
    } while (shouldRetry({ error, response }) && currentTry < maxRetries);

    // Only throw max retries error if the max retries allows more than one request.
    if (maxRetries > 1 && currentTry >= maxRetries) {
      throw new Error(`Max retries of "${maxRetries!}" reached`);
    }

    if (error) throw error;

    return response!;
  };
};
