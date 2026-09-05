import { ResponsiveContainer } from 'recharts';
import Card, { CardHeader } from './Card.jsx';

export default function ChartCard({ title, action, height = 220, children }) {
  return (
    <Card padding>
      <CardHeader title={title} action={action} />
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
