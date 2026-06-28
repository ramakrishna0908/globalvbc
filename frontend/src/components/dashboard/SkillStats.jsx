import Card from '../Card.jsx';
import ProgressBar from '../ProgressBar.jsx';

export default function SkillStats({ metrics }) {
  const skills = [
    ['Serving', metrics.serving],
    ['Passing', metrics.passing],
    ['Attack Efficiency', metrics.attack],
    ['Defense', metrics.defense],
    ['Consistency', metrics.consistency],
  ];
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Skill Statistics</h3>
        <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300">
          🏆 {metrics.mvp_count} MVP
        </span>
      </div>
      <div className="space-y-3">
        {skills.map(([label, value]) => (
          <ProgressBar key={label} label={label} value={value} max={100} accent="gold" />
        ))}
      </div>
    </Card>
  );
}
