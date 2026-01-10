export default function TermsPage() {
  return (
    <main style={{ padding: 32, maxWidth: 720, margin: "0 auto" }}>
      <h1>Terms of Service</h1>
      <p style={{ marginTop: 12 }}>
        These Terms of Service cover how BuyAMinute handles calls, payments, and
        refunds. This is a temporary placeholder while we finalize the full
        legal copy.
      </p>
      <ul style={{ marginTop: 16, lineHeight: 1.6 }}>
        <li>Calls are billed per minute after any free preview period.</li>
        <li>Experts are responsible for maintaining availability accuracy.</li>
        <li>Payments are processed in tokens and converted on withdrawal.</li>
        <li>Abuse, fraud, or chargebacks may lead to account suspension.</li>
      </ul>
      <p style={{ marginTop: 16 }}>
        For questions, email support@buyaminute.com.
      </p>
    </main>
  );
}
