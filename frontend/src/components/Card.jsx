export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-border-default bg-bg-card shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
