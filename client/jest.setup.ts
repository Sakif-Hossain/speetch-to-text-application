import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return "";
  },
}));

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  });
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Mock MediaDevices
const mockMediaStream = {
  getTracks: () => [{ stop: jest.fn() }],
};

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
  },
  writable: true,
});

// Mock AudioContext
class MockAudioContext {
  sampleRate = 16000;
  destination = {};
  
  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  createScriptProcessor = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null,
  }));
  
  close = jest.fn();
}

global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
