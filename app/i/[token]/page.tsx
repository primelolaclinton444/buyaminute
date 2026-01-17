import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type InviteDetails = {
  inviterName: string;
  inviterEmail: string | null;
};

async function getInviteDetails(token: string): Promise<InviteDetails | null> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      revokedAt: true,
      expiresAt: true,
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invite) return null;
  if (invite.revokedAt) return null;

  const now = new Date();
  if (invite.expiresAt && invite.expiresAt <= now) return null;

  return {
    inviterName: invite.inviter.name ?? "BuyAMinute member",
    inviterEmail: invite.inviter.email,
  };
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const inviteDetails = await getInviteDetails(params.token);

  if (!inviteDetails) {
    return (
      <main className={styles.page}>
        <Section className={styles.section}>
          <Container className={styles.container}>
            <h1 className={styles.title}>Invite link invalid or expired</h1>
            <p className={styles.body}>
              This invite is no longer active. You can still enter the market and explore live
              icons.
            </p>
            <Button href="/browse" size="lg" className={styles.cta}>
              Enter the market
            </Button>
          </Container>
        </Section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Section className={styles.section}>
        <Container className={styles.container}>
          <p className={styles.eyebrow}>Paid invite</p>
          <h1 className={styles.title}>You were invited by {inviteDetails.inviterName}</h1>
          {inviteDetails.inviterEmail ? (
            <p className={styles.body}>Inviter email: {inviteDetails.inviterEmail}</p>
          ) : null}
          <p className={styles.body}>
            This link does not grant free access. Continue into the paid flow to request time.
          </p>
          <Button href="/browse" size="lg" className={styles.cta}>
            Enter the market
          </Button>
        </Container>
      </Section>
    </main>
  );
}
