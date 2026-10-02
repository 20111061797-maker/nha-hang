export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return <div className="state-panel"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function ErrorState({ message = "Unable to load this view.", onRetry }: { message?: string; onRetry?: () => void }) {
  return <div className="state-panel error-state"><strong>Something went wrong</strong><span>{message}</span>{onRetry ? <button className="text-button" onClick={onRetry}>Try again</button> : null}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="state-panel"><strong>{title}</strong><span>{detail}</span></div>;
}