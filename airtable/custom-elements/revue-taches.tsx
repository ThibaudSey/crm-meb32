import React, {useMemo, useState} from 'react';
import {
    initializeBlock,
    useBase,
    useRecords,
    useCustomProperties,
    expandRecord,
} from '@airtable/blocks/interface/ui';
import {type Base, type Field, type Record as AtRecord, FieldType} from '@airtable/blocks/interface/models';

const NAVY = '#1A3A52';
const ORANGE = '#D97706';

function byName(base: Base, name: string, type?: FieldType): Field | undefined {
    const f = base.tables[0].getFieldIfExists(name);
    if (!f) return undefined;
    if (type && f.type !== type) return undefined;
    return f;
}

function getCustomProperties(base: Base) {
    const table = base.tables[0];
    const isCheckbox = (f: {config: {type: FieldType}}) => f.config.type === FieldType.CHECKBOX;
    const isText = (f: {config: {type: FieldType}}) =>
        f.config.type === FieldType.MULTILINE_TEXT || f.config.type === FieldType.SINGLE_LINE_TEXT;
    return [
        {key: 'doneField', label: 'Fait', type: 'field' as const, table, shouldFieldBeAllowed: isCheckbox, defaultValue: byName(base, 'Fait', FieldType.CHECKBOX)},
        {key: 'urgentField', label: 'Urgent', type: 'field' as const, table, shouldFieldBeAllowed: isCheckbox, defaultValue: byName(base, 'Urgent', FieldType.CHECKBOX)},
        {key: 'halfDayField', label: 'Demi-journée', type: 'field' as const, table, shouldFieldBeAllowed: isCheckbox, defaultValue: byName(base, 'Demi-journée', FieldType.CHECKBOX)},
        {key: 'commentField', label: 'Commentaire', type: 'field' as const, table, shouldFieldBeAllowed: isText, defaultValue: byName(base, 'Commentaire')},
        {key: 'dueField', label: 'Échéance', type: 'field' as const, table, defaultValue: byName(base, 'Échéance')},
        {key: 'dealField', label: 'Affaire', type: 'field' as const, table, defaultValue: byName(base, 'Affaire')},
        {key: 'ownerField', label: 'Responsable', type: 'field' as const, table, defaultValue: byName(base, 'Responsable')},
        {key: 'stateField', label: 'État', type: 'field' as const, table, defaultValue: byName(base, 'État')},
    ];
}

type Draft = {done: boolean; urgent: boolean; halfDay: boolean; comment: string};

function formatDue(value: string): {label: string; overdue: boolean; today: boolean} {
    if (!value) return {label: 'Sans échéance', overdue: false, today: false};
    const d = new Date(value);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return {
        label: d.toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'}),
        overdue: t < startToday,
        today: t === startToday,
    };
}

function Toggle({label, checked, onChange, tone}: {label: string; checked: boolean; onChange: (v: boolean) => void; tone: 'done' | 'urgent' | 'half'}) {
    const on =
        tone === 'done'
            ? 'bg-green-greenDark1 text-white border-green-greenDark1'
            : tone === 'urgent'
              ? 'bg-red-redDark1 text-white border-red-redDark1'
              : 'text-white border-transparent';
    return (
        <button
            type="button"
            aria-pressed={checked}
            onClick={() => onChange(!checked)}
            className={`min-h-[44px] px-3 rounded-md border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                checked ? on : 'bg-white text-gray-gray700 border-gray-gray200 hover:bg-gray-gray50 dark:bg-gray-gray800 dark:text-white dark:border-gray-gray600'
            }`}
            style={checked && tone === 'half' ? {backgroundColor: ORANGE} : undefined}
        >
            {checked ? '✓ ' : ''}
            {label}
        </button>
    );
}

function App(): React.ReactElement {
    const base = useBase();
    const table = base.tables[0];
    const records = useRecords(table);
    const {customPropertyValueByKey} = useCustomProperties(getCustomProperties);
    const doneField = customPropertyValueByKey.doneField as Field | undefined;
    const urgentField = customPropertyValueByKey.urgentField as Field | undefined;
    const halfDayField = customPropertyValueByKey.halfDayField as Field | undefined;
    const commentField = customPropertyValueByKey.commentField as Field | undefined;
    const dueField = customPropertyValueByKey.dueField as Field | undefined;
    const dealField = customPropertyValueByKey.dealField as Field | undefined;
    const ownerField = customPropertyValueByKey.ownerField as Field | undefined;
    const stateField = customPropertyValueByKey.stateField as Field | undefined;

    const [drafts, setDrafts] = useState<{[id: string]: Draft}>({});
    const [openComment, setOpenComment] = useState<{[id: string]: boolean}>({});
    const [owner, setOwner] = useState<string>('Thibaud');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{kind: 'ok' | 'error'; text: string} | null>(null);

    const original = (r: AtRecord): Draft => ({
        done: !!(doneField && r.getCellValue(doneField)),
        urgent: !!(urgentField && r.getCellValue(urgentField)),
        halfDay: !!(halfDayField && r.getCellValue(halfDayField)),
        comment: commentField ? r.getCellValueAsString(commentField) : '',
    });
    const current = (r: AtRecord): Draft => drafts[r.id] ?? original(r);
    const isChanged = (r: AtRecord) => {
        const d = drafts[r.id];
        if (!d) return false;
        const o = original(r);
        return d.done !== o.done || d.urgent !== o.urgent || d.halfDay !== o.halfDay || d.comment !== o.comment;
    };
    const update = (r: AtRecord, patch: Partial<Draft>) => {
        setMessage(null);
        setDrafts((prev) => ({...prev, [r.id]: {...(prev[r.id] ?? original(r)), ...patch}}));
    };

    const owners = useMemo(() => {
        const s = new Set<string>();
        if (ownerField) records.forEach((r) => { const v = r.getCellValueAsString(ownerField); if (v) s.add(v); });
        return ['Tous', ...Array.from(s).sort()];
    }, [records, ownerField]);

    const visible = records.filter((r) => {
        if (doneField && r.getCellValue(doneField) && !drafts[r.id]) return false;
        if (owner !== 'Tous' && ownerField && r.getCellValueAsString(ownerField) !== owner) return false;
        return true;
    });
    const isFocus = (r: AtRecord) => {
        const c = current(r);
        const due = formatDue(dueField ? String(r.getCellValue(dueField) ?? '') : '');
        return c.urgent || c.halfDay || due.overdue || due.today;
    };
    const focus = visible.filter(isFocus);
    const others = visible.filter((r) => !isFocus(r));
    const changed = records.filter(isChanged);

    const missing = [
        !doneField && 'Fait', !urgentField && 'Urgent', !halfDayField && 'Demi-journée', !commentField && 'Commentaire',
    ].filter(Boolean) as string[];
    if (missing.length) {
        return (
            <div className="p-6 text-base text-gray-gray700 dark:text-white">
                Choisir dans le panneau des propriétés les champs : {missing.join(', ')}.
            </div>
        );
    }

    const canEdit = table.hasPermissionToUpdateRecords();

    const save = async () => {
        if (!changed.length) return;
        setSaving(true);
        setMessage(null);
        try {
            const updates = changed.map((r) => {
                const d = current(r);
                const fields: {[k: string]: unknown} = {
                    [doneField!.id]: d.done,
                    [urgentField!.id]: d.urgent,
                    [halfDayField!.id]: d.halfDay,
                    [commentField!.id]: d.comment,
                };
                if (stateField && stateField.type === FieldType.SINGLE_SELECT && d.done && !original(r).done) {
                    fields[stateField.id] = {name: 'Fait'};
                }
                return {id: r.id, fields};
            });
            for (let i = 0; i < updates.length; i += 50) {
                await table.updateRecordsAsync(updates.slice(i, i + 50) as never);
            }
            setDrafts({});
            setMessage({kind: 'ok', text: `${updates.length} tâche${updates.length > 1 ? 's' : ''} enregistrée${updates.length > 1 ? 's' : ''}`});
        } catch (e) {
            setMessage({kind: 'error', text: `Enregistrement impossible : ${(e as Error).message}. Vos choix sont conservés, réessayez.`});
        } finally {
            setSaving(false);
        }
    };

    const row = (r: AtRecord) => {
        const c = current(r);
        const dueRaw = dueField ? String(r.getCellValue(dueField) ?? '') : '';
        const due = formatDue(dueRaw);
        const deal = dealField ? r.getCellValueAsString(dealField) : '';
        const own = ownerField ? r.getCellValueAsString(ownerField) : '';
        return (
            <li key={r.id} className={`py-3 border-b border-gray-gray100 dark:border-gray-gray700 ${isChanged(r) ? 'bg-yellow-yellowLight3 dark:bg-gray-gray800' : ''}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => expandRecord(r)}
                            className={`text-left text-base font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 rounded-sm ${c.done ? 'line-through text-gray-gray500' : 'text-black dark:text-white'}`}
                        >
                            {r.name || 'Tâche sans intitulé'}
                        </button>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-gray600 dark:text-gray-gray300">
                            <span className={due.overdue ? 'font-semibold text-red-redDark1' : due.today ? 'font-semibold' : ''} style={due.today && !due.overdue ? {color: ORANGE} : undefined}>
                                {due.overdue ? 'En retard · ' : due.today ? "Aujourd'hui · " : ''}
                                {due.label}
                            </span>
                            {own && <span>{own}</span>}
                            {deal && <span className="truncate max-w-full" title={deal}>{deal}</span>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Toggle label="Fait" tone="done" checked={c.done} onChange={(v) => update(r, {done: v})} />
                        <Toggle label="Urgent" tone="urgent" checked={c.urgent} onChange={(v) => update(r, {urgent: v})} />
                        <Toggle label="Demi-journée" tone="half" checked={c.halfDay} onChange={(v) => update(r, {halfDay: v})} />
                        <button
                            type="button"
                            onClick={() => setOpenComment((p) => ({...p, [r.id]: !p[r.id]}))}
                            aria-expanded={!!openComment[r.id]}
                            className="min-h-[44px] px-3 rounded-md border border-gray-gray200 bg-white text-sm text-gray-gray700 hover:bg-gray-gray50 focus-visible:outline-none focus-visible:ring-2 dark:bg-gray-gray800 dark:text-white dark:border-gray-gray600"
                        >
                            {c.comment ? 'Commentaire ✎' : 'Commenter'}
                        </button>
                    </div>
                </div>
                {openComment[r.id] && (
                    <label className="mt-2 block">
                        <span className="sr-only">Commentaire pour {r.name}</span>
                        <textarea
                            value={c.comment}
                            onChange={(e) => update(r, {comment: e.target.value})}
                            rows={2}
                            className="w-full rounded-md border border-gray-gray200 p-2 text-base dark:bg-gray-gray800 dark:text-white dark:border-gray-gray600 focus-visible:outline-none focus-visible:ring-2"
                        />
                    </label>
                )}
            </li>
        );
    };

    return (
        <div className="flex h-full w-full flex-col bg-white dark:bg-gray-gray900">
            <header className="px-4 pt-4 pb-3 text-white" style={{backgroundColor: NAVY}}>
                <h1 className="font-display text-xl font-semibold">Revue des tâches</h1>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Responsable">
                    {owners.map((o) => (
                        <button
                            key={o}
                            type="button"
                            aria-pressed={owner === o}
                            onClick={() => setOwner(o)}
                            className={`min-h-[44px] px-3 rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${owner === o ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {o}
                        </button>
                    ))}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto px-4 pb-28" tabIndex={0}>
                <section className="mt-4">
                    <h2 className="text-lg font-semibold text-black dark:text-white">À traiter en priorité <span className="text-gray-gray500 font-normal tabular-nums">{focus.length}</span></h2>
                    {focus.length ? <ul>{focus.map(row)}</ul> : <p className="py-3 text-sm text-gray-gray600">Aucune tâche urgente, en retard ou prévue pour la demi-journée.</p>}
                </section>
                <section className="mt-8">
                    <h2 className="text-lg font-semibold text-black dark:text-white">Autres tâches ouvertes <span className="text-gray-gray500 font-normal tabular-nums">{others.length}</span></h2>
                    {others.length ? <ul>{others.map(row)}</ul> : <p className="py-3 text-sm text-gray-gray600">Aucune autre tâche ouverte.</p>}
                </section>
            </main>
            <footer className="fixed bottom-0 left-0 right-0 flex flex-col gap-2 border-t border-gray-gray200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-gray900 dark:border-gray-gray700">
                <p className="text-sm text-gray-gray700 dark:text-gray-gray300" role="status">
                    {message ? (
                        <span className={message.kind === 'error' ? 'text-red-redDark1' : 'text-green-greenDark1'}>{message.text}</span>
                    ) : changed.length ? (
                        `${changed.length} modification${changed.length > 1 ? 's' : ''} non enregistrée${changed.length > 1 ? 's' : ''}`
                    ) : (
                        'Aucune modification en attente'
                    )}
                </p>
                <div className="flex gap-2">
                    {changed.length > 0 && (
                        <button type="button" onClick={() => { setDrafts({}); setMessage(null); }} className="min-h-[44px] px-3 rounded-md border border-gray-gray200 text-sm hover:bg-gray-gray50 focus-visible:outline-none focus-visible:ring-2 dark:text-white">
                            Annuler mes choix
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!changed.length || saving || !canEdit}
                        onClick={save}
                        className="min-h-[44px] px-4 rounded-md text-sm font-semibold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={{backgroundColor: ORANGE}}
                    >
                        {saving ? 'Enregistrement…' : 'Valider mes réponses'}
                    </button>
                </div>
            </footer>
        </div>
    );
}

initializeBlock({interface: () => <App />});
