import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useRef } from "react";

interface Props {
  onBack: () => void;
}

export default function Extrator({ onBack }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = import.meta.env.BASE_URL + "extrator.html";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#0d1117" }}>
      {/* Barra superior mínima */}
      <div style={{
        height: 44, display: "flex", alignItems: "center", gap: 8,
        padding: "0 12px", background: "#161b22",
        borderBottom: "1px solid #30363d", flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            background: "#21262d", border: "1px solid #30363d", borderRadius: 8,
            color: "#e6edf3", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <span style={{ fontSize: 13, fontWeight: 700, color: "#58a6ff", marginLeft: 4 }}>
          ⚖️ Extrator Jurídico
        </span>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
          title="Recarregar"
          style={{
            display: "flex", alignItems: "center", padding: 6,
            background: "transparent", border: "none", borderRadius: 6,
            color: "#8b949e", cursor: "pointer",
          }}
        >
          <RefreshCw size={15} />
        </button>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir em nova aba"
          style={{
            display: "flex", alignItems: "center", padding: 6,
            background: "transparent", border: "none", borderRadius: 6,
            color: "#8b949e", cursor: "pointer", textDecoration: "none",
          }}
        >
          <ExternalLink size={15} />
        </a>
      </div>

      {/* Iframe que ocupa todo o espaço restante */}
      <iframe
        ref={iframeRef}
        src={src}
        title="Extrator Jurídico"
        style={{ flex: 1, width: "100%", border: "none" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
