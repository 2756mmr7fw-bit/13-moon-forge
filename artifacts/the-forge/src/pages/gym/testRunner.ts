import { Exercise, TestResult } from "./types";

// ── Utilities ─────────────────────────────────────────────────────────────────
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

function compileUserFn<T>(userCode: string, fnName: string): T {
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict"; ${userCode}; return ${fnName};`)() as T;
}

function makeError(label: string, expected: unknown, error: string): TestResult {
  return { label, passed: false, expected, error };
}

// ── Standard runner ───────────────────────────────────────────────────────────
function runStandardTests(userCode: string, exercise: Exercise): TestResult[] {
  let fn: ((...args: unknown[]) => unknown) | undefined;
  try {
    fn = compileUserFn<(...args: unknown[]) => unknown>(userCode, exercise.functionName);
  } catch (err) {
    return exercise.testCases.map(tc =>
      makeError(tc.label, tc.expected, `Compilation error: ${String(err)}`)
    );
  }

  return exercise.testCases.map(tc => {
    try {
      const actual = fn!(...(tc.args as unknown[]));
      const passed = deepEqual(actual, tc.expected);
      return { label: tc.label, passed, actual, expected: tc.expected, hidden: tc.hidden };
    } catch (err) {
      return { ...makeError(tc.label, tc.expected, String(err)), hidden: tc.hidden };
    }
  });
}

// ── Synchronous SPECIAL_RUNNERS ───────────────────────────────────────────────
// For exercises where args can't be serialized (HOFs, classes, etc.)

export const SPECIAL_RUNNERS: Record<string, (userCode: string) => TestResult[]> = {

  // ── memoize ──────────────────────────────────────────────────────────────────
  "memoize": (userCode) => {
    const results: TestResult[] = [];
    try {
      const memoize = compileUserFn<(fn: (...a: unknown[]) => unknown) => (...a: unknown[]) => unknown>(userCode, "memoize");
      let calls = 0;
      const tracked = memoize((x: unknown) => { calls++; return (x as number) * 2; });
      const r1 = tracked(5);
      results.push({ label: "memoize(fn)(5) returns 10", passed: r1 === 10, actual: r1, expected: 10 });
      const r2 = tracked(5);
      results.push({ label: "returns cached result on second call", passed: r2 === 10, actual: r2, expected: 10 });
      results.push({ label: "original fn called only once for same args", passed: calls === 1, actual: calls, expected: 1 });
      const r3 = tracked(6);
      results.push({ label: "new args invoke fn (memoize(fn)(6) = 12)", passed: r3 === 12, actual: r3, expected: 12 });
      results.push({ label: "total calls after two unique args = 2", passed: calls === 2, actual: calls, expected: 2 });
    } catch (err) {
      results.push(makeError("compilation", "valid memoize function", String(err)));
    }
    return results;
  },

  // ── pipe ──────────────────────────────────────────────────────────────────────
  "pipe": (userCode) => {
    const results: TestResult[] = [];
    try {
      const pipe = compileUserFn<(...fns: ((x: unknown) => unknown)[]) => (x: unknown) => unknown>(userCode, "pipe");
      const add1   = (x: number) => x + 1;
      const times2 = (x: number) => x * 2;
      const r1 = pipe(add1, times2)(3);
      results.push({ label: "pipe(add1, times2)(3) === 8", passed: r1 === 8, actual: r1, expected: 8 });
      const r2 = pipe(times2, add1)(3);
      results.push({ label: "pipe(times2, add1)(3) === 7 — order matters", passed: r2 === 7, actual: r2, expected: 7 });
      const r3 = pipe((x: unknown) => (x as string).toUpperCase())("hello");
      results.push({ label: "pipe works with strings", passed: r3 === "HELLO", actual: r3, expected: "HELLO" });
      const r4 = pipe(add1)(10);
      results.push({ label: "single function in pipe", passed: r4 === 11, actual: r4, expected: 11 });
    } catch (err) {
      results.push(makeError("compilation", "valid pipe function", String(err)));
    }
    return results;
  },

  // ── compose ───────────────────────────────────────────────────────────────────
  "compose": (userCode) => {
    const results: TestResult[] = [];
    try {
      const compose = compileUserFn<(...fns: ((x: unknown) => unknown)[]) => (x: unknown) => unknown>(userCode, "compose");
      const add1   = (x: number) => x + 1;
      const times2 = (x: number) => x * 2;
      const r1 = compose(times2, add1)(3);
      results.push({ label: "compose(times2, add1)(3) === 8 — add1 runs first", passed: r1 === 8, actual: r1, expected: 8 });
      const r2 = compose(add1, times2)(3);
      results.push({ label: "compose(add1, times2)(3) === 7 — order reversed from pipe", passed: r2 === 7, actual: r2, expected: 7 });
      const r3 = compose((x: unknown) => (x as string).toUpperCase(), (x: unknown) => (x as string).trim())("  hello  ");
      results.push({ label: "compose trims then uppercases", passed: r3 === "HELLO", actual: r3, expected: "HELLO" });
      const r4 = compose(add1)(10);
      results.push({ label: "single function", passed: r4 === 11, actual: r4, expected: 11 });
    } catch (err) {
      results.push(makeError("compilation", "valid compose function", String(err)));
    }
    return results;
  },

  // ── curry ────────────────────────────────────────────────────────────────────
  "curry": (userCode) => {
    const results: TestResult[] = [];
    try {
      const curry = compileUserFn<(fn: (...args: unknown[]) => unknown) => unknown>(userCode, "curry");
      const add3   = (a: number, b: number, c: number) => a + b + c;
      const multiply = (a: number, b: number) => a * b;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const curriedAdd = curry(add3) as any;
      const r1 = curriedAdd(1)(2)(3);
      results.push({ label: "curry(add3)(1)(2)(3) === 6", passed: r1 === 6, actual: r1, expected: 6 });
      const r2 = curriedAdd(1, 2)(3);
      results.push({ label: "curry(add3)(1,2)(3) === 6 — partial application", passed: r2 === 6, actual: r2, expected: 6 });
      const r3 = curriedAdd(1)(2, 3);
      results.push({ label: "curry(add3)(1)(2,3) === 6", passed: r3 === 6, actual: r3, expected: 6 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const curriedMul = curry(multiply) as any;
      const double = curriedMul(2);
      const r4 = double(5);
      results.push({ label: "curry creates reusable partial: double(5) === 10", passed: r4 === 10, actual: r4, expected: 10 });
    } catch (err) {
      results.push(makeError("compilation", "valid curry function", String(err)));
    }
    return results;
  },

  // ── once ──────────────────────────────────────────────────────────────────────
  "once": (userCode) => {
    const results: TestResult[] = [];
    try {
      const once = compileUserFn<(fn: (...a: unknown[]) => unknown) => (...a: unknown[]) => unknown>(userCode, "once");
      let callCount = 0;
      const fn = once(() => { callCount++; return callCount; });
      const r1 = fn();
      results.push({ label: "first call returns fn's return value", passed: r1 === 1, actual: r1, expected: 1 });
      const r2 = fn();
      results.push({ label: "second call returns same value without calling fn again", passed: r2 === 1, actual: r2, expected: 1 });
      const r3 = fn();
      results.push({ label: "third call still returns same value", passed: r3 === 1, actual: r3, expected: 1 });
      results.push({ label: "underlying fn called exactly once", passed: callCount === 1, actual: callCount, expected: 1 });
    } catch (err) {
      results.push(makeError("compilation", "valid once function", String(err)));
    }
    return results;
  },

  // ── partial-apply ─────────────────────────────────────────────────────────────
  "partial-apply": (userCode) => {
    const results: TestResult[] = [];
    try {
      const partial = compileUserFn<(fn: (...a: unknown[]) => unknown, ...preset: unknown[]) => (...a: unknown[]) => unknown>(userCode, "partial");
      const multiply = (a: number, b: number) => a * b;
      const add3     = (a: number, b: number, c: number) => a + b + c;

      const double = partial(multiply, 2);
      results.push({ label: "partial(multiply, 2)(5) === 10", passed: double(5) === 10, actual: double(5), expected: 10 });
      results.push({ label: "partial(multiply, 2)(7) === 14", passed: double(7) === 14, actual: double(7), expected: 14 });

      const add10 = partial(add3, 10);
      const r3 = (add10 as (b: number, c: number) => number)(1, 2);
      results.push({ label: "partial(add3, 10)(1, 2) === 13", passed: r3 === 13, actual: r3, expected: 13 });

      // Multiple preset args
      const multiPreset = partial(add3, 10, 5);
      const r4 = (multiPreset as (c: number) => number)(1);
      results.push({ label: "partial with multiple preset args: partial(add3,10,5)(1) === 16", passed: r4 === 16, actual: r4, expected: 16 });
    } catch (err) {
      results.push(makeError("compilation", "valid partial function", String(err)));
    }
    return results;
  },

  // ── flatten-map ───────────────────────────────────────────────────────────────
  "flatten-map": (userCode) => {
    const results: TestResult[] = [];
    try {
      const flatMap = compileUserFn<(arr: unknown[], fn: (x: unknown) => unknown[]) => unknown[]>(userCode, "flatMap");
      const r1 = flatMap([1, 2, 3], (n: unknown) => [n, (n as number) * 2]);
      results.push({ label: "flatMap([1,2,3], n=>[n,n*2]) === [1,2,2,4,3,6]", passed: deepEqual(r1, [1,2,2,4,3,6]), actual: r1, expected: [1,2,2,4,3,6] });
      const r2 = flatMap(["a b", "c d"], (s: unknown) => (s as string).split(" "));
      results.push({ label: "flatMap on strings → split words", passed: deepEqual(r2, ["a","b","c","d"]), actual: r2, expected: ["a","b","c","d"] });
      const r3 = flatMap([], (n: unknown) => [n]);
      results.push({ label: "empty array → []", passed: deepEqual(r3, []), actual: r3, expected: [] });
      const r4 = flatMap([[1,2],[3,4]], (x: unknown) => x as unknown[]);
      results.push({ label: "flatMap of arrays → flattened one level", passed: deepEqual(r4, [1,2,3,4]), actual: r4, expected: [1,2,3,4] });
    } catch (err) {
      results.push(makeError("compilation", "valid flatMap function", String(err)));
    }
    return results;
  },

  // ── implement-stack ───────────────────────────────────────────────────────────
  "implement-stack": (userCode) => {
    const results: TestResult[] = [];
    try {
      const Stack = compileUserFn<new () => {
        push(v: unknown): void;
        pop(): unknown;
        peek(): unknown;
        isEmpty(): boolean;
        size(): number;
      }>(userCode, "Stack");
      const s = new Stack();
      results.push({ label: "new Stack() creates instance", passed: s !== null && s !== undefined, actual: typeof s, expected: "object" });
      results.push({ label: "isEmpty() → true on empty stack", passed: s.isEmpty() === true, actual: s.isEmpty(), expected: true });
      results.push({ label: "size() → 0 on empty stack", passed: s.size() === 0, actual: s.size(), expected: 0 });
      s.push(1); s.push(2); s.push(3);
      results.push({ label: "peek() returns top without removing (3)", passed: s.peek() === 3, actual: s.peek(), expected: 3 });
      results.push({ label: "size() → 3 after pushing 3 items", passed: s.size() === 3, actual: s.size(), expected: 3 });
      results.push({ label: "peek() does not remove top (size still 3)", passed: s.size() === 3, actual: s.size(), expected: 3 });
      const popped = s.pop();
      results.push({ label: "pop() removes and returns top (3)", passed: popped === 3, actual: popped, expected: 3 });
      results.push({ label: "size() → 2 after pop", passed: s.size() === 2, actual: s.size(), expected: 2 });
      s.pop(); s.pop();
      const popOnEmpty = s.pop();
      results.push({ label: "pop() on empty returns null", passed: popOnEmpty === null, actual: popOnEmpty, expected: null });
      const peekOnEmpty = s.peek();
      results.push({ label: "peek() on empty returns null", passed: peekOnEmpty === null, actual: peekOnEmpty, expected: null });
      results.push({ label: "isEmpty() → true after all items removed", passed: s.isEmpty() === true, actual: s.isEmpty(), expected: true });
    } catch (err) {
      results.push(makeError("compilation", "valid Stack class", String(err)));
    }
    return results;
  },

  // ── implement-queue ───────────────────────────────────────────────────────────
  "implement-queue": (userCode) => {
    const results: TestResult[] = [];
    try {
      const Queue = compileUserFn<new () => {
        enqueue(v: unknown): void;
        dequeue(): unknown;
        peek(): unknown;
        isEmpty(): boolean;
        size(): number;
      }>(userCode, "Queue");
      const q = new Queue();
      results.push({ label: "isEmpty() → true on empty queue", passed: q.isEmpty() === true, actual: q.isEmpty(), expected: true });
      q.enqueue(1); q.enqueue(2); q.enqueue(3);
      results.push({ label: "peek() returns front without removing (1 — FIFO)", passed: q.peek() === 1, actual: q.peek(), expected: 1 });
      results.push({ label: "size() → 3 after 3 enqueues", passed: q.size() === 3, actual: q.size(), expected: 3 });
      const d1 = q.dequeue();
      results.push({ label: "dequeue() removes and returns front (1)", passed: d1 === 1, actual: d1, expected: 1 });
      const d2 = q.dequeue();
      results.push({ label: "dequeue() removes next in order (2)", passed: d2 === 2, actual: d2, expected: 2 });
      results.push({ label: "size() → 1 after two dequeues", passed: q.size() === 1, actual: q.size(), expected: 1 });
      q.dequeue();
      const dequeueOnEmpty = q.dequeue();
      results.push({ label: "dequeue() on empty returns null", passed: dequeueOnEmpty === null, actual: dequeueOnEmpty, expected: null });
      results.push({ label: "isEmpty() → true after all removed", passed: q.isEmpty() === true, actual: q.isEmpty(), expected: true });
    } catch (err) {
      results.push(makeError("compilation", "valid Queue class", String(err)));
    }
    return results;
  },

  // ── lru-cache ─────────────────────────────────────────────────────────────────
  "lru-cache": (userCode) => {
    const results: TestResult[] = [];
    try {
      const LRUCache = compileUserFn<new (cap: number) => { get(k: number): number; put(k: number, v: number): void }>(userCode, "LRUCache");
      const c = new LRUCache(2);
      c.put(1, 1); c.put(2, 2);
      results.push({ label: "get(1) → 1 (exists)", passed: c.get(1) === 1, actual: c.get(1), expected: 1 });
      c.put(3, 3); // evicts key 2 (LRU)
      results.push({ label: "get(2) → -1 (evicted as LRU after key 1 was accessed)", passed: c.get(2) === -1, actual: c.get(2), expected: -1 });
      c.put(4, 4); // evicts key 1 (now LRU)
      results.push({ label: "get(1) → -1 (evicted)", passed: c.get(1) === -1, actual: c.get(1), expected: -1 });
      results.push({ label: "get(3) → 3 (still present)", passed: c.get(3) === 3, actual: c.get(3), expected: 3 });
      results.push({ label: "get(4) → 4 (still present)", passed: c.get(4) === 4, actual: c.get(4), expected: 4 });

      // Test update doesn't evict
      const c2 = new LRUCache(2);
      c2.put(1, 1); c2.put(2, 2); c2.put(1, 10); // update key 1, shouldn't evict key 2
      c2.put(3, 3); // should evict key 2, not key 1
      results.push({ label: "update existing key marks it as recently used", passed: c2.get(1) === 10, actual: c2.get(1), expected: 10 });
      results.push({ label: "updated key protected from eviction", passed: c2.get(2) === -1, actual: c2.get(2), expected: -1 });
    } catch (err) {
      results.push(makeError("compilation", "valid LRUCache class", String(err)));
    }
    return results;
  },

  // ── implement-bst ────────────────────────────────────────────────────────────
  "implement-bst": (userCode) => {
    const results: TestResult[] = [];
    try {
      const BST = compileUserFn<new () => { insert(v: number): void; search(v: number): boolean; inorder(): number[] }>(userCode, "BST");
      const bst = new BST();
      results.push({ label: "search on empty BST returns false", passed: bst.search(5) === false, actual: bst.search(5), expected: false });
      bst.insert(5); bst.insert(3); bst.insert(7); bst.insert(1); bst.insert(4);
      results.push({ label: "search(5) → true (root)", passed: bst.search(5) === true, actual: bst.search(5), expected: true });
      results.push({ label: "search(3) → true (left child)", passed: bst.search(3) === true, actual: bst.search(3), expected: true });
      results.push({ label: "search(7) → true (right child)", passed: bst.search(7) === true, actual: bst.search(7), expected: true });
      results.push({ label: "search(4) → true (leaf)", passed: bst.search(4) === true, actual: bst.search(4), expected: true });
      results.push({ label: "search(99) → false (not in tree)", passed: bst.search(99) === false, actual: bst.search(99), expected: false });
      const order = bst.inorder();
      results.push({ label: "inorder() returns sorted values [1,3,4,5,7]", passed: deepEqual(order, [1,3,4,5,7]), actual: order, expected: [1,3,4,5,7] });
    } catch (err) {
      results.push(makeError("compilation", "valid BST class", String(err)));
    }
    return results;
  },

  // ── session-store ─────────────────────────────────────────────────────────────
  "session-store": (userCode) => {
    const results: TestResult[] = [];
    try {
      const SessionStore = compileUserFn<new (ttlMs: number) => {
        create(userId: number): string;
        get(id: string): number | null;
        destroy(id: string): void;
      }>(userCode, "SessionStore");

      const store = new SessionStore(60000);

      const id1 = store.create(42);
      results.push({ label: "create() returns a string session ID", passed: typeof id1 === "string" && id1.length > 0, actual: id1, expected: "string (e.g. 'sess_1')" });

      const val1 = store.get(id1);
      results.push({ label: "get() returns the userId for a valid session", passed: val1 === 42, actual: val1, expected: 42 });

      const id2 = store.create(99);
      results.push({ label: "second create() returns a different ID", passed: id2 !== id1, actual: id2, expected: `not '${id1}'` });

      const val2 = store.get(id2);
      results.push({ label: "second session has correct userId", passed: val2 === 99, actual: val2, expected: 99 });

      store.destroy(id1);
      const afterDestroy = store.get(id1);
      results.push({ label: "get() returns null after destroy()", passed: afterDestroy === null, actual: afterDestroy, expected: null });

      const val2Still = store.get(id2);
      results.push({ label: "destroy() only removes the targeted session", passed: val2Still === 99, actual: val2Still, expected: 99 });

      const noExist = store.get("sess_doesnotexist");
      results.push({ label: "get() returns null for unknown session ID", passed: noExist === null, actual: noExist, expected: null });

      const expiredStore = new SessionStore(0);
      const expiredId = expiredStore.create(7);
      const expiredVal = expiredStore.get(expiredId);
      results.push({ label: "get() returns null for expired session (ttl=0)", passed: expiredVal === null, actual: expiredVal, expected: null });

    } catch (err) {
      results.push(makeError("compilation", "valid SessionStore class", String(err)));
    }
    return results;
  },

  // ── rbac ──────────────────────────────────────────────────────────────────────
  "rbac": (userCode) => {
    const results: TestResult[] = [];
    try {
      const can = compileUserFn<(user: { role?: string }, action: string, resource: string) => boolean>(userCode, "can");

      const cases: [Parameters<typeof can>, boolean, string][] = [
        [[{ role: "admin" }, "delete", "users"],  true,  "admin can delete users"],
        [[{ role: "admin" }, "write", "posts"],   true,  "admin can write posts"],
        [[{ role: "admin" }, "read", "anything"], true,  "admin can read anything"],
        [[{ role: "editor" }, "read", "posts"],   true,  "editor can read"],
        [[{ role: "editor" }, "write", "posts"],  true,  "editor can write"],
        [[{ role: "editor" }, "delete", "posts"], false, "editor cannot delete"],
        [[{ role: "viewer" }, "read", "posts"],   true,  "viewer can read"],
        [[{ role: "viewer" }, "write", "posts"],  false, "viewer cannot write"],
        [[{ role: "viewer" }, "delete", "posts"], false, "viewer cannot delete"],
        [[{ role: "unknown" }, "read", "posts"],  false, "unknown role → false"],
        [[{}, "read", "posts"],                   false, "no role → false"],
      ];

      for (const [args, expected, label] of cases) {
        const actual = can(...args);
        results.push({ label, passed: actual === expected, actual, expected });
      }
    } catch (err) {
      results.push(makeError("compilation", "valid can() function", String(err)));
    }
    return results;
  },
};

// ── Async SPECIAL_RUNNERS ─────────────────────────────────────────────────────
// For exercises that return Promises or take async args.

export const ASYNC_SPECIAL_RUNNERS: Record<string, (userCode: string) => Promise<TestResult[]>> = {

  // ── sleep ─────────────────────────────────────────────────────────────────────
  "sleep": async (userCode) => {
    const results: TestResult[] = [];
    try {
      const sleep = compileUserFn<(ms: number) => Promise<void>>(userCode, "sleep");
      const p = sleep(0);
      results.push({ label: "sleep() returns a Promise", passed: p instanceof Promise, actual: p instanceof Promise ? "Promise" : typeof p, expected: "Promise" });
      await p;
      results.push({ label: "sleep(0) resolves (doesn't hang)", passed: true, actual: "resolved", expected: "resolved" });
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      results.push({ label: "sleep(50) waits approximately 50ms", passed: elapsed >= 40, actual: `${elapsed}ms`, expected: "≥40ms" });
      // Test awaitable
      let after = false;
      await sleep(0).then(() => { after = true; });
      results.push({ label: "sleep is awaitable / thenable", passed: after, actual: after, expected: true });
    } catch (err) {
      results.push(makeError("compilation", "valid sleep function", String(err)));
    }
    return results;
  },

  // ── promise-all-impl ──────────────────────────────────────────────────────────
  "promise-all-impl": async (userCode) => {
    const results: TestResult[] = [];
    try {
      const promiseAll = compileUserFn<(ps: Promise<unknown>[]) => Promise<unknown[]>>(userCode, "promiseAll");

      // Basic resolution
      const r1 = await promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      results.push({ label: "resolves all promises → [1,2,3]", passed: deepEqual(r1, [1,2,3]), actual: r1, expected: [1,2,3] });

      // Order preservation (slow promise first)
      const slow = new Promise<number>(r => setTimeout(() => r(1), 20));
      const fast = Promise.resolve<number>(2);
      const r2 = await promiseAll([slow, fast]);
      results.push({ label: "preserves order even when first promise is slower", passed: deepEqual(r2, [1,2]), actual: r2, expected: [1,2] });

      // Empty array
      const r3 = await promiseAll([]);
      results.push({ label: "empty array → []", passed: deepEqual(r3, []), actual: r3, expected: [] });

      // Rejection
      let rejected = false;
      let rejectionReason: unknown;
      try {
        await promiseAll([Promise.resolve(1), Promise.reject("fail"), Promise.resolve(3)]);
      } catch (e) {
        rejected = true;
        rejectionReason = e;
      }
      results.push({ label: "rejects immediately if any promise rejects", passed: rejected, actual: rejected ? "rejected" : "resolved", expected: "rejected" });
      results.push({ label: "rejection reason is propagated", passed: rejectionReason === "fail", actual: rejectionReason, expected: "fail" });
    } catch (err) {
      results.push(makeError("compilation", "valid promiseAll function", String(err)));
    }
    return results;
  },

  // ── retry ─────────────────────────────────────────────────────────────────────
  "retry": async (userCode) => {
    const results: TestResult[] = [];
    try {
      const retry = compileUserFn<(fn: () => Promise<unknown>, retries: number, delay: number) => Promise<unknown>>(userCode, "retry");

      // Succeeds immediately
      let calls1 = 0;
      const r1 = await retry(async () => { calls1++; return 42; }, 3, 0);
      results.push({ label: "succeeds immediately and returns value", passed: r1 === 42, actual: r1, expected: 42 });
      results.push({ label: "calls fn only once when it succeeds", passed: calls1 === 1, actual: calls1, expected: 1 });

      // Fails twice then succeeds
      let calls2 = 0;
      const r2 = await retry(async () => {
        calls2++;
        if (calls2 < 3) throw new Error("not yet");
        return "done";
      }, 5, 0);
      results.push({ label: "retries on failure and eventually succeeds", passed: r2 === "done", actual: r2, expected: "done" });
      results.push({ label: "retried the correct number of times (3 calls total)", passed: calls2 === 3, actual: calls2, expected: 3 });

      // Exhausts all retries and throws
      let threw = false;
      let lastError: unknown;
      try {
        await retry(async () => { throw new Error("always fails"); }, 2, 0);
      } catch (e) {
        threw = true;
        lastError = e;
      }
      results.push({ label: "throws after exhausting all retries", passed: threw, actual: threw ? "threw" : "did not throw", expected: "threw" });
      results.push({ label: "propagates the last error", passed: lastError instanceof Error, actual: typeof lastError, expected: "Error" });
    } catch (err) {
      results.push(makeError("compilation", "valid retry function", String(err)));
    }
    return results;
  },
};

// ── Public entry point ────────────────────────────────────────────────────────
export function runExercise(userCode: string, exercise: Exercise): TestResult[] | Promise<TestResult[]> {
  if (ASYNC_SPECIAL_RUNNERS[exercise.id]) {
    return ASYNC_SPECIAL_RUNNERS[exercise.id]!(userCode);
  }
  if (SPECIAL_RUNNERS[exercise.id]) {
    return SPECIAL_RUNNERS[exercise.id]!(userCode);
  }
  return runStandardTests(userCode, exercise);
}

// Legacy named export (kept for backward compat)
export const runTests = runStandardTests;
