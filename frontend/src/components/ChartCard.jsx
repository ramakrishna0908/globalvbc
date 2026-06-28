import { ResponsiveContainer } from 'recharts';
import Card from './Card.jsx';

export default function ChartCard({ title, action, height = 220, children }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-display font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
