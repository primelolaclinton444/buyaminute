// ================================
// BuyAMinute — Deposit Address Provisioning
// Phase 1 (get-or-create, derived from xpub)
// ================================
//
// Assigns each user a unique, permanent USDT-TRC20 deposit address,
// derived from TRON_DEPOSIT_XPUB. Idempotent: a user always gets the
// same address back. Index is sequential (0, 1, 2, ...) and recoverable
// offline (look the address up in your BIP39 tool to get its private key
// for sweeping). No private key is ever needed or stored on the server.

import { prisma } from "@/lib/prisma";
import { deriveTronDepositAddress } from "@/lib/tron/deriveAddress";

const MAX_ATTEMPTS = 50;

/**
 * Return the user's deposit address, creating one if they don't have it yet.
 */
export async function getOrCreateDepositAddress(userId: string): Promise<string> {
  // Already provisioned? Return it.
  const existing = await prisma.depositAddress.findUnique({ where: { userId } });
  if (existing) return existing.tronAddress;

  // Next index = current row count. Increment if that address is already taken.
  let index = await prisma.depositAddress.count();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tronAddress = deriveTronDepositAddress(index);

    try {
      const created = await prisma.depositAddress.create({
        data: { userId, tronAddress },
      });
      return created.tronAddress;
    } catch (err: any) {
      // P2002 = unique constraint violation
      if (err?.code === "P2002") {
        const target = err?.meta?.target ?? [];
        const targetStr = Array.isArray(target) ? target.join(",") : String(target);

        if (targetStr.includes("userId")) {
          // Race: this user was provisioned concurrently. Return that address.
          const now = await prisma.depositAddress.findUnique({ where: { userId } });
          if (now) return now.tronAddress;
        }

        // Address collision (another user grabbed this index). Try the next one.
        index += 1;
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not allocate a deposit address after multiple attempts");
}
