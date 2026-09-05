/**
 * Table primitives. All data tables share the same header, row, numeric-cell
 * and sticky-first-column treatment; the wrapper provides controlled
 * horizontal scrolling so nothing is clipped on phones.
 *
 *   <TableWrap>
 *     <Table caption="Pool A standings">
 *       <thead><tr><Th sticky>Team</Th><Th num>W</Th></tr></thead>
 *       <tbody><tr><Td sticky>Aces</Td><Td num>3</Td></tr></tbody>
 *     </Table>
 *   </TableWrap>
 */
export function TableWrap({ className = '', label = 'Scrollable table', children, ...props }) {
  return (
    <div className={`table-wrap ${className}`} tabIndex={0} role="region" aria-label={label} {...props}>
      {children}
    </div>
  );
}

export function Table({ caption, minWidth, className = '', children, ...props }) {
  return (
    <table className={`table ${className}`} style={minWidth ? { minWidth } : undefined} {...props}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  );
}

export function Th({ num = false, sticky = false, className = '', children, ...props }) {
  return (
    <th scope="col" className={`${num ? 'cell-num' : ''} ${sticky ? 'sticky-col' : ''} ${className}`} {...props}>
      {children}
    </th>
  );
}

export function Td({ num = false, sticky = false, strong = false, muted = false, className = '', children, ...props }) {
  return (
    <td className={`${num ? 'cell-num' : ''} ${sticky ? 'sticky-col' : ''} ${strong ? 'font-bold text-text-primary' : ''} ${muted ? 'text-text-secondary' : ''} ${className}`} {...props}>
      {children}
    </td>
  );
}

/** Column header that sorts. `dir` is 'asc' | 'desc' | null. */
export function SortableTh({ label, active, dir, onSort, num = false, sticky = false, title }) {
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <Th num={num} sticky={sticky} aria-sort={ariaSort} className="!p-0">
      <button
        type="button"
        onClick={onSort}
        title={title}
        className={`flex min-h-11 w-full items-center gap-1 px-3 font-display text-xs font-bold uppercase tracking-wider hover:text-text-primary ${num ? 'justify-end' : ''} ${active ? 'text-accent-400' : ''}`}
      >
        {label}
        <span aria-hidden="true" className={`text-[10px] ${active ? 'opacity-100' : 'opacity-0'}`}>
          {dir === 'asc' ? '▲' : '▼'}
        </span>
      </button>
    </Th>
  );
}
