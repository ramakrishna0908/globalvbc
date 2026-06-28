import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';

// Stub — 6-step wizard lands in Epic G (#7).
export default function Onboarding() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card className="p-8">
          <h1 className="font-display text-2xl font-bold">Welcome to GlobalVBC</h1>
          <p className="mt-2 text-text-secondary">Onboarding flow coming with Epic G.</p>
        </Card>
      </main>
    </>
  );
}
