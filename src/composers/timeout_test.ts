// deno-lint-ignore-file no-explicit-any
import { assertEquals, describe, it, spy, stub } from "../test_deps.ts";
import type { Fetch } from "../types.ts";
import { timeout } from "./timeout.ts";

describe("timeout()", () => {
  it("should add timeout", async () => {
    const fetchSpy = spy();
    const abortSignalTimeoutStub = stub(
      AbortSignal,
      "timeout",
      () => "foo" as any,
    );

    await timeout({ ms: 1000 })(fetchSpy as any as Fetch)("");

    assertEquals(fetchSpy.calls.length, 1);
    assertEquals(fetchSpy.calls[0].args, ["", { signal: "foo" }]);
    assertEquals(abortSignalTimeoutStub.calls.length, 1);
    assertEquals(abortSignalTimeoutStub.calls[0].args, [1000]);

    abortSignalTimeoutStub.restore();
  });

  it("should compose timer of one already exists", async () => {
    const fetchSpy = spy();
    const abortSignalTimeoutStub = stub(
      AbortSignal,
      "timeout",
      () => "foo" as any,
    );
    const abortSignalAnyStub = stub(
      AbortSignal,
      "any",
      () => "foo" as any,
    );

    await timeout({ ms: 1000 })(fetchSpy as any as Fetch)("", {
      signal: "bar" as any,
    });

    assertEquals(fetchSpy.calls.length, 1);
    assertEquals(fetchSpy.calls[0].args, ["", { signal: "foo" }]);
    assertEquals(abortSignalTimeoutStub.calls.length, 1);
    assertEquals(abortSignalTimeoutStub.calls[0].args, [1000]);
    assertEquals(abortSignalAnyStub.calls.length, 1);
    assertEquals(abortSignalAnyStub.calls[0].args, [["bar", "foo"]] as any[]);

    abortSignalTimeoutStub.restore();
    abortSignalAnyStub.restore();
  });
});
