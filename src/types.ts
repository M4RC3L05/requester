export type Fetch = (
  input: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

export type Composer<F extends Fetch = Fetch> = (fetchImpl: F) => F;
