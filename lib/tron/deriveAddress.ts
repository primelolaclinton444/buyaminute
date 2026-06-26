// ================================
// BuyAMinute — USDT-TRC20 Deposit Address Derivation
// Phase 1 (xpub-only, no spend capability)
// ================================
//
// Derives a unique, permanent TRON deposit address per user from an
// account-level extended PUBLIC key (xpub).
//
// SECURITY MODEL:
//   - Only the xpub lives on the server (env: TRON_DEPOSIT_XPUB).
//   - The xpub can GENERATE and WATCH addresses but CANNOT SPEND.
//   - The master mnemonic (which can spend) never touches this server.
//   - A breach here leaks addresses, not funds.
//
// DERIVATION:
//   - The xpub is the node at  m/44'/195'/0'/0  (TRON, BIP44 coin type 195).
//   - Child index i  ==  deposit address index i.
//   - Verified to match TronWeb's own HD derivation, indices 0..4.

import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { sha256 } from "@noble/hashes/sha256";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Lazy singleton: parse the xpub once per runtime.
let _accountNode: HDKey | null = null;

function getAccountNode(): HDKey {
  if (_accountNode) return _accountNode;

  const xpub = process.env.TRON_DEPOSIT_XPUB;
  if (!xpub) {
    throw new Error("TRON_DEPOSIT_XPUB is not set");
  }

  const node = HDKey.fromExtendedKey(xpub.trim());

  // Defense in depth: refuse a PRIVATE extended key on the server.
  if (node.privateKey) {
    throw new Error(
      "TRON_DEPOSIT_XPUB must be a PUBLIC extended key (xpub), never a private one"
    );
  }

  _accountNode = node;
  return node;
}

function base58check(payload: Uint8Array): string {
  const checksum = sha256(sha256(payload)).slice(0, 4);
  const full = new Uint8Array(payload.length + 4);
  full.set(payload);
  full.set(checksum, payload.length);

  // BigInt() calls (not 0n/256n literals) so this compiles on any tsc target.
  const ZERO = BigInt(0);
  const BASE = BigInt(58);
  const BYTE = BigInt(256);

  let num = ZERO;
  for (const b of full) num = num * BYTE + BigInt(b);

  let out = "";
  while (num > ZERO) {
    const r = Number(num % BASE);
    num = num / BASE;
    out = BASE58_ALPHABET[r] + out;
  }
  // Preserve leading zero bytes as '1' (not reachable for 0x41-prefixed
  // TRON addresses, but kept for correctness).
  for (const b of full) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}

function tronAddressFromPubkey(pub: Uint8Array): string {
  // Accepts compressed (33-byte) pubkey from BIP32; expands to uncompressed.
  const uncompressed = secp256k1.ProjectivePoint.fromHex(pub).toRawBytes(false); // 65 bytes
  const xy = uncompressed.slice(1); // drop 0x04 prefix -> 64 bytes
  const hash = keccak_256(xy); // 32 bytes
  const addr21 = new Uint8Array(21);
  addr21[0] = 0x41; // TRON mainnet address prefix
  addr21.set(hash.slice(-20), 1); // last 20 bytes of keccak
  return base58check(addr21);
}

/**
 * Derive the TRON deposit address for a given index.
 * Pure + deterministic: same xpub + same index => same address, always.
 */
export function deriveTronDepositAddress(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid derivation index: ${index}`);
  }
  const child = getAccountNode().deriveChild(index);
  if (!child.publicKey) {
    throw new Error(`Failed to derive public key at index ${index}`);
  }
  return tronAddressFromPubkey(child.publicKey);
}
