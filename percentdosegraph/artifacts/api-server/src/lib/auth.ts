import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { Strategy as LocalStrategy } from 'passport-local';
import { createClient } from '@supabase/supabase-js';
import {
  createAccount,
  getAccountByEmail,
  getAccountById,
  sanitizeAccount,
  updateAccountById,
  type PublicAccount,
} from './store.js';

const AUTH_SECRET = process.env.AUTH_SECRET ?? 'percentdosegraph-dev-secret';
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_AUTH_EMAIL_REDIRECT_TO = process.env.SUPABASE_AUTH_EMAIL_REDIRECT_TO ?? '';

const supabaseAuthClient =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

type AuthTokenPayload = {
  sub: number;
  email: string;
  role: string;
  iat: number;
};

export type AuthenticatedAccount = PublicAccount & {
  role?: string;
};

type SupabaseAuthPayload = {
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  } | null;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
};

export function configurePassport() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        session: false,
      },
      async (email, password, done) => {
        try {
          const account = await getAccountByEmail(email.toLowerCase());

          if (!account?.passwordHash) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const matches = await bcrypt.compare(password, account.passwordHash);
          if (!matches || account.isActive === false) {
            return done(null, false, { message: 'Invalid email or password' });
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
        if (isSupabaseAuthEnabled()) {
          const account = await resolveSupabaseAccountForToken(token);
          return done(null, account ?? false);
        }

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

export function isSupabaseAuthEnabled() {
  return Boolean(supabaseAuthClient);
}

export async function registerWithSupabase(input: {
  email: string;
  password: string;
  name?: string;
}) {
  if (!supabaseAuthClient) {
    throw new Error('Supabase auth is not configured');
  }

  const { data, error } = await supabaseAuthClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      ...(input.name ? { data: { name: input.name } } : {}),
      ...(SUPABASE_AUTH_EMAIL_REDIRECT_TO
        ? { emailRedirectTo: SUPABASE_AUTH_EMAIL_REDIRECT_TO }
        : {}),
    },
  });

  if (error) {
    throw error;
  }

  return data as SupabaseAuthPayload;
}

export async function loginWithSupabase(input: { email: string; password: string }) {
  if (!supabaseAuthClient) {
    throw new Error('Supabase auth is not configured');
  }

  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw error;
  }

  return data as SupabaseAuthPayload;
}

export async function resolveSupabaseAccountForToken(token: string) {
  if (!supabaseAuthClient) {
    return null;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return syncSupabaseUserAccount({
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata ?? {},
  });
}

export async function syncSupabaseUserAccount(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const email = user.email?.toLowerCase().trim();
  if (!email) {
    return null;
  }

  const preferredName =
    getSupabaseDisplayName(user.user_metadata) ?? email.split('@')[0] ?? 'Supabase User';
  const existing = await getAccountByEmail(email);

  if (!existing) {
    const created = await createAccount({
      name: preferredName,
      email,
      passwordHash: '',
      role: 'user',
      isActive: true,
    });
    return sanitizeAccount(created);
  }

  const nextName = existing.name?.trim() || preferredName;
  const nextIsActive = existing.isActive !== false;
  if (existing.name !== nextName || existing.isActive !== nextIsActive) {
    const updated = await updateAccountById(existing.id, {
      name: nextName,
      isActive: nextIsActive,
    });
    return sanitizeAccount(updated ?? existing);
  }

  return sanitizeAccount(existing);
}

export function issueAuthToken(account: { id: number; email: string; role?: string }) {
  const payload: AuthTokenPayload = {
    sub: account.id,
    email: account.email,
    role: account.role ?? 'user',
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signToken(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [encodedPayload, signature] = token.split('.');
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
  return crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSupabaseDisplayName(metadata?: Record<string, unknown>) {
  if (!metadata) {
    return null;
  }

  const candidates = [metadata.name, metadata.full_name, metadata.display_name];
  const value = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value.trim() : null;
}
