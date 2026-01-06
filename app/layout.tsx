export const metadata = {
  title: "BuyAMinute",
  description: "Token-based calls MVP"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
