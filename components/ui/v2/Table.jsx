'use client';

// ─── Table ────────────────────────────────────────────────────────────────────
function Table({ children, className = '', striped = false, ...props }) {
  return (
    <div className={'w-full overflow-x-auto rounded-xl border border-gray-200 scrollbar-thin ' + className}>
      <table
        className={'w-full border-collapse text-sm' + (striped ? ' table-striped' : '')}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

// ─── Table.Head ──────────────────────────────────────────────────────────────
function TableHead({ children, className = '', ...props }) {
  return (
    <thead
      className={'border-b border-gray-200 bg-gray-50/80 ' + className}
      {...props}
    >
      {children}
    </thead>
  );
}

// ─── Table.Body ──────────────────────────────────────────────────────────────
function TableBody({ children, className = '', ...props }) {
  return (
    <tbody
      className={'divide-y divide-gray-100 bg-white ' + className}
      {...props}
    >
      {children}
    </tbody>
  );
}

// ─── Table.Row ───────────────────────────────────────────────────────────────
function TableRow({ children, className = '', onClick, ...props }) {
  var cursor = onClick
    ? ' cursor-pointer hover:bg-primary-50/40 active:bg-primary-50'
    : ' hover:bg-gray-50/70';
  return (
    <tr
      className={'transition-colors duration-100 ' + cursor + (className ? ' ' + className : '')}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  );
}

// ─── Table.HeaderCell ────────────────────────────────────────────────────────
function TableHeaderCell({ children, className = '', ...props }) {
  return (
    <th
      className={'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap ' + className}
      {...props}
    >
      {children}
    </th>
  );
}

// ─── Table.Cell ──────────────────────────────────────────────────────────────
function TableCell({ children, className = '', colSpan, ...props }) {
  return (
    <td
      className={'px-4 py-3.5 text-gray-700 ' + className}
      colSpan={colSpan}
      {...props}
    >
      {children}
    </td>
  );
}

Table.Head       = TableHead;
Table.Body       = TableBody;
Table.Row        = TableRow;
Table.Cell       = TableCell;
Table.HeaderCell = TableHeaderCell;

export default Table;
