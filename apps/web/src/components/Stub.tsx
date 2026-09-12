/** Shared placeholder for not-yet-implemented screens. Delete usages of
 * this as each screen gets a real implementation. */
export default function Stub({ name, agent }: { name: string; agent: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-lg font-medium text-ink">{name}</p>
      <p className="text-sm text-muted">stub — implemented by {agent}</p>
    </div>
  );
}
