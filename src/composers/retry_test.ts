// deno-lint-ignore-file no-explicit-any
import {
  assertEquals,
  describe,
  fail,
  FakeTime,
  it,
  spy,
  stub,
} from "../test_deps.ts";
import { retry } from "./mod.ts";

describe("retry()", () => {
  it("should assume 3 retries by default", async () => {
    const s = spy(() => {
      throw new Error("foo");
    });

    try {
      await retry()(s)("");

      fail("it should have thown");
    } catch (e) {
      assertEquals(e.message, 'Max retries of "3" reached');
      assertEquals(s.calls.length, 3);
    }
  });

  it("should retry the specified retries", async () => {
    const fetchSpy = spy(() => {
      throw new Error("foo");
    });

    try {
      await retry({ maxRetries: 5 })(fetchSpy)("");

      fail("it should have thown");
    } catch (e) {
      assertEquals(e.message, 'Max retries of "5" reached');
      assertEquals(fetchSpy.calls.length, 5);
    }
  });

  it("should rety if `shouldRetry` returns true", async () => {
    const fetchSpy = spy(() => {
      throw new Error("foo");
    });

    try {
      await retry({
        maxRetries: 5,
        shouldRetry: (() => {
          let i = 0;
          return () => {
            i += 1;

            if (i === 2) {
              return false;
            }

            return true;
          };
        })(),
      })(fetchSpy)("");

      fail("it should have thown");
    } catch (e) {
      assertEquals(e.message, "foo");
      assertEquals(fetchSpy.calls.length, 2);
    }
  });

  it("should return the response if there is no need to retry", async () => {
    const fetchSpy = spy(() => "foo");
    const retrySpy = spy(() => false);

    const response = await retry({ maxRetries: 5, shouldRetry: retrySpy })(
      fetchSpy as any,
    )("");

    assertEquals(response, "foo" as any);
    assertEquals(retrySpy.calls.length, 1);
  });

  it("should allow to execute multiple times", async () => {
    const fetchSpy = spy(() => "foo");
    const retrySpy = spy((() => {
      let i = 0;
      return () => {
        i += 1;

        if (i < 3) return true;

        i = 0;
        return false;
      };
    })());

    const retryFn = retry({ maxRetries: 5, shouldRetry: retrySpy })(
      fetchSpy as any,
    );

    {
      const response = await retryFn("");

      assertEquals(response, "foo" as any);
      assertEquals(retrySpy.calls.length, 3);
    }

    {
      const response = await retryFn("");

      assertEquals(response, "foo" as any);
      assertEquals(retrySpy.calls.length, 6);
    }
  });

  it("should apply a retry delay", async () => {
    const time = new FakeTime(0);
    const unrefSpy = spy();
    const unrefTimerStub = stub(Deno, "unrefTimer", unrefSpy);
    const fetchSpy = spy(() => "foo");

    const p = retry({
      maxRetries: 5,
      shouldRetry: () => true,
      retryDelay: 3000,
      unrefRetryDelay: true,
    })(
      fetchSpy as any,
    )("");

    assertEquals(fetchSpy.calls.length, 1);
    assertEquals(unrefSpy.calls.length, 0);
    await time.tickAsync(3000);
    assertEquals(fetchSpy.calls.length, 2);
    assertEquals(unrefSpy.calls.length, 1);
    await time.tickAsync(2999);
    assertEquals(fetchSpy.calls.length, 2);
    assertEquals(unrefSpy.calls.length, 2);
    await time.tickAsync(1);
    assertEquals(fetchSpy.calls.length, 3);
    assertEquals(unrefSpy.calls.length, 2);
    await time.tickAsync(3000);
    assertEquals(fetchSpy.calls.length, 4);
    assertEquals(unrefSpy.calls.length, 3);
    await time.tickAsync(3000);
    assertEquals(fetchSpy.calls.length, 5);
    assertEquals(unrefSpy.calls.length, 4);

    try {
      await p;

      fail("should have thrown");
    } catch (error) {
      assertEquals(error.message, 'Max retries of "5" reached');
    }

    unrefTimerStub.restore();
    time.restore();
  });

  it("should not apply a retry delay if request was already aborted", async () => {
    const time = new FakeTime(0);
    const unrefSpy = spy();
    const unrefTimerStub = stub(Deno, "unrefTimer", unrefSpy);
    const fetchSpy = spy((_, { signal }) => {
      if (signal?.aborted) throw new Error("Aborted");
      return "foo";
    });
    const ab = new AbortController();

    try {
      const p = retry({
        maxRetries: 5,
        shouldRetry: () => true,
        retryDelay: 3000,
        unrefRetryDelay: true,
      })(
        fetchSpy as any,
      )("", { signal: ab.signal });

      assertEquals(fetchSpy.calls.length, 1);
      assertEquals(unrefSpy.calls.length, 0);
      await time.tickAsync(3000);
      assertEquals(fetchSpy.calls.length, 2);
      assertEquals(unrefSpy.calls.length, 1);
      await time.tickAsync(2999);
      assertEquals(fetchSpy.calls.length, 2);
      assertEquals(unrefSpy.calls.length, 2);
      await time.tickAsync(1);
      assertEquals(fetchSpy.calls.length, 3);
      assertEquals(unrefSpy.calls.length, 2);

      ab.abort();
      await p;

      fail("should have thrown");
    } catch (error) {
      assertEquals(error.message, 'Max retries of "5" reached');
    }

    assertEquals(fetchSpy.calls.length, 5);
    assertEquals(unrefSpy.calls.length, 2);

    unrefTimerStub.restore();
    time.restore();
  });

  it("should abort delay if abort signal from request aborts", async () => {
    const time = new FakeTime(0);
    const unrefSpy = spy();
    const unrefTimerStub = stub(Deno, "unrefTimer", unrefSpy);
    const fetchSpy = spy((_, { signal }) => {
      if (signal?.aborted) throw new Error("Aborted");
      return "foo";
    });
    const ab = new AbortController();

    try {
      const p = retry({
        maxRetries: 5,
        shouldRetry: () => true,
        retryDelay: 3000,
      })(
        fetchSpy as any,
      )("", { signal: ab.signal });

      assertEquals(fetchSpy.calls.length, 1);
      assertEquals(unrefSpy.calls.length, 0);
      await time.tickAsync(3000);
      assertEquals(fetchSpy.calls.length, 2);
      assertEquals(unrefSpy.calls.length, 0);
      await time.tickAsync(2500);
      assertEquals(fetchSpy.calls.length, 2);
      assertEquals(unrefSpy.calls.length, 0);

      ab.abort();

      await p;

      fail("should have thrown");
    } catch (error) {
      assertEquals(error.message, 'Max retries of "5" reached');
    }

    assertEquals(fetchSpy.calls.length, 5);
    assertEquals(unrefSpy.calls.length, 0);

    unrefTimerStub.restore();
    time.restore();
  });
});
