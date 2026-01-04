export default function HomePage() {
  return (
    <main style={{ padding: 20, maxWidth: 720 }}>
      <h1>BuyAMinute (MVP)</h1>
      <p>Minimal navigation for testing.</p>

      <ul style={{ lineHeight: 1.8 }}>
        <li>
          <a href="/wallet">Wallet</a>
        </li>
        <li>
          <a href="/receiver">Receiver Dashboard</a>
        </li>
        <li>
          <a href="/call">Caller</a>
        </li>
      </ul>
    </main>
  );
}
