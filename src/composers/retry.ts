import type { Composer, Fetch } from "../types.ts";

type RetryOptions = {
  shouldRetry?: (data: { response?: Response; error?: Error }) => boolean;
  maxRetries?: number;
};

type DefaultRetryOptions = Required<RetryOptions>;

const optionsDefaults: DefaultRetryOptions = {
  maxRetries: 3,
  shouldRetry: ({ error }) => !!error,
};

const normalizeOptions = (options?: RetryOptions): DefaultRetryOptions => {
  const withDefaults = { ...optionsDefaults, ...(options ?? {}) };

  if (withDefaults.maxRetries < 1) withDefaults.maxRetries = 1;

  return withDefaults;
};

export const retry = <F extends Fetch = Fetch>(
  options?: RetryOptions,
): Composer<F> => {
  const { maxRetries, shouldRetry } = normalizeOptions(options);

  return (fetchImpl) => {
    let currentTry = 0;

    return (async (input, init) => {
      let response: Response | undefined;
      let error: Error | undefined;
      const errors = [] as Error[];

      do {
        response = undefined;
        error = undefined;
        currentTry += 1;

        try {
          response = await fetchImpl(input, init);
        } catch (err) {
          error = err;
          errors.push(err);
        }
      } while (shouldRetry({ error, response }) && currentTry < maxRetries);

      // Only throw max retries error if the max retries allows more than one request.
      if (maxRetries > 1 && currentTry >= maxRetries) {
        throw new AggregateError(
          errors,
          `Max retries of "${maxRetries}" reached`,
        );
      }

      if (error) throw error;

      return response!;
    }) as F;
  };
};
