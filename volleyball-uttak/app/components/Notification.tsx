interface NotificationProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  isVisible: boolean;
  onClose?: () => void;
}

export default function Notification({
  message,
  type,
  isVisible,
  onClose,
}: NotificationProps) {
  if (!isVisible) return null;

  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-yellow-500 text-white",
  };

  const icon = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 ${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in z-50`}>
      <span className="text-lg">{icon[type]}</span>
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 hover:bg-white/20 rounded p-1 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
