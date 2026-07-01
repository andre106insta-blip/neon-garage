export default function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div
        className="w-7 h-7 rounded-full animate-spin"
        style={{
          border: "2px solid rgba(255,255,255,0.08)",
          borderTopColor: "#c9a96e",
        }}
      />
      {label && <div className="text-sm text-ink-mute">{label}</div>}
    </div>
  );
}
