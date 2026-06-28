import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';

// Stub — wired to auth API in Epic B/G.
export default function Register() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8">
          <h1 className="font-display text-2xl font-bold">Join as Player</h1>
          <p className="mt-2 text-text-secondary">Registration form coming with Epic B.</p>
        </Card>
      </main>
    </>
  );
}
