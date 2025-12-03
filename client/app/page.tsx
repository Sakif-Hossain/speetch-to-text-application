"use client";

import Image from "next/image";
import { useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { TranscriptionDisplay } from "./components/TranscriptionDisplay";
import { SessionList } from "./components/SessionList";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useSessions } from "./hooks/useSessions";

interface SessionDetail {
  session: {
    id: string;
    created_at: string;
    ended_at: string | null;
    status: string;
    metrics: {
      total_duration_seconds: number | null;
      word_count: number | null;
      audio_duration_seconds: number | null;
      processing_time_ms: number | null;
    };
  };
  transcript: {
    full_text: string;
    segments: Array<{
      text: string;
      timestamp_start: number | null;
      timestamp_end: number | null;
    }>;
  };
}

export default function TranscriptionApp() {
  const backendUrl = "http://localhost:8000";
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null
  );
  const [viewLoading, setViewLoading] = useState(false);

  const {
    isRecording,
    partialText,
    finalText,
    wordCount,
    error,
    startRecording,
    stopRecording,
  } = useAudioRecorder(backendUrl);

  const { sessions, fetchSessions, deleteSession } = useSessions(backendUrl);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      // Refresh sessions shortly after stopping to show the new transcript
      setTimeout(() => {
        fetchSessions();
      }, 800);
    } else {
      startRecording();
      setSelectedSession(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    fetchSessions();
  };

  const handleView = async (id: string) => {
    try {
      setViewLoading(true);
      const response = await fetch(`${backendUrl}/api/sessions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }
      const data = await response.json();
      setSelectedSession(data);
    } catch (err) {
      console.error("Error fetching session:", err);
    } finally {
      setViewLoading(false);
    }
  };

  const closeSessionView = () => {
    setSelectedSession(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-300 to-cyan-300 p-8 text-white">
            <div className="flex items-center justify-center gap-5">
              <Image
                src="/textify.png"
                width={70}
                height={70}
                alt="Textify logo"
                className="rounded-full shadow-lg border-2 border-black"
              />
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Textify</h1>
                <p className="text-shadow-white mt-1">Turn speech into text</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && <div className="text-red-500 mb-6">{error}</div>}

            {/* Controls */}
            <div className="flex justify-center mb-8">
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-3 px-8 py-4 rounded-full text-white ${
                  isRecording ? "bg-red-500" : "bg-blue-600"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff /> Stop
                  </>
                ) : (
                  <>
                    <Mic /> Start
                  </>
                )}
              </button>
            </div>

            {/* Display Components */}
            <TranscriptionDisplay
              partialText={partialText}
              finalText={finalText}
              isRecording={isRecording}
            />

            <SessionList
              sessions={sessions}
              onDelete={handleDelete}
              onView={handleView}
            />

            {selectedSession && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                      Session Details
                    </h2>
                    <button
                      onClick={closeSessionView}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <X size={20} className="text-black" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-700 text-lg">
                            Created:
                          </span>
                          <p className="font-medium text-black">
                            {new Date(
                              selectedSession.session.created_at
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-700 text-lg">Ended:</span>
                          <p className="font-medium text-black">
                            {selectedSession.session.ended_at
                              ? new Date(
                                  selectedSession.session.ended_at
                                ).toLocaleString()
                              : "In progress"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-700 text-lg">Status:</span>
                          <p className="font-medium text-black">
                            {selectedSession.session.status}
                          </p>
                        </div>
                        {selectedSession.session.metrics.word_count && (
                          <div>
                            <span className="text-gray-700 text-lg">
                              Word Count:
                            </span>
                            <p className="font-medium text-black">
                              {selectedSession.session.metrics.word_count}
                            </p>
                          </div>
                        )}
                        {selectedSession.session.metrics
                          .audio_duration_seconds && (
                          <div>
                            <span className="text-gray-700 text-lg">
                              Duration:
                            </span>
                            <p className="font-medium text-black">
                              {Number(
                                selectedSession.session.metrics
                                  .audio_duration_seconds
                              ).toFixed(1)}
                              s
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-6">
                        <h3 className="text-gray-500 text-sm mb-2">
                          Transcript:
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {selectedSession.transcript.full_text ||
                              "No transcript available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewLoading && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6">
                  <p className="text-gray-600">Loading session...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
