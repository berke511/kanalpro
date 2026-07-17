'use client';

function Card({ children, className, ...props }) {
  return <div className={'rounded-xl border border-gray-100 bg-white shadow-sm ' + (className || '')} {...props}>{children}</div>;
}
function CardHeader({ children, className, ...props }) {
  return <div className={'flex flex-col gap-1 p-6 pb-0 ' + (className || '')} {...props}>{children}</div>;
}
function CardTitle({ children, className, ...props }) {
  return <h3 className={'text-base font-semibold leading-tight ' + (className || '')} {...props}>{children}</h3>;
}
function CardDescription({ children, className, ...props }) {
  return <p className={'text-sm text-gray-500 ' + (className || '')} {...props}>{children}</p>;
}
function CardContent({ children, className, ...props }) {
  return <div className={'p-6 ' + (className || '')} {...props}>{children}</div>;
}
function CardFooter({ children, className, ...props }) {
  return <div className={'flex items-center p-6 pt-0 ' + (className || '')} {...props}>{children}</div>;
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
