// deno-lint-ignore-file no-explicit-any
import { assertEquals, describe, FakeTime, it, spy } from "../test_deps.ts";
import { delay } from "./delay.ts";

describe("delay()", () => {
  it("should apply specified delay", async () => {
    const time = new FakeTime(0);
    const fetchSpy = spy();

    const p = delay({ ms: 1000 })(fetchSpy as any)("foo");

    await time.tickAsync(500);

    assertEquals(fetchSpy.calls.length, 0);

    await time.tickAsync(500);

    assertEquals(fetchSpy.calls.length, 1);

    await p;
  });

  it("should cancel delay if signal is aborted", async () => {
    const time = new FakeTime(0);
    const ac = new AbortController();
    const fetchSpy = spy();

    const p = delay({ ms: 1000 })(fetchSpy as any)("foo", {
      signal: ac.signal,
    });

    await time.tickAsync(500);

    assertEquals(fetchSpy.calls.length, 0);

    ac.abort();

    await p;

    assertEquals(fetchSpy.calls.length, 1);
  });
});
