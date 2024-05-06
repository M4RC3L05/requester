// deno-lint-ignore-file no-explicit-any
import { Requester } from "./mod.ts";
import { assertEquals, describe, it, spy } from "./test_deps.ts";
import type { Composer } from "./types.ts";

describe("Requester", () => {
  it("should create a new requester with composers applied", async () => {
    const stack: number[] = [];
    const fetchSpy = spy(() => {
      stack.push(3);

      return "foo";
    });
    const composerOne = spy<any, Parameters<Composer>, ReturnType<Composer>>(
      (f) => {
        return (a, b) => {
          stack.push(1);
          return f(a, b);
        };
      },
    );
    const composerTwo = spy<any, Parameters<Composer>, ReturnType<Composer>>(
      (f) => {
        return (a, b) => {
          stack.push(2);
          return f(a, b);
        };
      },
    );

    const requester = new Requester(fetchSpy as any).with(
      composerOne,
      composerTwo,
    ).build();

    const response = await requester("foo");

    assertEquals(stack, [2, 1, 3]);
    assertEquals(response, "foo");
  });
});
