import { Exercise } from "./types";

// Shared TreeNode shape used across exercises — plain objects, no class needed.
// { val: number, left: TreeNode | null, right: TreeNode | null }

// ── Tree Exercises ────────────────────────────────────────────────────────────
export const TREE_EXERCISES: Exercise[] = [
  {
    id: "max-depth",
    tier: 2, category: "trees",
    title: "Maximum Depth of Binary Tree",
    tagline: "How tall is the tree?",
    description: "Write `maxDepth(root)` that returns the maximum depth of a binary tree. A tree node has `.val`, `.left`, and `.right`. Return 0 for null.",
    why: "Tree depth is foundational — it determines the worst-case time for BST operations and is used in balancing algorithms. Understanding it from scratch makes everything else in trees click.",
    analogy: "Stand at the root. Walk every path to a leaf and measure how many steps you took. The longest walk is the depth.",
    examples: [
      { input: "maxDepth({ val:3, left:{val:9,left:null,right:null}, right:{val:20,left:{val:15,left:null,right:null},right:{val:7,left:null,right:null}} })", output: "3" },
      { input: "maxDepth(null)", output: "0" },
      { input: "maxDepth({ val:1, left:null, right:null })", output: "1" },
    ],
    starterCode: `function maxDepth(root) {\n  // recursive approach works best here\n}`,
    functionName: "maxDepth",
    testCases: [
      {
        args: [{ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } }],
        expected: 3, label: "classic 3-level tree → 3",
      },
      { args: [null], expected: 0, label: "null → 0" },
      { args: [{ val: 1, left: null, right: null }], expected: 1, label: "single node → 1" },
      {
        args: [{ val: 1, left: { val: 2, left: { val: 3, left: { val: 4, left: null, right: null }, right: null }, right: null }, right: null }],
        expected: 4, label: "left-skewed chain → 4", hidden: true,
      },
    ],
    solution: `function maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}`,
    solutionExplanation: "Base case: null = 0. Recursive case: the depth of a node is 1 plus the deeper of its two subtrees.",
    hints: ["If root is null, return 0", "The depth of a node = 1 + the deeper subtree"],
    tags: ["trees", "recursion", "DFS"], estimatedMinutes: 10,
  },
  {
    id: "inorder-traversal",
    tier: 2, category: "trees",
    title: "Inorder Traversal",
    tagline: "Left, root, right — in that order.",
    description: "Write `inorderTraversal(root)` that returns the values of a binary tree in inorder (left → node → right). Return an array.",
    why: "Inorder traversal of a BST produces values in sorted order. Understanding the three traversals (pre, in, post) is the basis for all tree algorithms.",
    analogy: "Visit everything on your left first, then yourself, then everything on your right.",
    examples: [
      { input: "inorderTraversal({ val:1, left:null, right:{val:2,left:{val:3,left:null,right:null},right:null} })", output: "[1, 3, 2]" },
      { input: "inorderTraversal(null)", output: "[]" },
    ],
    starterCode: `function inorderTraversal(root) {\n  // recursive or iterative — your choice\n}`,
    functionName: "inorderTraversal",
    testCases: [
      {
        args: [{ val: 1, left: null, right: { val: 2, left: { val: 3, left: null, right: null }, right: null } }],
        expected: [1, 3, 2], label: "1→2(left:3) → [1,3,2]",
      },
      { args: [null], expected: [], label: "null → []" },
      { args: [{ val: 1, left: null, right: null }], expected: [1], label: "single node" },
      {
        args: [{ val: 4, left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }, right: { val: 5, left: null, right: null } }],
        expected: [1, 2, 3, 4, 5], label: "BST inorder is sorted", hidden: true,
      },
    ],
    solution: `function inorderTraversal(root) {\n  if (!root) return [];\n  return [\n    ...inorderTraversal(root.left),\n    root.val,\n    ...inorderTraversal(root.right),\n  ];\n}`,
    solutionExplanation: "Recurse into left subtree, add the current node's value, recurse into right subtree. Spread and concatenate the arrays.",
    hints: ["Return [] for null", "left results + current val + right results"],
    tags: ["trees", "recursion", "traversal"], estimatedMinutes: 10,
  },
  {
    id: "symmetric-tree",
    tier: 2, category: "trees",
    title: "Symmetric Tree",
    tagline: "Is it a mirror of itself?",
    description: "Write `isSymmetric(root)` that returns `true` if the tree is a mirror of itself around its center.",
    why: "Symmetry checks teach you to think about trees in pairs — a key mental model for comparing two trees or subtrees, which appears in many harder problems.",
    analogy: "Hold the tree up to a mirror down its center axis. Does it look the same?",
    examples: [
      { input: "isSymmetric({ val:1, left:{val:2,left:{val:3,left:null,right:null},right:{val:4,left:null,right:null}}, right:{val:2,left:{val:4,left:null,right:null},right:{val:3,left:null,right:null}} })", output: "true" },
      { input: "isSymmetric({ val:1, left:{val:2,left:null,right:{val:3,left:null,right:null}}, right:{val:2,left:null,right:{val:3,left:null,right:null}} })", output: "false" },
    ],
    starterCode: `function isSymmetric(root) {\n  // compare the tree against its own mirror\n}`,
    functionName: "isSymmetric",
    testCases: [
      {
        args: [{ val: 1, left: { val: 2, left: { val: 3, left: null, right: null }, right: { val: 4, left: null, right: null } }, right: { val: 2, left: { val: 4, left: null, right: null }, right: { val: 3, left: null, right: null } } }],
        expected: true, label: "symmetric [1,[2,3,4],[2,4,3]] → true",
      },
      {
        args: [{ val: 1, left: { val: 2, left: null, right: { val: 3, left: null, right: null } }, right: { val: 2, left: null, right: { val: 3, left: null, right: null } } }],
        expected: false, label: "both right children, not mirrored → false",
      },
      { args: [null], expected: true, label: "null → true", hidden: true },
      { args: [{ val: 1, left: null, right: null }], expected: true, label: "single node → true", hidden: true },
    ],
    solution: `function isSymmetric(root) {\n  function isMirror(left, right) {\n    if (!left && !right) return true;\n    if (!left || !right) return false;\n    return left.val === right.val\n      && isMirror(left.left, right.right)\n      && isMirror(left.right, right.left);\n  }\n  return isMirror(root?.left ?? null, root?.right ?? null);\n}`,
    solutionExplanation: "Write a helper that compares two subtrees as mirrors: both null = symmetric, one null = not. Then check left.val === right.val, and cross-compare children: left.left vs right.right, and left.right vs right.left.",
    hints: ["Write a helper isMirror(left, right)", "Two subtrees are mirrors if their outer children match and their inner children match"],
    tags: ["trees", "recursion"], estimatedMinutes: 15,
  },
  {
    id: "path-sum",
    tier: 2, category: "trees",
    title: "Path Sum",
    tagline: "Does any root-to-leaf path add up to the target?",
    description: "Write `hasPathSum(root, targetSum)` that returns `true` if there is a root-to-leaf path where all values sum to `targetSum`.",
    why: "Path problems teach you to thread state through recursive calls — a critical pattern for tree DFS that also applies to grid traversal and graph problems.",
    analogy: "Walk every path from the door to a dead end, tracking how much you've spent. Did any route hit exactly the budget?",
    examples: [
      { input: "hasPathSum(root, 22) // where root = 5→4→11→2", output: "true" },
      { input: "hasPathSum(root, 5) // where root = 5 only (leaf)", output: "true" },
      { input: "hasPathSum(null, 0)", output: "false" },
    ],
    starterCode: `function hasPathSum(root, targetSum) {\n  // subtract as you go deeper\n}`,
    functionName: "hasPathSum",
    testCases: [
      {
        args: [
          { val: 5, left: { val: 4, left: { val: 11, left: { val: 7, left: null, right: null }, right: { val: 2, left: null, right: null } }, right: null }, right: { val: 8, left: { val: 13, left: null, right: null }, right: { val: 4, left: null, right: { val: 1, left: null, right: null } } } },
          22,
        ],
        expected: true, label: "5→4→11→2 = 22",
      },
      { args: [null, 0], expected: false, label: "null tree → false" },
      { args: [{ val: 1, left: null, right: null }, 1], expected: true, label: "leaf matches target" },
      { args: [{ val: 1, left: null, right: null }, 2], expected: false, label: "leaf doesn't match", hidden: true },
      {
        args: [{ val: 1, left: { val: 2, left: null, right: null }, right: null }, 1],
        expected: false, label: "internal node doesn't count", hidden: true,
      },
    ],
    solution: `function hasPathSum(root, targetSum) {\n  if (!root) return false;\n  const remaining = targetSum - root.val;\n  if (!root.left && !root.right) return remaining === 0;\n  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);\n}`,
    solutionExplanation: "Subtract the current node's value from the target. At a leaf, check if remaining is 0. Recurse into both subtrees and return true if either finds a valid path.",
    hints: ["Subtract root.val from targetSum at each step", "A leaf is a node with no left and no right — check remaining === 0 there"],
    tags: ["trees", "DFS", "recursion"], estimatedMinutes: 12,
  },
  {
    id: "level-order-bfs",
    tier: 3, category: "trees",
    title: "Level Order Traversal (BFS)",
    tagline: "Visit every level, left to right.",
    description: "Write `levelOrder(root)` that returns a 2D array where each sub-array contains the values of nodes at that depth level. Use BFS (a queue).",
    why: "BFS on a tree is the gateway to BFS on graphs. The queue-based approach here is the same algorithm that finds the shortest path in an unweighted graph.",
    analogy: "Wave propagation — every node at distance 1 is visited before anything at distance 2.",
    examples: [
      { input: "levelOrder(root) // 3 at top, [9,20] below, [15,7] at bottom", output: "[[3],[9,20],[15,7]]" },
      { input: "levelOrder(null)", output: "[]" },
    ],
    starterCode: `function levelOrder(root) {\n  // use a queue for BFS\n  // return an array of arrays, one per level\n}`,
    functionName: "levelOrder",
    testCases: [
      {
        args: [{ val: 3, left: { val: 9, left: null, right: null }, right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } } }],
        expected: [[3], [9, 20], [15, 7]], label: "classic 3-level tree",
      },
      { args: [null], expected: [], label: "null → []" },
      { args: [{ val: 1, left: null, right: null }], expected: [[1]], label: "single node" },
      {
        args: [{ val: 1, left: { val: 2, left: null, right: null }, right: { val: 3, left: null, right: null } }],
        expected: [[1], [2, 3]], label: "two levels", hidden: true,
      },
    ],
    solution: `function levelOrder(root) {\n  if (!root) return [];\n  const result = [];\n  const queue = [root];\n  while (queue.length) {\n    const levelSize = queue.length;\n    const level = [];\n    for (let i = 0; i < levelSize; i++) {\n      const node = queue.shift();\n      level.push(node.val);\n      if (node.left) queue.push(node.left);\n      if (node.right) queue.push(node.right);\n    }\n    result.push(level);\n  }\n  return result;\n}`,
    solutionExplanation: "Use a queue. Each iteration of the outer loop processes exactly one level: snapshot the current queue length, dequeue that many nodes, collect their values, and enqueue their children.",
    hints: ["Use an array as a queue: push to add, shift to remove", "The trick: snapshot queue.length at the start of each level — that's how many nodes belong to this level"],
    tags: ["trees", "BFS", "queue"], estimatedMinutes: 18,
  },
  {
    id: "is-valid-bst",
    tier: 3, category: "trees",
    title: "Validate BST",
    tagline: "Is every node in the right place?",
    description: "Write `isValidBST(root)` that returns `true` if the tree is a valid Binary Search Tree. A valid BST satisfies: all values in the left subtree < node.val < all values in the right subtree (not just immediate children).",
    why: "The common mistake (only checking immediate children) teaches the most important lesson in tree problems: state must be propagated down, not just checked locally.",
    analogy: "It's not enough for each parent to be between its two children. Every ancestor constrains every descendant.",
    examples: [
      { input: "isValidBST({val:2, left:{val:1,...}, right:{val:3,...}})", output: "true" },
      { input: "isValidBST({val:5, left:{val:1,...}, right:{val:4,left:{val:3},right:{val:6}}})", output: "false", note: "4 is in the right subtree but < 5" },
    ],
    starterCode: `function isValidBST(root) {\n  // you need to track min and max bounds as you recurse\n}`,
    functionName: "isValidBST",
    testCases: [
      {
        args: [{ val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } }],
        expected: true, label: "valid BST [2,1,3]",
      },
      {
        args: [{ val: 5, left: { val: 1, left: null, right: null }, right: { val: 4, left: { val: 3, left: null, right: null }, right: { val: 6, left: null, right: null } } }],
        expected: false, label: "invalid — 4 in right subtree of 5",
      },
      { args: [null], expected: true, label: "null → true", hidden: true },
      {
        args: [{ val: 10, left: { val: 5, left: { val: 1, left: null, right: null }, right: { val: 7, left: null, right: null } }, right: { val: 15, left: { val: 11, left: null, right: null }, right: { val: 20, left: null, right: null } } }],
        expected: true, label: "valid deeper BST", hidden: true,
      },
    ],
    solution: `function isValidBST(root, min = -Infinity, max = Infinity) {\n  if (!root) return true;\n  if (root.val <= min || root.val >= max) return false;\n  return isValidBST(root.left, min, root.val)\n      && isValidBST(root.right, root.val, max);\n}`,
    solutionExplanation: "Pass down min and max bounds. When going left, the current node's value becomes the new max. When going right, it becomes the new min. If any node violates its bounds, return false.",
    hints: ["Pass min and max bounds through every recursive call", "Going left: current node's value is the new max (nothing in left subtree can be >= it)", "Going right: current node's value is the new min"],
    tags: ["trees", "BST", "recursion"], estimatedMinutes: 20,
  },
  {
    id: "lowest-common-ancestor",
    tier: 4, category: "trees",
    title: "Lowest Common Ancestor",
    tagline: "The deepest node that is an ancestor of both.",
    description: "Given a BST and two node values `p` and `q`, write `lowestCommonAncestor(root, p, q)` that returns the value of their lowest common ancestor node.",
    why: "LCA appears in network routing, dependency resolution, and version control (git merge-base). The BST version teaches you how structure enables smarter decisions than brute force.",
    analogy: "In a family tree, the LCA is the closest common grandparent — not necessarily the oldest one.",
    examples: [
      { input: "lowestCommonAncestor(bst, 2, 8) // BST root=6", output: "6", note: "root is between 2 and 8" },
      { input: "lowestCommonAncestor(bst, 2, 4) // BST root=6", output: "4", note: "4 is ancestor of 2 and 4" },
    ],
    starterCode: `function lowestCommonAncestor(root, p, q) {\n  // use the BST property: all left < root < all right\n}`,
    functionName: "lowestCommonAncestor",
    testCases: [
      {
        args: [
          { val: 6, left: { val: 2, left: { val: 0, left: null, right: null }, right: { val: 4, left: { val: 3, left: null, right: null }, right: { val: 5, left: null, right: null } } }, right: { val: 8, left: { val: 7, left: null, right: null }, right: { val: 9, left: null, right: null } } },
          2, 8,
        ],
        expected: 6, label: "2 and 8 → LCA is 6",
      },
      {
        args: [
          { val: 6, left: { val: 2, left: { val: 0, left: null, right: null }, right: { val: 4, left: { val: 3, left: null, right: null }, right: { val: 5, left: null, right: null } } }, right: { val: 8, left: { val: 7, left: null, right: null }, right: { val: 9, left: null, right: null } } },
          2, 4,
        ],
        expected: 2, label: "2 and 4 → LCA is 2 (4 is a descendant of 2)",
      },
    ],
    solution: `function lowestCommonAncestor(root, p, q) {\n  if (!root) return null;\n  if (p < root.val && q < root.val) return lowestCommonAncestor(root.left, p, q);\n  if (p > root.val && q > root.val) return lowestCommonAncestor(root.right, p, q);\n  return root.val;\n}`,
    solutionExplanation: "In a BST: if both values are less than root, LCA is in left subtree. If both greater, it's in right subtree. Otherwise, root splits them — root is the LCA.",
    hints: ["Use the BST property — if both p and q are less than root.val, go left", "If they're on opposite sides of root.val, root IS the LCA"],
    tags: ["trees", "BST", "recursion"], estimatedMinutes: 15,
  },
];

// ── Graph Exercises ───────────────────────────────────────────────────────────
export const GRAPH_EXERCISES: Exercise[] = [
  {
    id: "number-of-islands",
    tier: 3, category: "graphs",
    title: "Number of Islands",
    tagline: "Count connected landmasses in a grid.",
    description: "Write `numIslands(grid)` that counts the number of islands in a 2D grid of '1's (land) and '0's (water). An island is surrounded by water and formed by connecting adjacent '1's horizontally or vertically.",
    why: "This is the canonical graph problem in disguise. The grid is a graph where each '1' is a node connected to adjacent '1's. Solving it with DFS teaches the flood-fill algorithm behind MS Paint, image segmentation, and game map generation.",
    analogy: "Look at a map from above. Each landmass you can trace without crossing water is one island.",
    examples: [
      { input: `numIslands([["1","1","0"],["1","1","0"],["0","0","1"]])`, output: "2" },
      { input: `numIslands([["1","1","1"],["0","1","0"],["1","1","1"]])`, output: "1", note: "all connected" },
    ],
    starterCode: `function numIslands(grid) {\n  // DFS flood fill — sink each island as you count it\n}`,
    functionName: "numIslands",
    testCases: [
      {
        args: [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]],
        expected: 3, label: "4-row grid → 3 islands",
      },
      {
        args: [[["1","1","1"],["0","1","0"],["1","1","1"]]],
        expected: 1, label: "ring — all connected → 1 island",
      },
      {
        args: [[["0","0","0"],["0","0","0"]]],
        expected: 0, label: "all water → 0",
      },
      {
        args: [[["1","0","1","0","1"]]],
        expected: 3, label: "row of alternating land/water → 3", hidden: true,
      },
    ],
    solution: `function numIslands(grid) {\n  if (!grid.length) return 0;\n  let count = 0;\n  function dfs(r, c) {\n    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] !== '1') return;\n    grid[r][c] = '0'; // sink visited land\n    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);\n  }\n  for (let r = 0; r < grid.length; r++) {\n    for (let c = 0; c < grid[0].length; c++) {\n      if (grid[r][c] === '1') { count++; dfs(r, c); }\n    }\n  }\n  return count;\n}`,
    solutionExplanation: "Walk every cell. When you find a '1', increment the count and flood-fill the entire island (DFS sinking '1's to '0' as you go). The count equals the number of times you started a flood fill.",
    hints: ["When you find land, flood-fill the whole island before counting the next one", "Sinking visited cells (setting to '0') prevents revisiting — it's your 'visited' set"],
    tags: ["graphs", "DFS", "flood-fill", "grid"], estimatedMinutes: 20,
  },
  {
    id: "can-finish-courses",
    tier: 4, category: "graphs",
    title: "Course Schedule",
    tagline: "Can you complete all courses? Detect the cycle.",
    description: "Write `canFinish(numCourses, prerequisites)` where `prerequisites[i] = [a, b]` means you must take course b before a. Return `true` if it's possible to finish all courses (no circular dependency).",
    why: "Cycle detection in a directed graph is how package managers (npm, pip) detect circular dependencies and how build systems detect deadlocks. This is one of the most practically important graph algorithms.",
    analogy: "You can't take Algorithm Design before Data Structures, and Data Structures before Intro CS. But if Intro CS required Algorithm Design, you'd have a deadlock — nobody could start.",
    examples: [
      { input: "canFinish(2, [[1,0]])", output: "true", note: "take 0 then 1" },
      { input: "canFinish(2, [[1,0],[0,1]])", output: "false", note: "0 needs 1, 1 needs 0 — deadlock" },
    ],
    starterCode: `function canFinish(numCourses, prerequisites) {\n  // build adjacency list, then detect cycle with DFS\n  // states: 0=unvisited, 1=visiting, 2=done\n}`,
    functionName: "canFinish",
    testCases: [
      { args: [2, [[1, 0]]], expected: true, label: "simple dependency → true" },
      { args: [2, [[1, 0], [0, 1]]], expected: false, label: "circular dependency → false" },
      { args: [3, [[1, 0], [2, 1]]], expected: true, label: "chain 0→1→2 → true" },
      { args: [3, [[1, 0], [2, 1], [0, 2]]], expected: false, label: "3-way cycle → false" },
      { args: [1, []], expected: true, label: "single course, no prereqs → true", hidden: true },
    ],
    solution: `function canFinish(numCourses, prerequisites) {\n  const graph = Array.from({ length: numCourses }, () => []);\n  for (const [a, b] of prerequisites) graph[b].push(a);\n  const state = new Array(numCourses).fill(0);\n  function hasCycle(node) {\n    if (state[node] === 1) return true;  // currently visiting = cycle\n    if (state[node] === 2) return false; // already done, no cycle\n    state[node] = 1;\n    for (const neighbor of graph[node]) {\n      if (hasCycle(neighbor)) return true;\n    }\n    state[node] = 2;\n    return false;\n  }\n  for (let i = 0; i < numCourses; i++) {\n    if (hasCycle(i)) return false;\n  }\n  return true;\n}`,
    solutionExplanation: "Build an adjacency list. Use DFS with three states: unvisited (0), currently in the DFS stack (1), and done (2). Finding a node with state 1 during DFS means we've found a back edge — a cycle. If we complete DFS on all nodes without finding one, no cycle exists.",
    hints: ["Build an adjacency list first", "Track three states: unvisited, visiting, done", "If you reach a node you're currently visiting, you've found a cycle"],
    tags: ["graphs", "DFS", "cycle-detection", "topological-sort"], estimatedMinutes: 25,
  },
  {
    id: "dfs-connected",
    tier: 3, category: "graphs",
    title: "Number of Connected Components",
    tagline: "How many separate groups are in this graph?",
    description: "Write `countComponents(n, edges)` where `n` is the number of nodes (0 to n-1) and `edges` is an array of undirected edges `[u, v]`. Return the number of connected components.",
    why: "Connected components power friend-of-friend recommendations, map clustering, and network analysis. This problem is the same algorithm used in Union-Find, a data structure that appears in Kruskal's MST algorithm.",
    analogy: "Think of social media cliques — people who know each other (directly or through friends) are in one component. Isolated strangers form separate components.",
    examples: [
      { input: "countComponents(5, [[0,1],[1,2],[3,4]])", output: "2", note: "{0,1,2} and {3,4}" },
      { input: "countComponents(5, [[0,1],[1,2],[2,3],[3,4]])", output: "1", note: "all connected" },
    ],
    starterCode: `function countComponents(n, edges) {\n  // build adjacency list, then DFS/BFS to count groups\n}`,
    functionName: "countComponents",
    testCases: [
      { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2, label: "{0,1,2} and {3,4} → 2" },
      { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1, label: "all connected → 1" },
      { args: [4, []], expected: 4, label: "no edges → 4 isolated nodes" },
      { args: [1, []], expected: 1, label: "single node → 1", hidden: true },
    ],
    solution: `function countComponents(n, edges) {\n  const graph = Array.from({ length: n }, () => []);\n  for (const [u, v] of edges) { graph[u].push(v); graph[v].push(u); }\n  const visited = new Set();\n  function dfs(node) {\n    visited.add(node);\n    for (const neighbor of graph[node]) {\n      if (!visited.has(neighbor)) dfs(neighbor);\n    }\n  }\n  let count = 0;\n  for (let i = 0; i < n; i++) {\n    if (!visited.has(i)) { count++; dfs(i); }\n  }\n  return count;\n}`,
    solutionExplanation: "Build an undirected adjacency list. For each unvisited node, run DFS to mark all nodes reachable from it as visited, and increment the component count. The number of times you start a DFS equals the number of components.",
    hints: ["Build an undirected adjacency list (push both directions for each edge)", "Each time you start DFS from an unvisited node, you've found a new component"],
    tags: ["graphs", "DFS", "components"], estimatedMinutes: 15,
  },
];

// ── BST Class Implementation ──────────────────────────────────────────────────
// (SPECIAL_RUNNER in testRunner.ts handles the tests for this one)
export const BST_EXERCISE: Exercise = {
  id: "implement-bst",
  tier: 3, category: "trees",
  title: "Implement a Binary Search Tree",
  tagline: "insert, search, and inorder — from scratch.",
  description: "Create a `BST` class with three methods:\n- `insert(val)` — add a new node maintaining BST order\n- `search(val)` — return `true` if val exists\n- `inorder()` — return an array of all values in sorted order",
  why: "A BST is one of the most important data structures in CS. Every database index, autocomplete system, and interval scheduler relies on tree structure. Building one from scratch makes every tree problem after this easier.",
  analogy: "A BST is like a phone book where every person on the left page has a name before yours, and every person on the right page has a name after. Finding anyone takes log(n) steps.",
  examples: [
    { input: "const bst = new BST();\nbst.insert(5); bst.insert(3); bst.insert(7);\nbst.search(3)", output: "true" },
    { input: "bst.search(99)", output: "false" },
    { input: "bst.inorder()", output: "[3, 5, 7]", note: "always sorted" },
  ],
  starterCode: `class BST {\n  constructor() {\n    this.root = null;\n  }\n\n  insert(val) {\n    // add val maintaining BST order\n  }\n\n  search(val) {\n    // return true if val exists, false otherwise\n  }\n\n  inorder() {\n    // return sorted array of all values\n  }\n}`,
  functionName: "BST",
  testCases: [], // handled by SPECIAL_RUNNER in testRunner.ts
  solution: `class BST {\n  constructor() { this.root = null; }\n\n  insert(val) {\n    const node = { val, left: null, right: null };\n    if (!this.root) { this.root = node; return; }\n    let curr = this.root;\n    while (true) {\n      if (val < curr.val) {\n        if (!curr.left) { curr.left = node; return; }\n        curr = curr.left;\n      } else {\n        if (!curr.right) { curr.right = node; return; }\n        curr = curr.right;\n      }\n    }\n  }\n\n  search(val) {\n    let curr = this.root;\n    while (curr) {\n      if (val === curr.val) return true;\n      curr = val < curr.val ? curr.left : curr.right;\n    }\n    return false;\n  }\n\n  inorder() {\n    const result = [];\n    function traverse(node) {\n      if (!node) return;\n      traverse(node.left);\n      result.push(node.val);\n      traverse(node.right);\n    }\n    traverse(this.root);\n    return result;\n  }\n}`,
  solutionExplanation: "insert: walk down using BST property (go left if val < curr, right otherwise) until finding an empty spot. search: same walk, return true when found. inorder: recursive left-root-right traversal naturally yields sorted order.",
  hints: ["insert: start at root, go left if val < curr.val, right otherwise, until you find null", "search: same walk as insert, return true when values match", "inorder: left → push val → right (recursive)"],
  tags: ["BST", "trees", "OOP"], estimatedMinutes: 25,
};

export const ALL_TREE_GRAPH_EXERCISES: Exercise[] = [
  ...TREE_EXERCISES,
  BST_EXERCISE,
  ...GRAPH_EXERCISES,
];
