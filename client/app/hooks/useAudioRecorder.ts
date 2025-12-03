"use client";
import { useState, useRef, useCallback } from "react";

// Convert Float32Array to WAV format (same as testClient.html)
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function countWords(text: string) {
  // Collapse whitespace and split; filter out empties
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function useAudioRecorder(backendUrl: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const bufferLengthRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      setPartialText("");
      setFinalText("");
      setWordCount(0);

      // Connect to WebSocket
      const wsUrl = backendUrl.replace("http", "ws") + "/ws/transcribe";
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = async () => {
        try {
          // Get microphone access with 16kHz sample rate
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
            },
          });
          streamRef.current = stream;

          // Create audio context at 16kHz
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          sourceRef.current = source;

          const processor = audioContext.createScriptProcessor(16384, 1, 1);
          processorRef.current = processor;

          audioBufferRef.current = [];
          bufferLengthRef.current = 0;
          const targetBufferSize = 16000 * 5; // 5 seconds at 16kHz

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            audioBufferRef.current.push(new Float32Array(inputData));
            bufferLengthRef.current += inputData.length;

            // Send every 5 seconds of audio
            if (bufferLengthRef.current >= targetBufferSize) {
              const combined = new Float32Array(bufferLengthRef.current);
              let offset = 0;
              for (const chunk of audioBufferRef.current) {
                combined.set(chunk, offset);
                offset += chunk.length;
              }

              const wavData = encodeWAV(combined, 16000);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(wavData);
              }

              // Reset buffer
              audioBufferRef.current = [];
              bufferLengthRef.current = 0;
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          setIsRecording(true);
        } catch (err) {
          setError("Failed to access microphone");
          console.error(err);
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "session_created") {
            setCurrentSessionId(data.session_id);
          } else if (data.type === "transcript") {
            // Append transcript text
            setFinalText((prev) => (prev ? prev + " " + data.text : data.text));
            setPartialText("");
          } else if (data.type === "error") {
            setError(data.message);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        setIsRecording(false);
      };
    } catch (err) {
      setError("Failed to start recording");
      console.error(err);
    }
  }, [backendUrl]);

  const stopRecording = useCallback(() => {
    // Flush any remaining buffered audio
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN &&
      bufferLengthRef.current > 0
    ) {
      const combined = new Float32Array(bufferLengthRef.current);
      let offset = 0;
      for (const chunk of audioBufferRef.current) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const wavData = encodeWAV(combined, 16000);
      websocketRef.current.send(wavData);

      audioBufferRef.current = [];
      bufferLengthRef.current = 0;
    }

    // Disconnect audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket after a short delay to allow final transcript to arrive
    if (websocketRef.current) {
      setTimeout(() => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.close();
        }
        websocketRef.current = null;
      }, 500);
    }

    // Fetch latest session details to get authoritative word count / transcript
    const sessionId = currentSessionId;
    if (sessionId) {
      setTimeout(() => {
        fetch(`${backendUrl}/api/sessions/${sessionId}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data) return;
            const serverText = data.transcript?.full_text || "";
            setFinalText(serverText || finalText);
            const serverCount = data.session?.metrics?.word_count;
            if (serverCount != null) {
              setWordCount(serverCount);
            } else {
              setWordCount(serverText ? countWords(serverText) : 0);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch session for word count:", err);
            // Fallback to local count
            setWordCount((prev) => {
              const combined = `${finalText} ${partialText}`.trim();
              return combined ? countWords(combined) : prev;
            });
          });
      }, 800); // slight delay to allow server to persist metrics
    } else {
      // Fallback to local count if no session id
      setWordCount((prev) => {
        const combined = `${finalText} ${partialText}`.trim();
        return combined ? countWords(combined) : prev;
      });
    }

    setIsRecording(false);
  }, [backendUrl, currentSessionId, finalText, partialText]);

  return {
    isRecording,
    partialText,
    finalText,
    wordCount,
    currentSessionId,
    error,
    startRecording,
    stopRecording,
  };
}
