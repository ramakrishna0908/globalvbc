import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell.jsx';
import Field, { Checkbox } from '../../components/ui/Field.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { useToast } from '../../components/ui/ToastProvider.jsx';
import { tournamentsApi } from '../../api/endpoints.js';
import { useInvalidate } from '../../hooks/queries.js';
import { TOURNAMENT_FORMAT_LABELS, LEVEL_LABELS } from '../../lib/format.js';
import { FORMAT_HELP, POOL_FORMATS, errorMessage } from './tournamentUi.jsx';

const PRESETS = {
  bo3: { label: 'Best of 3', setsToWin: 2, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: '' },
  bo5: { label: 'Best of 5', setsToWin: 3, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: '' },
};

const INITIAL = {
  name: '',
  description: '',
  starts_on: '',
  ends_on: '',
  venue_name: '',
  city: '',
  level: 'local',
  format: 'round_robin',
  courts: 2,
  setsToWin: 2,
  setPoints: 25,
  decidingSetPoints: 15,
  winByTwo: true,
  pointCap: '',
  pools: 2,
  advance: 2,
  registration_open: true,
  division_name: 'Open',
};

function Section({ step, title, hint, children }) {
  return (
    <Card padding as="section" aria-labelledby={`step-${step}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-500 font-display text-base font-bold text-brand-950" aria-hidden="true">
          {step}
        </span>
        <div>
          <h2 id={`step-${step}`} className="font-display text-xl font-bold leading-none">
            {title}
          </h2>
          {hint ? <p className="mt-1 text-sm text-text-secondary">{hint}</p> : null}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export default function TournamentNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const applyPreset = (p) => setForm((f) => ({ ...f, setsToWin: p.setsToWin, setPoints: p.setPoints, decidingSetPoints: p.decidingSetPoints, winByTwo: p.winByTwo, pointCap: p.pointCap }));
  const activePreset = Object.keys(PRESETS).find((k) => {
    const p = PRESETS[k];
    return Number(form.setsToWin) === p.setsToWin && Number(form.setPoints) === p.setPoints && Number(form.decidingSetPoints) === p.decidingSetPoints && form.winByTwo === p.winByTwo && !form.pointCap;
  });
  const isPool = POOL_FORMATS.includes(form.format);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Give the tournament a name';
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) e.ends_on = 'End date is before the start date';
    if (Number(form.courts) < 0 || Number(form.courts) > 20) e.courts = 'Between 0 and 20 courts';
    if (Number(form.setsToWin) < 1 || Number(form.setsToWin) > 5) e.setsToWin = '1–5 sets';
    if (Number(form.setPoints) < 1) e.setPoints = 'At least 1 point';
    if (Number(form.decidingSetPoints) < 1) e.decidingSetPoints = 'At least 1 point';
    if (form.pointCap !== '' && Number(form.pointCap) < Number(form.setPoints)) e.pointCap = 'Cap must be ≥ set points';
    if (isPool && Number(form.pools) < 1) e.pools = 'At least 1 pool';
    if (isPool && Number(form.advance) < 1) e.advance = 'At least 1 team advances';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        starts_on: form.starts_on || undefined,
        ends_on: form.ends_on || form.starts_on || undefined,
        venue_name: form.venue_name.trim() || undefined,
        city: form.city.trim() || undefined,
        location: form.city.trim() || undefined,
        level: form.level,
        format: form.format,
        courts: Number(form.courts),
        setsToWin: Number(form.setsToWin),
        setPoints: Number(form.setPoints),
        decidingSetPoints: Number(form.decidingSetPoints),
        winByTwo: Boolean(form.winByTwo),
        pointCap: form.pointCap === '' ? null : Number(form.pointCap),
        pools: isPool ? Number(form.pools) : undefined,
        advance: isPool ? Number(form.advance) : undefined,
        registration_open: Boolean(form.registration_open),
        division_name: form.division_name.trim() || 'Open',
      };
      const t = await tournamentsApi.create(body);
      invalidate('tournaments');
      toast('Tournament created', { tone: 'success' });
      navigate(`/tournaments/${t.id}/manage`);
    } catch (err) {
      toast(errorMessage(err, 'Could not create tournament'), { tone: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Create tournament" subtitle="Set the format, courts and scoring rules. You can change all of this later from the manage page." back={{ to: '/tournaments?mine=1', label: 'My tournaments' }}>
      <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-5">
        <Section step={1} title="Basics">
          <Field label="Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="Summer Classic 2026" className="sm:col-span-2" />
          <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} className="sm:col-span-2" placeholder="Who it is for, entry fee, prizes…" />
          <Field label="Start date" type="date" value={form.starts_on} onChange={set('starts_on')} />
          <Field label="End date" type="date" value={form.ends_on} onChange={set('ends_on')} min={form.starts_on || undefined} error={errors.ends_on} hint="Leave blank for a one-day event." />
          <Field label="Venue" value={form.venue_name} onChange={set('venue_name')} placeholder="Riverside Sports Hall" />
          <Field label="City" value={form.city} onChange={set('city')} placeholder="Austin, TX" />
          <Field label="Level" as="select" value={form.level} onChange={set('level')}>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Field>
          <Field label="Courts" type="number" min={0} max={20} value={form.courts} onChange={set('courts')} error={errors.courts} hint="Named Court 1, Court 2… — rename them later." />
        </Section>

        <Section step={2} title="Format" hint="How the first division is played. Extra divisions can use a different format.">
          <fieldset className="sm:col-span-2">
            <legend className="sr-only">Tournament format</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([k, label]) => {
                const active = form.format === k;
                return (
                  <label key={k} className={`flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 transition-colors ${active ? 'border-accent-500 bg-accent-500/10 ring-1 ring-accent-500/40' : 'border-border-default bg-bg-surface hover:border-border-strong'}`}>
                    <input type="radio" name="format" value={k} checked={active} onChange={set('format')} className="mt-1 accent-accent-500" />
                    <span>
                      <span className="block font-display text-base font-bold uppercase tracking-wide text-text-primary">{label}</span>
                      <span className="block text-xs text-text-secondary">{FORMAT_HELP[k]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {isPool ? (
            <>
              <Field label="Number of pools" type="number" min={1} max={16} value={form.pools} onChange={set('pools')} error={errors.pools} />
              <Field label="Teams advancing per pool" type="number" min={1} max={8} value={form.advance} onChange={set('advance')} error={errors.advance} hint={form.format === 'pool_play' ? 'Used for final ranking across pools.' : 'These teams go into the knockout bracket.'} />
            </>
          ) : null}
        </Section>

        <Section step={3} title="Scoring rules" hint="Applied to every match unless a division overrides them.">
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2" role="group" aria-label="Scoring presets">
            {Object.entries(PRESETS).map(([k, p]) => (
              <Button key={k} type="button" variant={activePreset === k ? 'primary' : 'secondary'} aria-pressed={activePreset === k} onClick={() => applyPreset(p)}>
                {p.label}
              </Button>
            ))}
            <span className="text-xs text-text-muted">{activePreset ? `${PRESETS[activePreset].label}, sets to ${form.setPoints}, deciding set to ${form.decidingSetPoints}` : 'Custom rules'}</span>
          </div>
          <Field label="Sets to win" type="number" min={1} max={5} value={form.setsToWin} onChange={set('setsToWin')} error={errors.setsToWin} />
          <Field label="Points per set" type="number" min={1} max={99} value={form.setPoints} onChange={set('setPoints')} error={errors.setPoints} />
          <Field label="Deciding set points" type="number" min={1} max={99} value={form.decidingSetPoints} onChange={set('decidingSetPoints')} error={errors.decidingSetPoints} />
          <Field label="Point cap (optional)" type="number" min={0} max={199} value={form.pointCap} onChange={set('pointCap')} error={errors.pointCap} placeholder="none" hint="Set ends at this score even without a two-point lead." />
          <Checkbox className="sm:col-span-2" label="Must win by two points" checked={form.winByTwo} onChange={set('winByTwo')} />
        </Section>

        <Section step={4} title="Registration">
          <Field label="First division name" value={form.division_name} onChange={set('division_name')} hint='Teams register into this division, e.g. "Open", "Women A".' />
          <Checkbox className="self-end" label="Registration open" hint="Coaches can request a spot from the public page." checked={form.registration_open} onChange={set('registration_open')} />
        </Section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border-default bg-bg-page/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <Button type="button" variant="ghost" onClick={() => navigate('/tournaments?mine=1')}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? 'Creating…' : 'Create tournament'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
