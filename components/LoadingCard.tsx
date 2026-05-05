export function LoadingCard({ label = "Loading" }: { label?: string }) {
  return (
    <div className="card loadingCard" role="status" aria-live="polite">
      <span className="loadingSpinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
