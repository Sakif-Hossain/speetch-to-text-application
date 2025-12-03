import { Mic } from "lucide-react";

type TranscriptionDisplayProps = {
  partialText?: string;
  finalText?: string;
  wordCount?: number;
  isRecording?: boolean;
};

export function TranscriptionDisplay({
  partialText,
  finalText,
  isRecording,
}: TranscriptionDisplayProps) {
  if (!partialText && !finalText && !isRecording) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Mic size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg">Click "Start Recording" to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {partialText && (
        <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-200">
          <p className="text-gray-700 italic">{partialText}</p>
        </div>
      )}
      {finalText && (
        <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {finalText}
          </p>
        </div>
      )}
    </div>
  );
}
