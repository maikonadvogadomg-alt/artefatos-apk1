import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/api/ws/terminal`;
}

type ConnState = "disconnected" | "connecting" | "connected" | "error";

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connState, setConnState] = useState<ConnState>("disconnected");
  const [sessionCount, setSessionCount] = useState(0);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) {
      wsRef.current.close();
    }

    if (!termRef.current || !containerRef.current) return;
    const term = termRef.current;
    term.clear();

    setConnState("connecting");
    term.writeln("\x1b[33m[Conectando ao terminal Linux...]\x1b[0m\r");

    const ws = new WebSocket(getWsUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("connected");
      term.writeln("\x1b[32m[Conectado! Terminal Linux ativo.]\x1b[0m\r");
      if (fitRef.current) {
        fitRef.current.fit();
        const { cols, rows } = term;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    };

    ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(ev.data));
      } else {
        term.write(ev.data as string);
      }
    };

    ws.onerror = () => {
      setConnState("error");
      term.writeln("\r\n\x1b[31m[Erro de conexão WebSocket]\x1b[0m\r");
    };

    ws.onclose = (e) => {
      if (connState !== "error") {
        setConnState("disconnected");
        term.writeln(`\r\n\x1b[90m[Sessão encerrada (código ${e.code})]\x1b[0m\r`);
      }
      wsRef.current = null;
    };
  }, [connState]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#0f172a",
        foreground: "#e2e8f0",
        cursor: "#a78bfa",
        cursorAccent: "#0f172a",
        selectionBackground: "#4c1d9580",
        black: "#1e293b",
        brightBlack: "#475569",
        red: "#ef4444",
        brightRed: "#f87171",
        green: "#22c55e",
        brightGreen: "#4ade80",
        yellow: "#eab308",
        brightYellow: "#facc15",
        blue: "#3b82f6",
        brightBlue: "#60a5fa",
        magenta: "#a855f7",
        brightMagenta: "#c084fc",
        cyan: "#06b6d4",
        brightCyan: "#22d3ee",
        white: "#e2e8f0",
        brightWhite: "#f8fafc",
      },
      fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    });

    term.onResize(({ cols, rows }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* */ }
    });
    ro.observe(containerRef.current);

    term.writeln("\x1b[35m╔══════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[35m║   \x1b[1;37mTerminal Linux — APK Builder\x1b[0m\x1b[35m      ║\x1b[0m");
    term.writeln("\x1b[35m╚══════════════════════════════════════╝\x1b[0m");
    term.writeln("\x1b[90mClique em \x1b[32mConectar\x1b[90m para iniciar uma sessão bash.\x1b[0m\r");

    return () => {
      ro.disconnect();
      wsRef.current?.close();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  const handleConnect = () => {
    setSessionCount(c => c + 1);
    connect();
  };

  const handleDisconnect = () => {
    wsRef.current?.close();
    setConnState("disconnected");
  };

  const stateColor = {
    disconnected: "bg-slate-500",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-green-400",
    error: "bg-red-400",
  }[connState];

  const stateLabel = {
    disconnected: "Desconectado",
    connecting: "Conectando...",
    connected: "Conectado",
    error: "Erro",
  }[connState];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${stateColor}`} />
          <span className="text-xs text-slate-400">{stateLabel}</span>
        </div>
        <button
          onClick={handleConnect}
          disabled={connState === "connecting"}
          className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-xs font-bold transition-all text-white">
          {connState === "connected" ? "🔄 Nova sessão" : "▶ Conectar"}
        </button>
        {connState === "connected" && (
          <button
            onClick={handleDisconnect}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-bold transition-all text-white">
            ✕ Desconectar
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">bash · xterm-256color · Linux</span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-700"
        style={{ backgroundColor: "#0f172a" }}
      />

      <p className="text-xs text-slate-500">
        Terminal real Linux. Comandos <code className="text-slate-400">ls</code>, <code className="text-slate-400">node</code>, <code className="text-slate-400">pnpm</code>, <code className="text-slate-400">git</code> e outros funcionam. Sessão expira em 30 min de inatividade.
      </p>
    </div>
  );
}
