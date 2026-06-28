import { useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader.jsx';
import Card from '../components/Card.jsx';

// Stub — shareable profile card + QR lands in Epic I (#9).
export default function PublicProfile() {
  const { id } = useParams();
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Player Profile</h1>
          <p className="mt-2 text-text-secondary">Profile “{id}” — shareable card coming with Epic I.</p>
        </Card>
      </main>
    </>
  );
}
