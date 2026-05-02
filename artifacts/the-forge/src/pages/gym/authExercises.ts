import { Exercise } from "./types";

// ── Authentication & Security Module ─────────────────────────────────────────
// "Build a Clerk" — covering everything auth companies sell as a product.
// College skips security almost entirely. This module fixes that.

export const AUTH_EXERCISES: Exercise[] = [
  {
    id: "hash-password",
    format: "solve",
    tier: 2, category: "auth",
    title: "Hash a Password",
    tagline: "Never store a password in plain text.",
    description: "Write `hashPassword(password, salt)` that returns a deterministic hash string. Combine the salt and password (e.g. `salt + ':' + password`), then produce a simple hash using the djb2 algorithm: start at `5381`, for each character do `hash = (hash * 33) ^ charCode`, return the final value as a hex string.",
    why: "Every authentication system that has ever been breached that leaked plain-text passwords destroyed trust permanently. Hashing is non-negotiable. Real systems use bcrypt or Argon2 — but understanding the mechanics of what a hash IS (deterministic, one-way, salt prevents rainbow tables) is foundational knowledge every developer must have.",
    analogy: "A hash is a fingerprint: you can verify it matches, but you can't reverse-engineer the original from it. The salt is like adding your name to the fingerprint — two people with the same password get different hashes.",
    examples: [
      { input: "hashPassword('hunter2', 'abc123')", output: "a hex string (same input always = same output)" },
      { input: "hashPassword('hunter2', 'xyz789')", output: "a DIFFERENT hex string (different salt = different hash)" },
    ],
    starterCode: `function hashPassword(password, salt) {
  const input = salt + ':' + password;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    // hash = (hash * 33) XOR charCode
  }
  return hash.toString(16);
}`,
    functionName: "hashPassword",
    testCases: [
      { args: ["hunter2", "abc123"], expected: hashPasswordRef("hunter2", "abc123"), label: "deterministic: same input → same hash" },
      { args: ["hunter2", "xyz789"], expected: hashPasswordRef("hunter2", "xyz789"), label: "different salt → different hash" },
      { args: ["password123", "abc123"], expected: hashPasswordRef("password123", "abc123"), label: "different password → different hash" },
      { args: ["", "salt"], expected: hashPasswordRef("", "salt"), label: "empty password still hashes", hidden: true },
    ],
    solution: `function hashPassword(password, salt) {
  const input = salt + ':' + password;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash.toString(16);
}`,
    solutionExplanation: "djb2 is a classic non-cryptographic hash. It multiplies by 33 and XORs the character code — creating an avalanche effect where small input changes produce wildly different outputs. The salt is prepended so identical passwords hash differently per user.",
    hints: [
      "Combine salt and password first: `salt + ':' + password`",
      "The loop body is: `hash = (hash * 33) ^ input.charCodeAt(i)`",
      "JavaScript bitwise operations work on 32-bit integers — that's fine here",
      "Return `hash.toString(16)` to get a hex string",
    ],
    tags: ["auth", "hashing", "security", "djb2"], estimatedMinutes: 12,
  },
  {
    id: "constant-time-compare",
    format: "solve",
    tier: 2, category: "auth",
    title: "Constant-Time String Compare",
    tagline: "Prevent timing attacks with safe comparison.",
    description: "Write `safeCompare(a, b)` that returns `true` if two strings are identical. It must always take the same amount of time regardless of where the strings differ — do NOT short-circuit on the first mismatch.",
    why: "A naive `a === b` or character-by-character loop that returns false at the first mismatch leaks timing information. An attacker can measure response time to figure out how many characters of their guess are correct — and brute-force a token one character at a time. This is a real attack (HMAC timing attack) that has been exploited in production systems.",
    analogy: "A bad bouncer checks your ID and stops reading the moment something looks wrong. A safe bouncer reads every field every time, no matter what, then gives a single yes/no.",
    examples: [
      { input: "safeCompare('abc', 'abc')", output: "true" },
      { input: "safeCompare('abc', 'xyz')", output: "false" },
      { input: "safeCompare('abc', 'abcd')", output: "false (different lengths)" },
    ],
    starterCode: `function safeCompare(a, b) {
  // MUST NOT short-circuit on first mismatch
  // Always iterate through every character
}`,
    functionName: "safeCompare",
    testCases: [
      { args: ["abc", "abc"], expected: true, label: "identical strings → true" },
      { args: ["abc", "xyz"], expected: false, label: "completely different → false" },
      { args: ["abc", "abcd"], expected: false, label: "different lengths → false" },
      { args: ["", ""], expected: true, label: "empty strings → true" },
      { args: ["secret-token-xyz", "secret-token-xyz"], expected: true, label: "realistic token match", hidden: true },
      { args: ["secret-token-xyz", "secret-token-XYZ"], expected: false, label: "case sensitive", hidden: true },
    ],
    solution: `function safeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}`,
    solutionExplanation: "XOR two characters: if they match, XOR is 0. OR all XOR results together: if any characters differed, the accumulated result is non-zero. This always runs the full loop — no early exit possible.",
    hints: [
      "Use XOR (^) to compare characters: matching chars XOR to 0",
      "Accumulate with OR (|=) — any non-zero means mismatch",
      "Check lengths separately first (that's safe — length leaks nothing useful)",
      "Return `result === 0` at the end",
    ],
    tags: ["auth", "security", "timing-attack", "XOR"], estimatedMinutes: 15,
  },
  {
    id: "generate-jwt",
    format: "solve",
    tier: 3, category: "auth",
    title: "Generate a JWT",
    tagline: "Build a signed token from scratch.",
    description: "Write `createJWT(payload, secret)` that returns a JWT string. A JWT has three base64url-encoded parts separated by dots: `header.payload.signature`. The header is always `{alg:'HS256',typ:'JWT'}`. The signature is a simple HMAC-like: `djb2Hash(base64url(header) + '.' + base64url(payload) + secret)`. Use this `btoa`-based base64url encoder: replace `+` with `-`, `/` with `_`, strip `=`.",
    why: "JWTs are how virtually every modern API authenticates requests. Understanding the structure — header, payload, signature — lets you debug auth issues, evaluate security tradeoffs, and know exactly what you're trusting when you verify one.",
    analogy: "A JWT is like a sealed envelope with a return address written in tamper-evident ink. Anyone can read the address (payload is not encrypted), but they can't change it without breaking the seal (signature fails).",
    examples: [
      { input: "createJWT({ userId: 1, exp: 9999999999 }, 'mysecret')", output: "a string like 'eyJ...eyJ...abc123'" },
      { input: "// three parts separated by dots", output: "header.payload.signature" },
    ],
    starterCode: `function createJWT(payload, secret) {
  function base64url(obj) {
    return btoa(JSON.stringify(obj))
      .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
  }
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return h.toString(16);
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  // 1. base64url-encode the header
  // 2. base64url-encode the payload
  // 3. sign: djb2(encodedHeader + '.' + encodedPayload + secret)
  // 4. return all three joined by '.'
}`,
    functionName: "createJWT",
    testCases: [
      { args: [{ userId: 1, exp: 9999999999 }, "mysecret"], expected: createJWTRef({ userId: 1, exp: 9999999999 }, "mysecret"), label: "produces correct token structure" },
      { args: [{ role: "admin" }, "supersecret"], expected: createJWTRef({ role: "admin" }, "supersecret"), label: "different payload, different token" },
      { args: [{ userId: 1 }, "key1"], expected: createJWTRef({ userId: 1 }, "key1"), label: "secret affects signature", hidden: true },
    ],
    solution: `function createJWT(payload, secret) {
  function base64url(obj) {
    return btoa(JSON.stringify(obj))
      .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
  }
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return h.toString(16);
  }
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  const signature = djb2(encodedHeader + '.' + encodedPayload + secret);
  return encodedHeader + '.' + encodedPayload + '.' + signature;
}`,
    solutionExplanation: "Base64url-encode the header and payload (JSON → btoa → URL-safe chars). Create the signing input by joining them with a dot, then append the secret and hash it. Join all three parts with dots.",
    hints: [
      "header and payload are both JSON-stringified then btoa'd",
      "The signature input is: encodedHeader + '.' + encodedPayload + secret",
      "Join the three parts: encodedHeader + '.' + encodedPayload + '.' + signature",
    ],
    tags: ["auth", "JWT", "base64", "tokens"], estimatedMinutes: 20,
  },
  {
    id: "verify-jwt",
    format: "solve",
    tier: 3, category: "auth",
    title: "Verify a JWT",
    tagline: "Trust but verify — actually, just verify.",
    description: "Write `verifyJWT(token, secret)` that returns the decoded payload object if the token is valid, or `null` if it is not. A token is valid if: (1) it has exactly 3 dot-separated parts, (2) the signature matches what you'd compute with the same secret, (3) the payload has no `exp` field OR `exp` is greater than `Date.now() / 1000`.",
    why: "Accepting a JWT without verifying its signature is the #1 JWT security mistake. Libraries hide this step, so developers don't always know it's happening. Building it yourself means you'll never forget to verify.",
    analogy: "Anyone can write a note that says 'I'm the admin'. The signature is what proves it came from someone who knew the secret. If the signature doesn't match, throw the note away.",
    examples: [
      { input: "verifyJWT(validToken, 'mysecret')", output: "{ userId: 1, exp: 9999999999 }" },
      { input: "verifyJWT(tamperedToken, 'mysecret')", output: "null" },
      { input: "verifyJWT(expiredToken, 'mysecret')", output: "null" },
    ],
    starterCode: `function verifyJWT(token, secret) {
  function base64url(obj) {
    return btoa(JSON.stringify(obj))
      .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
  }
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return h.toString(16);
  }
  function base64urlDecode(str) {
    return JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
  }
  // 1. Split token by '.'
  // 2. Verify it has 3 parts
  // 3. Recompute expected signature
  // 4. Compare signatures (use safeCompare or ===)
  // 5. Decode payload, check expiry
  // 6. Return payload or null
}`,
    functionName: "verifyJWT",
    testCases: [
      { args: [createJWTRef({ userId: 1, exp: 9999999999 }, "mysecret"), "mysecret"], expected: { userId: 1, exp: 9999999999 }, label: "valid token returns payload" },
      { args: [createJWTRef({ userId: 1 }, "mysecret") + "tampered", "mysecret"], expected: null, label: "tampered signature → null" },
      { args: [createJWTRef({ userId: 1, exp: 1 }, "mysecret"), "mysecret"], expected: null, label: "expired token → null" },
      { args: ["not.a.token", "mysecret"], expected: null, label: "malformed token → null" },
      { args: [createJWTRef({ role: "admin" }, "wrongkey"), "rightkey"], expected: null, label: "wrong secret → null", hidden: true },
    ],
    solution: `function verifyJWT(token, secret) {
  function base64url(obj) {
    return btoa(JSON.stringify(obj))
      .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
  }
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return h.toString(16);
  }
  function base64urlDecode(str) {
    return JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = djb2(encodedHeader + '.' + encodedPayload + secret);
    if (signature !== expectedSig) return null;
    const payload = base64urlDecode(encodedPayload);
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}`,
    solutionExplanation: "Split on dots, check 3 parts, recompute the signature with the same formula, compare to the provided signature. If they match, decode the payload and check expiry. Wrap in try/catch since atob/JSON.parse can throw on malformed input.",
    hints: [
      "Split by '.' and check you have exactly 3 parts",
      "Recompute: djb2(encodedHeader + '.' + encodedPayload + secret) — compare to the 3rd part",
      "Decode the payload with atob + JSON.parse (reverse of what createJWT did)",
      "Check expiry: payload.exp < Date.now() / 1000 means expired",
      "Wrap everything in try/catch — malformed tokens will throw",
    ],
    tags: ["auth", "JWT", "verification", "security"], estimatedMinutes: 20,
  },
  {
    id: "session-store",
    format: "solve",
    tier: 3, category: "auth",
    title: "Build a Session Store",
    tagline: "Server-side sessions with TTL expiry.",
    description: "Implement a `SessionStore` class with: `create(userId)` — stores a session and returns a random session ID string. `get(sessionId)` — returns the userId or `null` if not found or expired. `destroy(sessionId)` — removes the session. Sessions expire after `ttlMs` milliseconds (passed to constructor). `create` should use a simple counter for the ID (e.g. `'sess_1'`, `'sess_2'`).",
    why: "JWTs are stateless — the server can't invalidate them. Sessions are stateful — the server controls them. Understanding both and when to use which is a key architecture decision. Every 'logout everywhere' feature, every 'your account was compromised, sign out all devices' flow requires server-side sessions.",
    analogy: "A JWT is like a hotel key card with an expiry date stamped on it — the hotel has no record of it. A session is like a number on a coat check ticket — the coat check has the record and can tear it up anytime.",
    examples: [
      { input: "const store = new SessionStore(60000); // 1 min TTL\nconst id = store.create(42);\nstore.get(id)", output: "42" },
      { input: "store.destroy(id);\nstore.get(id)", output: "null" },
    ],
    starterCode: `class SessionStore {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
    this.counter = 0;
  }

  create(userId) {
    // generate a session ID, store { userId, expiresAt }, return the ID
  }

  get(sessionId) {
    // return userId if found and not expired, else null
    // clean up expired sessions
  }

  destroy(sessionId) {
    // remove the session
  }
}`,
    functionName: "SessionStore",
    testCases: [{ args: [], expected: true, label: "SessionStore is defined" }],
    solution: `class SessionStore {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
    this.counter = 0;
  }
  create(userId) {
    this.counter++;
    const id = 'sess_' + this.counter;
    this.sessions.set(id, { userId, expiresAt: Date.now() + this.ttlMs });
    return id;
  }
  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session.userId;
  }
  destroy(sessionId) {
    this.sessions.delete(sessionId);
  }
}`,
    solutionExplanation: "Store sessions in a Map keyed by session ID. Each entry holds the userId and an absolute expiry timestamp (Date.now() + ttlMs). On get(), check if the session exists and hasn't expired. Clean up expired sessions lazily (on access).",
    hints: [
      "Store `{ userId, expiresAt: Date.now() + this.ttlMs }` in a Map",
      "Session ID can be: `'sess_' + ++this.counter`",
      "In get(), compare Date.now() to session.expiresAt — if expired, delete and return null",
    ],
    tags: ["auth", "sessions", "Map", "TTL"], estimatedMinutes: 20,
  },
  {
    id: "rbac",
    format: "solve",
    tier: 3, category: "auth",
    title: "Role-Based Access Control",
    tagline: "Who can do what to which resource.",
    description: "Write `can(user, action, resource)` that returns `true` if the user's role has permission for the given action on the given resource. Use this permissions map: `admin` can do anything. `editor` can `read` and `write` any resource. `viewer` can only `read`. If the user has no role or an unknown role, return `false`.",
    why: "RBAC is how every enterprise application controls access. Clerk, Auth0, every permission system you'll ever work with is built on this pattern. Understanding it from first principles means you can extend it — adding resources, hierarchical roles, attribute-based rules — confidently.",
    analogy: "An office building: the janitor (viewer) can enter any room but only to look. The editor has a key to every room. The admin has master keys and can also change the locks.",
    examples: [
      { input: "can({ role: 'admin' }, 'delete', 'users')", output: "true" },
      { input: "can({ role: 'viewer' }, 'write', 'posts')", output: "false" },
      { input: "can({ role: 'editor' }, 'read', 'posts')", output: "true" },
      { input: "can({}, 'read', 'posts')", output: "false" },
    ],
    starterCode: `function can(user, action, resource) {
  const permissions = {
    admin:  { read: true, write: true, delete: true },
    editor: { read: true, write: true, delete: false },
    viewer: { read: true, write: false, delete: false },
  };
  // check user.role against permissions
}`,
    functionName: "can",
    testCases: [
      { args: [{ role: "admin" }, "delete", "users"], expected: true, label: "admin can delete" },
      { args: [{ role: "admin" }, "read", "posts"], expected: true, label: "admin can read" },
      { args: [{ role: "editor" }, "write", "posts"], expected: true, label: "editor can write" },
      { args: [{ role: "editor" }, "delete", "posts"], expected: false, label: "editor cannot delete" },
      { args: [{ role: "viewer" }, "read", "anything"], expected: true, label: "viewer can read" },
      { args: [{ role: "viewer" }, "write", "posts"], expected: false, label: "viewer cannot write" },
      { args: [{ role: "unknown" }, "read", "posts"], expected: false, label: "unknown role → false" },
      { args: [{}, "read", "posts"], expected: false, label: "no role → false", hidden: true },
    ],
    solution: `function can(user, action, resource) {
  const permissions = {
    admin:  { read: true, write: true, delete: true },
    editor: { read: true, write: true, delete: false },
    viewer: { read: true, write: false, delete: false },
  };
  if (!user.role || !permissions[user.role]) return false;
  return permissions[user.role][action] === true;
}`,
    solutionExplanation: "Look up the user's role in the permissions map. If the role doesn't exist, return false. Otherwise, check if the action is explicitly true for that role. The resource parameter is available for attribute-based extensions but isn't needed for basic RBAC.",
    hints: [
      "Check `user.role` exists first — if not, return false",
      "Look up `permissions[user.role]` — if it doesn't exist, return false",
      "Return `permissions[user.role][action] === true`",
    ],
    tags: ["auth", "RBAC", "permissions", "security"], estimatedMinutes: 10,
  },
  {
    id: "oauth-token-exchange",
    format: "solve",
    tier: 4, category: "auth",
    title: "OAuth Token Exchange",
    tagline: "Trade an authorization code for an access token.",
    description: "Write `exchangeCode(code, clientId, clientSecret, redirectUri)` that returns a Promise. It should call `POST https://auth.example.com/oauth/token` with a JSON body containing those four fields plus `grant_type: 'authorization_code'`. Return the parsed JSON response on success, or throw an Error with the response status code in the message (e.g. `'OAuth error: 401'`) on failure. Use the `fetch` API.",
    why: "OAuth is how 'Login with Google', 'Login with GitHub', and every SSO integration works. The authorization code flow has a specific handshake: the user logs in, the provider gives your server a short-lived code, your server trades that code for an access token (server-to-server, never in the browser). Getting this wrong exposes the token in URLs, logs, or browser history.",
    analogy: "OAuth is like a ticket system at a concert. The user (fan) gets a ticket stub (authorization code) at the gate. They hand it to the staff (your server). The staff takes it to the ticket office (OAuth provider) and exchanges it for a wristband (access token). The wristband is what actually gets you backstage.",
    examples: [
      { input: "await exchangeCode('abc123', 'myapp', 'secret', 'https://app.com/callback')", output: "{ access_token: '...', token_type: 'Bearer', ... }" },
    ],
    starterCode: `async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  // POST to 'https://auth.example.com/oauth/token'
  // Body: { code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }
  // On success (2xx): return parsed JSON
  // On failure: throw new Error('OAuth error: ' + status)
}`,
    functionName: "exchangeCode",
    testCases: [
      { args: ["code123", "clientA", "secretB", "https://app.com/cb"], expected: "function", label: "exchangeCode is an async function" },
    ],
    solution: `async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  const res = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('OAuth error: ' + res.status);
  return res.json();
}`,
    solutionExplanation: "POST to the token endpoint with JSON body. Check res.ok (true for 2xx). On failure, throw an Error with the status code. On success, return the parsed JSON which will contain access_token and other fields.",
    hints: [
      "Use fetch with method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...})",
      "Check `res.ok` — it's false for any 4xx or 5xx",
      "On error: `throw new Error('OAuth error: ' + res.status)`",
      "On success: `return res.json()`",
    ],
    tags: ["auth", "OAuth", "fetch", "async"], estimatedMinutes: 15,
  },
];

// ── Reference implementations for test case expected values ──────────────────
// These run at module load time to pre-compute expected values.
function hashPasswordRef(password: string, salt: string): string {
  const input = salt + ":" + password;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash.toString(16);
}

function createJWTRef(payload: object, secret: string): string {
  function base64url(obj: object): string {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function djb2(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
    return h.toString(16);
  }
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);
  const signature = djb2(encodedHeader + "." + encodedPayload + secret);
  return encodedHeader + "." + encodedPayload + "." + signature;
}
