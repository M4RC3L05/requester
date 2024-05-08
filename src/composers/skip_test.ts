// deno-lint-ignore-file no-explicit-any
import { assertEquals, describe, it, spy } from "../test_deps.ts";
import { skip } from "./skip.ts";

describe("skip()", () => {
  it("should skip specified times", async () => {
    const fetchSpy = spy();
    const fetchSpy2 = spy();

    const skips = skip({ n: 3 }, () => fetchSpy2 as any)(
      fetchSpy as any,
    );

    await skips("foo");

    assertEquals(fetchSpy2.calls.length, 0);

    await skips("foo");

    assertEquals(fetchSpy2.calls.length, 0);

    await skips("foo");

    assertEquals(fetchSpy2.calls.length, 0);

    await skips("foo");

    assertEquals(fetchSpy2.calls.length, 1);
  });

  it("should not skip if n is 0", async () => {
    const fetchSpy = spy();
    const fetchSpy2 = spy();

    const skips = skip({ n: 0 }, () => fetchSpy2 as any)(
      fetchSpy as any,
    );

    await skips("foo");

    assertEquals(fetchSpy2.calls.length, 1);
  });
});
