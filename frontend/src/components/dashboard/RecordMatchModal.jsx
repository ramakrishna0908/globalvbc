import { useState } from 'react';
import Button from '../Button.jsx';
import Dialog from '../ui/Dialog.jsx';
import Field, { Checkbox } from '../ui/Field.jsx';
import { useRecordMatch } from '../../hooks/queries.js';

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
    <Dialog open={open} onClose={onClose} title="Record a match" description="Self-reported results feed your legacy rating. Officially scored matches count separately.">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Opponent" value={form.opponent_name} onChange={set('opponent_name')} required />
        <div className="grid grid-cols-2 gap-3">
          <Field as="select" label="Result" value={form.result} onChange={set('result')}>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </Field>
          <Checkbox className="self-end" label="I was MVP" checked={form.is_mvp} onChange={set('is_mvp')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your score" type="number" inputMode="numeric" value={form.score_for} onChange={set('score_for')} required />
          <Field label="Opponent score" type="number" inputMode="numeric" value={form.score_against} onChange={set('score_against')} required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={recordMatch.isPending}>
            {recordMatch.isPending ? 'Saving…' : 'Save match'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
