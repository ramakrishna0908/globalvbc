import Card, { CardHeader } from '../Card.jsx';
import ProgressBar from '../ProgressBar.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

export default function SkillStats({ metrics }) {
  const skills = [
    ['Serving', metrics.serving],
    ['Passing', metrics.passing],
    ['Attack efficiency', metrics.attack],
    ['Defense', metrics.defense],
    ['Consistency', metrics.consistency],
  ];
  return (
    <Card padding>
      <CardHeader title="Skill statistics" action={<StatusBadge status="champion" size="sm" label={`${metrics.mvp_count} MVP`} />} />
      <div className="space-y-3">
        {skills.map(([label, value]) => (
          <ProgressBar key={label} label={label} value={value} max={100} accent="gold" />
        ))}
      </div>
    </Card>
  );
}
