export function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-500 gap-2">
      <span className="text-3xl">📊</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
