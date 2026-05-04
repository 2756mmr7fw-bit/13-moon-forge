import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, forgeUsersTable, userIdentitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  OIDC_CLIENT_ID,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] ||
    req.headers["host"] ||
    process.env.REPLIT_DOMAINS?.split(",")[0] ||
    "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  // Upsert into the Replit Auth users table (session data source)
  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();

  // Upsert into forge_users so req.userId maps to the same stable ID
  await db.insert(forgeUsersTable).values({
    id: userData.id,
    email: userData.email,
    displayName: [userData.firstName, userData.lastName].filter(Boolean).join(" ") || null,
    avatarUrl: userData.profileImageUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: forgeUsersTable.id,
    set: {
      email: userData.email,
      displayName: [userData.firstName, userData.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: userData.profileImageUrl,
      updatedAt: new Date(),
    },
  });

  // Upsert into user_identities (provider = "replit")
  const existingIdentity = await db
    .select()
    .from(userIdentitiesTable)
    .where(and(
      eq(userIdentitiesTable.provider, "replit"),
      eq(userIdentitiesTable.providerId, userData.id),
    ))
    .limit(1);

  if (existingIdentity.length === 0) {
    await db.insert(userIdentitiesTable).values({
      forgeUserId: userData.id,
      provider: "replit",
      providerId: userData.id,
      createdAt: new Date(),
    }).onConflictDoNothing();
  }

  return user;
}

router.get("/auth/me", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

// POST /auth/me — same as GET but bypasses the Replit production CDN,
// which serves cached index.html for all GET requests.
router.post("/auth/me", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

async function buildLoginResponse(req: Request, res: Response) {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/x-auth/callback`;
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  return redirectTo.href;
}

router.get("/auth/login", async (req: Request, res: Response) => {
  try {
    const loginUrl = await buildLoginResponse(req, res);
    res.redirect(loginUrl);
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

// POST /auth/login — CDN-bypass: returns the OAuth URL as JSON instead of redirecting.
// The client navigates to the external Replit OAuth URL directly.
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const loginUrl = await buildLoginResponse(req, res);
    res.json({ loginUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

router.get("/auth/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/x-auth/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/x-auth/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/x-auth/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/x-auth/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

// POST /auth/callback — CDN-bypass: SPA detects code/state in URL params and
// POSTs them here to exchange for a session (instead of the GET redirect flow
// that the CDN intercepts).
router.post("/auth/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/x-auth/callback`;

    const { code, state: incomingState, iss } = req.body as {
      code?: string;
      state?: string;
      iss?: string;
    };

    // Accept verifier from request body (client-side PKCE flow where the verifier
    // is stored in sessionStorage and sent here) OR from a cookie (server-side
    // login flow where the GET /auth/login handler set the cookie).
    const { verifier: bodyVerifier } = req.body as { verifier?: string };
    const codeVerifier = bodyVerifier ?? req.cookies?.code_verifier;
    const nonce = req.cookies?.nonce;
    // For client-side PKCE the server has no stored expected state; use the
    // incoming state as the expected value (PKCE code_verifier provides the
    // security guarantee in this flow).
    const expectedState = req.cookies?.state ?? incomingState;

    if (!code || !codeVerifier) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    const currentUrl = new URL(callbackUrl);
    currentUrl.searchParams.set("code", code);
    if (incomingState) currentUrl.searchParams.set("state", incomingState);
    if (iss) currentUrl.searchParams.set("iss", iss);

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce ?? undefined,
      expectedState,
      idTokenExpected: true,
    });

    const returnTo = getSafeReturnTo(req.cookies?.return_to);

    res.clearCookie("code_verifier", { path: "/" });
    res.clearCookie("nonce", { path: "/" });
    res.clearCookie("state", { path: "/" });
    res.clearCookie("return_to", { path: "/" });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.json({ returnTo });
  } catch (err) {
    res.status(401).json({ error: "Callback exchange failed" });
  }
});

router.get("/auth/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);
  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: OIDC_CLIENT_ID,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

// POST /auth/logout — CDN-bypass: clears session and returns the logout URL
// as JSON so the client can navigate to it (bypasses CDN GET interception).
router.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);
    const sid = getSessionId(req);
    await clearSession(res, sid);

    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: OIDC_CLIENT_ID,
      post_logout_redirect_uri: origin,
    });

    res.json({ logoutUrl: endSessionUrl.href });
  } catch {
    res.json({ logoutUrl: "/" });
  }
});

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required parameters" });
    return;
  }

  const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

  try {
    const config = await getOidcConfig();
    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
  } catch (err) {
    req.log.error({ err }, "Mobile token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
