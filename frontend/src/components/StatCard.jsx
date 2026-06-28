import Card from './Card.jsx';

const ACCENTS = {
  gold: 'text-brand-400',
  blue: 'text-accent-400',
  violet: 'text-violet-400',
  default: 'text-text-primary',
};

export default function StatCard({ label, value, sublabel, accent = 'default', icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-muted">{label}</span>
        {icon ? <span className="text-text-muted">{icon}</span> : null}
      </div>
      <div className={`mt-2 text-3xl font-display font-bold ${ACCENTS[accent] || ACCENTS.default}`}>
        {value}
      </div>
      {sublabel ? <div className="mt-1 text-sm text-text-secondary">{sublabel}</div> : null}
    </Card>
  );
}
