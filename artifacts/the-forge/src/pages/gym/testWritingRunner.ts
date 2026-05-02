import { TestWritingExercise, TestWritingResult, StudentTestCase } from "./types";

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

function runSingleImpl(
  implCode: string,
  functionName: string,
  testCases: StudentTestCase[]
): { passed: boolean; actual: unknown; expected: unknown; error?: string }[] {
  let fn: ((...args: unknown[]) => unknown) | undefined;

  try {
    // eslint-disable-next-line no-new-func
    fn = new Function(`"use strict"; ${implCode}; return ${functionName};`)() as (...args: unknown[]) => unknown;
  } catch (err) {
    return testCases.map(tc => ({
      passed: false,
      actual: undefined,
      expected: tc.expected,
      error: `Compilation error: ${String(err)}`,
    }));
  }

  return testCases.map(tc => {
    try {
      const actual = fn!(...(tc.args as unknown[]));
      const passed = deepEqual(actual, tc.expected);
      return { passed, actual, expected: tc.expected };
    } catch (err) {
      return { passed: false, actual: undefined, expected: tc.expected, error: String(err) };
    }
  });
}

export function runTestWritingExercise(studentCode: string, exercise: TestWritingExercise): TestWritingResult {
  // 1. Parse the student's test cases
  let studentTests: StudentTestCase[];
  try {
    // eslint-disable-next-line no-new-func
    const extracted = new Function(`"use strict"; ${studentCode}; return tests;`)() as StudentTestCase[];
    if (!Array.isArray(extracted)) throw new Error("`tests` must be an array");
    if (extracted.length === 0) throw new Error("Add at least one test case");
    studentTests = extracted;
  } catch (err) {
    return {
      studentTests: [],
      correctAllPass: false,
      correctResults: [],
      brokenResults: [],
      allBrokenCaught: false,
      passed: false,
      parseError: `Could not read your tests: ${String(err)}`,
    };
  }

  // 2. Validate against correct implementation — all student tests should pass
  const correctResults = runSingleImpl(exercise.correctImpl, extractFunctionName(exercise.correctImpl), studentTests);
  const correctAllPass = correctResults.every(r => r.passed);

  // 3. Run against each broken implementation — student's tests should catch each one
  const fnName = extractFunctionName(exercise.correctImpl);
  const brokenResults = exercise.brokenImpls.map(broken => {
    const results = runSingleImpl(broken.code, fnName, studentTests);
    const caughtIndex = results.findIndex(r => !r.passed);
    const caught = caughtIndex !== -1;
    return {
      label: broken.label,
      caught,
      failingTest: caught ? studentTests[caughtIndex] : undefined,
    };
  });

  const allBrokenCaught = brokenResults.every(r => r.caught);

  return {
    studentTests,
    correctAllPass,
    correctResults,
    brokenResults,
    allBrokenCaught,
    passed: correctAllPass && allBrokenCaught,
  };
}

function extractFunctionName(code: string): string {
  const match = code.match(/function\s+(\w+)/);
  return match?.[1] ?? "fn";
}
