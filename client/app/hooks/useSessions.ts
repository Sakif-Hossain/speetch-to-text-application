"use client";
import { useState, useEffect, useCallback } from "react";

interface Session {
  id: string;
  created_at: string;
  ended_at?: string | null;
  status: string;
  metrics: {
    total_duration_seconds?: number | null;
    word_count: number | null;
    audio_duration_seconds?: number | null;
    processing_time_ms?: number | null;
  };
  preview?: string | null;
}

export function useSessions(backendUrl: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/sessions`);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      // API returns { sessions: [...], pagination: {...} }
      setSessions(data.sessions || []);
    } catch (err) {
      setError("Failed to load sessions");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`${backendUrl}/api/sessions/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete session");
        }
        setSessions((prev) => prev.filter((session) => session.id !== id));
      } catch (err) {
        setError("Failed to delete session");
        console.error(err);
      }
    },
    [backendUrl]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    deleteSession,
  };
}
