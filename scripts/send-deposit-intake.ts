// scripts/send-deposit-intake.ts
const url = process.env.APP_URL + "/api/crypto/deposit-webhook";

async function main() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-deposit-secret": process.env.DEPOSIT_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({
      userId: process.env.TEST_USER_ID!,
      tronAddress: process.env.TEST_TRON_ADDRESS!,
      amountUsdt: 1.5,
      txHash: "0xTESTHASH_" + Date.now(),
      confirmations: 25,
    }),
  });

  const text = await res.text();
  console.log(res.status, text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
