// deno-lint-ignore-file no-explicit-any
import { assertEquals, describe, fail, it, spy } from "../test_deps.ts";
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
});
