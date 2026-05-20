export default function CollectionsPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 28px', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 18, opacity: 0.5 }}>📁</div>
      <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Collections
      </h1>
      <p style={{ color: 'var(--t3)', fontSize: 13, margin: '0 0 6px', lineHeight: 1.6 }}>
        Organise saved threads and subreddits into named collections for campaigns and outreach.
      </p>
      <p style={{ color: 'var(--t4)', fontSize: 12, margin: 0 }}>Coming soon</p>
    </div>
  );
}
