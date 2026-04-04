import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as LocalStrategy } from "passport-local";
import {
  getAccountByEmail,
  getAccountById,
  sanitizeAccount,
  type PublicAccount
} from "./store.js";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "percentdosegraph-dev-secret";

type AuthTokenPayload = {
  sub: number;
  email: string;
  role: string;
  iat: number;
};

export type AuthenticatedAccount = PublicAccount & {
  role?: string;
};

export function configurePassport() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        session: false
      },
      async (email, password, done) => {
        try {
          const account = await getAccountByEmail(email.toLowerCase());

          if (!account?.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const matches = await bcrypt.compare(password, account.passwordHash);
          if (!matches || account.isActive === false) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, sanitizeAccount(account));
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  passport.use(
    new BearerStrategy(async (token, done) => {
      try {
        const payload = verifyAuthToken(token);
        if (!payload) {
          return done(null, false);
        }

        const account = await getAccountById(payload.sub);
        if (!account || account.isActive === false) {
          return done(null, false);
        }

        return done(null, sanitizeAccount(account));
      } catch (error) {
        return done(error as Error);
      }
    })
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function issueAuthToken(account: {
  id: number;
  email: string;
  role?: string;
}) {
  const payload: AuthTokenPayload = {
    sub: account.id,
    email: account.email,
    role: account.role ?? "user",
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signToken(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signToken(encodedPayload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

function signToken(encodedPayload: string) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(encodedPayload).digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}
