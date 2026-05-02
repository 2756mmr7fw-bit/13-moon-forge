import { TestWritingExercise } from "./types";

// "Write the Tests" exercises — the student writes test cases, not the solution.
// They pass when: (1) all their tests pass against the correct implementation
//                (2) each broken implementation is caught by at least one of their tests.

export const TEST_WRITING_EXERCISES: TestWritingExercise[] = [
  {
    id: "test-double-array",
    format: "write-tests",
    tier: 2, category: "testing",
    title: "Test: Double Every Element",
    tagline: "Write the tests that catch every bug.",
    description: "`doubleAll(nums)` should return a new array with every number multiplied by 2.",
    why: "Writing tests is the skill college skips entirely. You will spend more of your career reviewing and writing tests than you will writing new features. This flips the exercise: instead of passing tests, you write them.",
    functionSignature: "function doubleAll(nums) → number[]",
    correctImpl: `function doubleAll(nums) { return nums.map(n => n * 2); }`,
    brokenImpls: [
      {
        label: "adds 2 instead of multiplying",
        code: `function doubleAll(nums) { return nums.map(n => n + 2); }`,
      },
      {
        label: "mutates original array",
        code: `function doubleAll(nums) { for (let i = 0; i < nums.length; i++) nums[i] *= 2; return nums; }`,
      },
      {
        label: "off by one — skips first element",
        code: `function doubleAll(nums) { return nums.slice(1).map(n => n * 2); }`,
      },
      {
        label: "ignores negative numbers",
        code: `function doubleAll(nums) { return nums.map(n => n < 0 ? n : n * 2); }`,
      },
    ],
    examples: [
      { input: "doubleAll([1, 2, 3])", output: "[2, 4, 6]" },
      { input: "doubleAll([])", output: "[]" },
      { input: "doubleAll([-1, 0, 5])", output: "[-2, 0, 10]" },
    ],
    starterCode: `// Write test cases for doubleAll(nums)
// Each test: { args: [nums], expected: result }
// Your goal: catch every broken implementation

const tests = [
  { args: [[1, 2, 3]], expected: [2, 4, 6] },
  // add more tests below...
];`,
    hints: [
      "Test with negative numbers — some implementations ignore them",
      "Test with an empty array — edge case most bugs skip",
      "Test that the original array is NOT modified",
    ],
    tags: ["testing", "TDD", "arrays"], estimatedMinutes: 15,
  },
  {
    id: "test-count-vowels",
    format: "write-tests",
    tier: 2, category: "testing",
    title: "Test: Count Vowels",
    tagline: "Find the cases the implementation misses.",
    description: "`countVowels(str)` should return the number of vowels (a, e, i, o, u) in the string. Case insensitive.",
    why: "A function can look correct and still be wrong. Writing comprehensive tests forces you to think about what 'correct' actually means — not just the happy path.",
    functionSignature: "function countVowels(str) → number",
    correctImpl: `function countVowels(str) { return (str.toLowerCase().match(/[aeiou]/g) || []).length; }`,
    brokenImpls: [
      {
        label: "case sensitive — misses uppercase vowels",
        code: `function countVowels(str) { return (str.match(/[aeiou]/g) || []).length; }`,
      },
      {
        label: "only counts 'a' and 'e'",
        code: `function countVowels(str) { return (str.toLowerCase().match(/[ae]/g) || []).length; }`,
      },
      {
        label: "returns wrong type — string instead of number",
        code: `function countVowels(str) { return String((str.toLowerCase().match(/[aeiou]/g) || []).length); }`,
      },
      {
        label: "off by one — uses > instead of >=",
        code: `function countVowels(str) { let c=0; for(const ch of str.toLowerCase()) if('aeiou'.indexOf(ch)>0) c++; return c; }`,
      },
    ],
    examples: [
      { input: "countVowels('hello')", output: "2" },
      { input: "countVowels('AEIOU')", output: "5", note: "case insensitive" },
      { input: "countVowels('xyz')", output: "0" },
    ],
    starterCode: `// Write test cases for countVowels(str)
// Think about: uppercase, all vowels, no vowels, empty string

const tests = [
  { args: ["hello"], expected: 2 },
  // add more tests below...
];`,
    hints: [
      "Test all 5 vowels individually",
      "Test with uppercase — some implementations miss it",
      "Test with zero vowels — what should be returned?",
    ],
    tags: ["testing", "strings", "regex"], estimatedMinutes: 15,
  },
  {
    id: "test-flatten",
    format: "write-tests",
    tier: 3, category: "testing",
    title: "Test: Flatten an Array",
    tagline: "Edge cases are where bugs live.",
    description: "`flatten(arr)` should flatten a deeply nested array into a single-level array — any depth.",
    why: "Most bugs live in edge cases. Writing good tests means deliberately hunting for the inputs that reveal assumptions in the code. Empty arrays, already-flat arrays, single elements — these are where implementations break.",
    functionSignature: "function flatten(arr) → any[]",
    correctImpl: `function flatten(arr) { return arr.reduce((flat,item) => flat.concat(Array.isArray(item) ? flatten(item) : item), []); }`,
    brokenImpls: [
      {
        label: "only flattens one level",
        code: `function flatten(arr) { return arr.reduce((flat,item) => flat.concat(item), []); }`,
      },
      {
        label: "returns undefined for empty array",
        code: `function flatten(arr) { if(!arr.length) return; return arr.reduce((flat,item) => flat.concat(Array.isArray(item) ? flatten(item) : item), []); }`,
      },
      {
        label: "converts numbers to strings",
        code: `function flatten(arr) { return arr.toString().split(',').map(Number); }`,
      },
      {
        label: "breaks on non-numeric values",
        code: `function flatten(arr) { const result=[]; const stack=[...arr]; while(stack.length){const n=stack.pop(); Array.isArray(n)?stack.push(...n):result.unshift(n);} return result.map(Number); }`,
      },
    ],
    examples: [
      { input: "flatten([1, [2, [3]]])", output: "[1, 2, 3]" },
      { input: "flatten([])", output: "[]" },
      { input: "flatten([1, 2, 3])", output: "[1, 2, 3]" },
    ],
    starterCode: `// Write test cases for flatten(arr)
// Think about: deep nesting, empty arrays, mixed types, already flat

const tests = [
  { args: [[1, [2, [3]]]], expected: [1, 2, 3] },
  // add more tests below...
];`,
    hints: [
      "Test with multiple levels of nesting",
      "Test with an empty array — some implementations return undefined",
      "Test with strings mixed in — some implementations convert everything to numbers",
    ],
    tags: ["testing", "recursion", "edge-cases"], estimatedMinutes: 20,
  },
  {
    id: "test-find-max",
    format: "write-tests",
    tier: 3, category: "testing",
    title: "Test: Find the Maximum",
    tagline: "What breaks a max function?",
    description: "`findMax(nums)` should return the largest number in the array.",
    why: "A max function looks trivial but has real edge cases: all negatives, single element, duplicates. Learning to enumerate edge cases is what separates a junior from a senior developer.",
    functionSignature: "function findMax(nums) → number",
    correctImpl: `function findMax(nums) { return nums.reduce((max, n) => n > max ? n : max, nums[0]); }`,
    brokenImpls: [
      {
        label: "initializes max to 0 — breaks for all-negative arrays",
        code: `function findMax(nums) { let max = 0; for (const n of nums) if (n > max) max = n; return max; }`,
      },
      {
        label: "uses wrong comparison — returns minimum instead",
        code: `function findMax(nums) { return nums.reduce((min, n) => n < min ? n : min, nums[0]); }`,
      },
      {
        label: "returns string instead of number",
        code: `function findMax(nums) { return String(Math.max(...nums)); }`,
      },
    ],
    examples: [
      { input: "findMax([3, 1, 4, 1, 5, 9])", output: "9" },
      { input: "findMax([-1, -5, -3])", output: "-1" },
      { input: "findMax([42])", output: "42" },
    ],
    starterCode: `// Write test cases for findMax(nums)
// Think about: all negatives, single element, all same, large arrays

const tests = [
  { args: [[3, 1, 4, 1, 5, 9]], expected: 9 },
  // add more tests below...
];`,
    hints: [
      "Test with all negative numbers — this breaks implementations that start max at 0",
      "Test with a single element",
      "Test that the return type is a number, not a string",
    ],
    tags: ["testing", "edge-cases", "numbers"], estimatedMinutes: 15,
  },
  {
    id: "test-is-palindrome",
    format: "write-tests",
    tier: 2, category: "testing",
    title: "Test: Is Palindrome",
    tagline: "Write the tests. Break the function.",
    description: "`isPalindrome(str)` should return true if the string reads the same forwards and backwards. Case insensitive.",
    why: "Testing string functions means thinking about encoding, case, whitespace, and special characters — all the things that break in production. Writing comprehensive tests is the practical skill that prevents production incidents.",
    functionSignature: "function isPalindrome(str) → boolean",
    correctImpl: `function isPalindrome(str) { const s = str.toLowerCase(); return s === s.split('').reverse().join(''); }`,
    brokenImpls: [
      {
        label: "case sensitive — misses 'Racecar'",
        code: `function isPalindrome(str) { return str === str.split('').reverse().join(''); }`,
      },
      {
        label: "always returns true",
        code: `function isPalindrome(str) { return true; }`,
      },
      {
        label: "only checks first and last characters",
        code: `function isPalindrome(str) { const s = str.toLowerCase(); return s[0] === s[s.length-1]; }`,
      },
    ],
    examples: [
      { input: "isPalindrome('racecar')", output: "true" },
      { input: "isPalindrome('RaceCar')", output: "true" },
      { input: "isPalindrome('hello')", output: "false" },
    ],
    starterCode: `// Write test cases for isPalindrome(str)
// Think about: uppercase, definitely NOT palindromes, edge cases

const tests = [
  { args: ["racecar"], expected: true },
  { args: ["hello"], expected: false },
  // add more tests below...
];`,
    hints: [
      "Test with a mixed-case palindrome like 'RaceCar' — case sensitivity bugs are common",
      "You need enough false cases to catch 'always returns true'",
      "Test with a 2-char palindrome like 'aa' and a 2-char non-palindrome like 'ab'",
    ],
    tags: ["testing", "strings", "palindrome"], estimatedMinutes: 12,
  },
  {
    id: "test-binary-search",
    format: "write-tests",
    tier: 3, category: "testing",
    title: "Test: Binary Search",
    tagline: "Find the bugs hiding in the boundary conditions.",
    description: "`binarySearch(arr, target)` searches a **sorted** array and returns the **index** of target, or **-1** if not found. No `indexOf` allowed.",
    why: "Binary search is one of the most bug-prone functions in computing. Off-by-one errors in loop conditions and pointer updates are legendary. Writing exhaustive tests for it forces you to think like a verification engineer — you have to enumerate every boundary case before you can trust the implementation.",
    functionSignature: "function binarySearch(arr, target) → number",
    correctImpl: `function binarySearch(arr, target) { let lo = 0, hi = arr.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] === target) return mid; if (arr[mid] < target) lo = mid + 1; else hi = mid - 1; } return -1; }`,
    brokenImpls: [
      {
        label: "uses < instead of <= in while — misses target when it's the only element left in the search space",
        code: `function binarySearch(arr, target) { let lo = 0, hi = arr.length - 1; while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] === target) return mid; if (arr[mid] < target) lo = mid + 1; else hi = mid - 1; } return -1; }`,
      },
      {
        label: "no return -1 — returns undefined when target is not found",
        code: `function binarySearch(arr, target) { let lo = 0, hi = arr.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] === target) return mid; if (arr[mid] < target) lo = mid + 1; else hi = mid - 1; } }`,
      },
      {
        label: "reversed search direction — goes right when it should go left and vice versa",
        code: `function binarySearch(arr, target) { let lo = 0, hi = arr.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] === target) return mid; if (arr[mid] < target) hi = mid - 1; else lo = mid + 1; } return -1; }`,
      },
      {
        label: "always searches only the left half — ignores the right half entirely",
        code: `function binarySearch(arr, target) { let lo = 0, hi = arr.length - 1; while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (arr[mid] === target) return mid; hi = mid - 1; } return -1; }`,
      },
    ],
    examples: [
      { input: "binarySearch([1, 3, 5, 7, 9], 7)", output: "3", note: "index 3" },
      { input: "binarySearch([1, 3, 5, 7, 9], 4)", output: "-1", note: "not found" },
      { input: "binarySearch([5], 5)", output: "0" },
      { input: "binarySearch([], 1)", output: "-1" },
    ],
    starterCode: `// Write test cases for binarySearch(arr, target)
// arr is always sorted. Returns the index of target, or -1.
// Think about: target at first index, last index, not found, single element, empty

const tests = [
  { args: [[1, 3, 5, 7, 9], 7], expected: 3 },
  { args: [[1, 3, 5, 7, 9], 4], expected: -1 },
  // add more tests below...
];`,
    hints: [
      "Test with target at the very first index (index 0) — boundary bugs show up there",
      "Test with target at the very last index — same reason",
      "Test that not-found returns exactly -1, not undefined, null, or false",
      "Test with a single-element array: both when the element is found and when it isn't",
    ],
    tags: ["testing", "binary-search", "edge-cases", "boundary"], estimatedMinutes: 20,
  },
];

export function getTestWritingExerciseById(id: string): TestWritingExercise | undefined {
  return TEST_WRITING_EXERCISES.find(e => e.id === id);
}
