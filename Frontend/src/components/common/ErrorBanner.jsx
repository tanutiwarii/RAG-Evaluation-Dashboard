export default function ErrorBanner({
  message
}) {
  if (!message) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4">
      {message}
    </div>
  );
}
