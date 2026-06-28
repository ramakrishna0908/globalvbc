import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';

// Stub — full identity + performance hub lands in Epic H (#8).
export default function Dashboard() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Your Volleyball Identity</h1>
        <Card className="mt-6 p-8">
          <p className="text-text-secondary">Dashboard coming with Epic H.</p>
        </Card>
      </main>
    </>
  );
}
