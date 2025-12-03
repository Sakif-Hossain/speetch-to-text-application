import { Trash2 } from "lucide-react";

export function SessionList({
  sessions,
  onDelete,
  onView,
}: {
  sessions: { id: string; [key: string]: any }[];
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Previous Sessions
      </h2>
      <div className="space-y-3">
        {sessions.map((session: any) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 w-full">
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {new Date(session.created_at).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  Status: {session.status}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800 overflow-hidden text-ellipsis wrap-break-words max-h-12">
                  {session.preview || "No preview available"}
                </p>
                <div className="mt-2 text-xs text-gray-500 flex gap-4">
                  <span>
                    Words:{" "}
                    {session.metrics?.word_count != null
                      ? session.metrics.word_count
                      : "-"}
                  </span>
                  {session.metrics?.audio_duration_seconds != null && (
                    <span>
                      Duration:{" "}
                      {Number(session.metrics.audio_duration_seconds).toFixed(
                        1
                      )}
                      s
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="text-black transition hover:opacity-70"
                onClick={() => onView(session.id)}
              >
                View
              </button>
              <button
                className="text-black transition hover:opacity-70"
                onClick={() => onDelete(session.id)}
              >
                <Trash2 size={20} className="text-black" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
