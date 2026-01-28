import { prisma } from "@/lib/prisma";

export async function isPayoutsDisabled() {
  if (process.env.PAYOUTS_DISABLED === "true") return true;
  const setting = await prisma.platformSetting.findUnique({
    where: { key: "payouts_disabled" },
  });
  return setting?.value === "true";
}

export async function setPayoutsDisabled(disabled: boolean) {
  await prisma.platformSetting.upsert({
    where: { key: "payouts_disabled" },
    create: { key: "payouts_disabled", value: disabled ? "true" : "false" },
    update: { value: disabled ? "true" : "false" },
  });
}
