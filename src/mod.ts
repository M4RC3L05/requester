import type { Composer, Fetch } from "./types.ts";

export class Requester<F extends Fetch = Fetch> {
  #fetchImpl: F;
  #composers: Composer<F>[] = [];

  constructor(fetchImpl?: F) {
    this.#fetchImpl = fetchImpl ?? (globalThis.fetch as F);
  }

  with(...comp: Composer<F>[]): this {
    this.#composers.push(...comp);

    return this;
  }

  fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    if (this.#composers.length <= 0) return this.#fetchImpl(input, init);

    return this.#composers.reduce(
      (acc, curr) => curr(acc),
      this.#fetchImpl,
    )(input, init);
  }
}
