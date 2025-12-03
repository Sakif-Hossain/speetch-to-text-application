import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TranscriptionApp from "@/app/page";

// Mock the custom hooks
jest.mock("@/app/hooks/useAudioRecorder", () => ({
  useAudioRecorder: jest.fn(),
}));

jest.mock("@/app/hooks/useSessions", () => ({
  useSessions: jest.fn(),
}));

import { useAudioRecorder } from "@/app/hooks/useAudioRecorder";
import { useSessions } from "@/app/hooks/useSessions";

const mockUseAudioRecorder = useAudioRecorder as jest.Mock;
const mockUseSessions = useSessions as jest.Mock;

// Mock fetch for session details
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("TranscriptionApp", () => {
  const mockStartRecording = jest.fn();
  const mockStopRecording = jest.fn();
  const mockFetchSessions = jest.fn();
  const mockDeleteSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseAudioRecorder.mockReturnValue({
      isRecording: false,
      partialText: "",
      finalText: "",
      wordCount: 0,
      error: "",
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
    });

    mockUseSessions.mockReturnValue({
      sessions: [],
      fetchSessions: mockFetchSessions,
      deleteSession: mockDeleteSession,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("header and basic layout", () => {
    it("should render the app title", () => {
      render(<TranscriptionApp />);

      expect(screen.getByText("Live Transcription")).toBeInTheDocument();
    });

    it("should render the start recording button initially", () => {
      render(<TranscriptionApp />);

      expect(
        screen.getByRole("button", { name: /start/i })
      ).toBeInTheDocument();
    });
  });

  describe("recording toggle", () => {
    it("should call startRecording when clicking start button", () => {
      render(<TranscriptionApp />);

      const startButton = screen.getByRole("button", { name: /start/i });
      fireEvent.click(startButton);

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it("should show stop button when recording", () => {
      mockUseAudioRecorder.mockReturnValue({
        isRecording: true,
        partialText: "",
        finalText: "",
        wordCount: 0,
        error: "",
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
      });

      render(<TranscriptionApp />);

      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    });

    it("should call stopRecording and fetchSessions when clicking stop button", () => {
      mockUseAudioRecorder.mockReturnValue({
        isRecording: true,
        partialText: "",
        finalText: "",
        wordCount: 0,
        error: "",
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
      });

      render(<TranscriptionApp />);

      const stopButton = screen.getByRole("button", { name: /stop/i });
      fireEvent.click(stopButton);

      expect(mockStopRecording).toHaveBeenCalled();

      // Fast-forward past the setTimeout
      jest.advanceTimersByTime(1000);

      expect(mockFetchSessions).toHaveBeenCalled();
    });
  });

  describe("error display", () => {
    it("should display error message when there is an error", () => {
      mockUseAudioRecorder.mockReturnValue({
        isRecording: false,
        partialText: "",
        finalText: "",
        wordCount: 0,
        error: "Microphone access denied",
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
      });

      render(<TranscriptionApp />);

      expect(screen.getByText("Microphone access denied")).toBeInTheDocument();
    });

    it("should not display error when there is no error", () => {
      render(<TranscriptionApp />);

      const errorElements = screen.queryAllByText(/error/i);
      expect(errorElements.length).toBe(0);
    });
  });

  describe("transcription display", () => {
    it("should pass transcription data to TranscriptionDisplay", () => {
      mockUseAudioRecorder.mockReturnValue({
        isRecording: true,
        partialText: "Currently speaking...",
        finalText: "Previous text",
        wordCount: 5,
        error: "",
        startRecording: mockStartRecording,
        stopRecording: mockStopRecording,
      });

      render(<TranscriptionApp />);

      expect(screen.getByText("Currently speaking...")).toBeInTheDocument();
      expect(screen.getByText("Previous text")).toBeInTheDocument();
    });
  });

  describe("session list", () => {
    it("should render sessions from useSessions hook", () => {
      mockUseSessions.mockReturnValue({
        sessions: [
          {
            id: "test-session-1",
            created_at: "2025-12-01T10:00:00Z",
            status: "completed",
            preview: "Test preview",
            metrics: { word_count: 10, audio_duration_seconds: 5 },
          },
        ],
        fetchSessions: mockFetchSessions,
        deleteSession: mockDeleteSession,
      });

      render(<TranscriptionApp />);

      expect(screen.getByText("Previous Sessions")).toBeInTheDocument();
      expect(screen.getByText("Test preview")).toBeInTheDocument();
    });

    it("should call deleteSession when delete is clicked", () => {
      mockUseSessions.mockReturnValue({
        sessions: [
          {
            id: "test-session-1",
            created_at: "2025-12-01T10:00:00Z",
            status: "completed",
            preview: "Test preview",
            metrics: { word_count: 10, audio_duration_seconds: 5 },
          },
        ],
        fetchSessions: mockFetchSessions,
        deleteSession: mockDeleteSession,
      });

      render(<TranscriptionApp />);

      const deleteButton = screen.getByRole("button", {
        name: "", // Trash icon button has no text
      });
      fireEvent.click(deleteButton);

      expect(mockDeleteSession).toHaveBeenCalledWith("test-session-1");
    });
  });

  describe("session detail modal", () => {
    beforeEach(() => {
      mockUseSessions.mockReturnValue({
        sessions: [
          {
            id: "test-session-1",
            created_at: "2025-12-01T10:00:00Z",
            status: "completed",
            preview: "Test preview",
            metrics: { word_count: 10, audio_duration_seconds: 5 },
          },
        ],
        fetchSessions: mockFetchSessions,
        deleteSession: mockDeleteSession,
      });
    });

    it("should fetch and display session details when View is clicked", async () => {
      jest.useRealTimers();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              id: "test-session-1",
              created_at: "2025-12-01T10:00:00Z",
              ended_at: "2025-12-01T10:05:00Z",
              status: "completed",
              metrics: {
                word_count: 100,
                audio_duration_seconds: 60,
              },
            },
            transcript: {
              full_text: "This is the full transcript text.",
              segments: [],
            },
          }),
      });

      render(<TranscriptionApp />);

      const viewButton = screen.getByText("View");
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText("Session Details")).toBeInTheDocument();
      });

      expect(
        screen.getByText("This is the full transcript text.")
      ).toBeInTheDocument();
    });

    it("should close modal when X button is clicked", async () => {
      jest.useRealTimers();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              id: "test-session-1",
              created_at: "2025-12-01T10:00:00Z",
              ended_at: null,
              status: "completed",
              metrics: { word_count: 10 },
            },
            transcript: { full_text: "Test", segments: [] },
          }),
      });

      render(<TranscriptionApp />);

      const viewButton = screen.getByText("View");
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText("Session Details")).toBeInTheDocument();
      });

      // Find and click the close button (X)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector("svg.lucide-x")
      );

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("Session Details")).not.toBeInTheDocument();
      });
    });

    it("should show loading state while fetching session", async () => {
      jest.useRealTimers();

      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => fetchPromise,
      });

      render(<TranscriptionApp />);

      const viewButton = screen.getByText("View");
      fireEvent.click(viewButton);

      expect(screen.getByText("Loading session...")).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        session: {
          id: "test-session-1",
          created_at: "2025-12-01T10:00:00Z",
          ended_at: null,
          status: "completed",
          metrics: {},
        },
        transcript: { full_text: "", segments: [] },
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Loading session...")
        ).not.toBeInTheDocument();
      });
    });
  });
});
