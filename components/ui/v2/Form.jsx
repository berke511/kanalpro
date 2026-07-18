'use client';

function Form({ children, className = '', onSubmit, ...props }) {
  return (
    <form onSubmit={onSubmit} className={'space-y-6 ' + className} {...props}>
      {children}
    </form>
  );
}
function FormSection({ children, title, className = '', ...props }) {
  return (
    <div className={'space-y-4 ' + className} {...props}>
      {title && <h3 className="text-sm font-medium text-gray-700">{title}</h3>}
      {children}
    </div>
  );
}
function FormRow({ children, className = '', ...props }) {
  return (
    <div className={'grid gap-4 sm:grid-cols-2 ' + className} {...props}>
      {children}
    </div>
  );
}
function FormActions({ children, className = '', ...props }) {
  return (
    <div className={'flex items-center justify-end gap-3 pt-4 ' + className} {...props}>
      {children}
    </div>
  );
}

Form.Section = FormSection;
Form.Row = FormRow;
Form.Actions = FormActions;

export default Form;
