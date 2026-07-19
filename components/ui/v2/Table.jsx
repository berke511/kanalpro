'use client';

function Table({ children, className = '', ...props }) {
  return (
    <div className={'w-full overflow-x-auto rounded-xl border border-gray-100 shadow-sm ' + className}>
      <table className="w-full border-collapse text-sm" {...props}>{children}</table>
    </div>
  );
}
function TableHead({ children, className = '', ...props }) {
  return <thead className={'bg-gray-50 ' + className} {...props}>{children}</thead>;
}
function TableBody({ children, className = '', ...props }) {
  return <tbody className={'divide-y divide-gray-100 ' + className} {...props}>{children}</tbody>;
}
function TableRow({ children, className = '', ...props }) {
  return <tr className={'transition-colors duration-150 hover:bg-gray-50 ' + className} {...props}>{children}</tr>;
}
function TableHeaderCell({ children, className = '', ...props }) {
  return <th className={'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ' + className} {...props}>{children}</th>;
}
function TableCell({ children, className = '', ...props }) {
  return <td className={'px-4 py-3 text-gray-700 ' + className} {...props}>{children}</td>;
}

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Cell = TableCell;
Table.HeaderCell = TableHeaderCell;

export default Table;
