import { useState } from 'react';
import Button from '../Button.jsx';
import Card from '../Card.jsx';
import { useRecordMatch } from '../../hooks/queries.js';

const field =
  'mt-1 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-500';

export default function RecordMatchModal({ open, onClose, onRecorded }) {
  const recordMatch = useRecordMatch();
  const [form, setForm] = useState({
    opponent_name: '',
    result: 'won',
    score_for: 21,
    score_against: 18,
    is_mvp: false,
  });
  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    const res = await recordMatch.mutateAsync({
      ...form,
      score_for: Number(form.score_for),
      score_against: Number(form.score_against),
    });
    onRecorded?.(res);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="font-display text-xl font-bold">Record a Match</h2>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="text-text-secondary">Opponent</span>
            <input className={field} value={form.opponent_name} onChange={set('opponent_name')} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-text-secondary">Result</span>
              <select className={field} value={form.result} onChange={set('result')}>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-text-secondary">MVP?</span>
              <div className="mt-2">
                <input type="checkbox" checked={form.is_mvp} onChange={set('is_mvp')} /> I was MVP
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-text-secondary">Your Score</span>
              <input type="number" className={field} value={form.score_for} onChange={set('score_for')} required />
            </label>
            <label className="block text-sm">
              <span className="text-text-secondary">Opponent Score</span>
              <input type="number" className={field} value={form.score_against} onChange={set('score_against')} required />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordMatch.isPending}>
              {recordMatch.isPending ? 'Saving…' : 'Save Match'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
