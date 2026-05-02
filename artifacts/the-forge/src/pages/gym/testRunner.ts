import { Exercise, TestCase, TestResult } from "./types";

const TIMEOUT_MS = 3000;

function withTimeout<T>(fn: () => T, ms: number): T {
  const start = Date.now();
  const result = fn();
  if (Date.now() - start > ms) throw new Error("Execution timed out");
  return result;
}

export function runTests(userCode: string, exercise: Exercise): TestResult[] {
  let fn: ((...args: unknown[]) => unknown) | undefined;

  // Compile the user's code
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function(`
      "use strict";
      ${userCode}
      if (typeof ${exercise.functionName} === 'undefined') throw new Error('Function ${exercise.functionName} is not defined');
      return ${exercise.functionName};
    `)() as (...args: unknown[]) => unknown;
  } catch (err) {
    return exercise.testCases.map(tc => ({
      label:    tc.label,
      passed:   false,
      expected: tc.expected,
      error:    `${String(err)}`,
      hidden:   tc.hidden,
    }));
  }

  // Run each test case
  return exercise.testCases.map((tc: TestCase): TestResult => {
    try {
      const actual = withTimeout(() => fn!(...(tc.args as unknown[])), TIMEOUT_MS);
      const passed = deepEqual(actual, tc.expected);
      return { label: tc.label, passed, actual, expected: tc.expected, hidden: tc.hidden };
    } catch (err) {
      return { label: tc.label, passed: false, expected: tc.expected, error: String(err), hidden: tc.hidden };
    }
  });
}

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

// For memoize/pipe exercises — some test cases need a different approach
export function runFunctionalTest(
  userCode: string,
  functionName: string,
  testFn: (fn: (...args: unknown[]) => unknown) => { passed: boolean; actual: unknown; expected: unknown },
  label: string
): TestResult {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; ${userCode}; return ${functionName};`)() as (...args: unknown[]) => unknown;
    const r = testFn(fn);
    return { label, ...r };
  } catch (err) {
    return { label, passed: false, expected: "function to work", error: String(err) };
  }
}

// Special runners for higher-order function exercises
export const SPECIAL_RUNNERS: Record<string, (userCode: string) => TestResult[]> = {
  "memoize": (userCode) => {
    const results: TestResult[] = [];
    try {
      // eslint-disable-next-line no-new-func
      const memoize = new Function(`"use strict"; ${userCode}; return memoize;`)() as (fn: (...a: unknown[]) => unknown) => (...a: unknown[]) => unknown;
      let calls = 0;
      const tracked = memoize((x: unknown) => { calls++; return (x as number) * 2; });
      const r1 = tracked(5);
      const r2 = tracked(5);
      results.push({ label: "memoize(fn)(5) returns 10", passed: r1 === 10, actual: r1, expected: 10 });
      results.push({ label: "memoize(fn)(5) returns 10 (cached)", passed: r2 === 10, actual: r2, expected: 10 });
      results.push({ label: "original fn called only once", passed: calls === 1, actual: calls, expected: 1 });
      const r3 = tracked(6);
      results.push({ label: "memoize(fn)(6) returns 12", passed: r3 === 12, actual: r3, expected: 12 });
    } catch (err) {
      results.push({ label: "compilation", passed: false, expected: "valid memoize function", error: String(err) });
    }
    return results;
  },
  "pipe": (userCode) => {
    const results: TestResult[] = [];
    try {
      // eslint-disable-next-line no-new-func
      const pipe = new Function(`"use strict"; ${userCode}; return pipe;`)() as (...fns: ((x: unknown) => unknown)[]) => (x: unknown) => unknown;
      const add1 = (x: number) => x + 1;
      const times2 = (x: number) => x * 2;
      const r1 = pipe(add1, times2)(3);
      results.push({ label: "pipe(add1, times2)(3) === 8", passed: r1 === 8, actual: r1, expected: 8 });
      const r2 = pipe(times2, add1)(3);
      results.push({ label: "pipe(times2, add1)(3) === 7", passed: r2 === 7, actual: r2, expected: 7 });
      const r3 = pipe((x: unknown) => (x as string).toUpperCase())("hello");
      results.push({ label: "pipe with strings", passed: r3 === "HELLO", actual: r3, expected: "HELLO" });
    } catch (err) {
      results.push({ label: "compilation", passed: false, expected: "valid pipe function", error: String(err) });
    }
    return results;
  },
};

export function runExercise(userCode: string, exercise: Exercise): TestResult[] {
  if (SPECIAL_RUNNERS[exercise.id]) {
    return SPECIAL_RUNNERS[exercise.id]!(userCode);
  }
  return runTests(userCode, exercise);
}
