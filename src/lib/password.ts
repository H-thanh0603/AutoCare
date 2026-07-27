/**
 * Password hashing.
 *
 * bcrypt with cost 12: slow enough to make offline cracking expensive, fast
 * enough (~250ms) for an interactive login on modest hardware.
 */

import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

/** Minimum length enforced here as a backstop; schemas validate the real rules. */
const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error("Password too short to hash");
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Compares a candidate password against a stored hash. Never logs either value.
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
