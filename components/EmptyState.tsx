export function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-600 gap-2">
      <p className="text-sm">{message}</p>
    </div>
  );
}
