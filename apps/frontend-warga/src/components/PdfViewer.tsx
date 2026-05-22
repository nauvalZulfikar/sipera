import { useState } from 'react';

interface PdfViewerProps {
  /** URL of the PDF file. */
  src: string;
  /** File name shown on download. */
  fileName?: string;
  /** Height of the viewer area. Default 600px. */
  height?: number;
}

/**
 * Inline PDF viewer. Pakai browser native PDF renderer (no JS lib needed = 0 KB extra).
 * Fallback: link download untuk browser tanpa native PDF (IE legacy, beberapa mobile).
 */
export function PdfViewer({ src, fileName = 'document.pdf', height = 600 }: PdfViewerProps) {
  const [failed, setFailed] = useState(false);

  function print() {
    const w = window.open(src, '_blank');
    if (w) w.addEventListener('load', () => w.print());
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <span style={styles.fileName}>📄 {fileName}</span>
        <div style={styles.actions}>
          <a href={src} download={fileName} style={styles.btn}>
            ⬇ Unduh
          </a>
          <button onClick={print} style={styles.btn}>
            🖨 Cetak
          </button>
          <a href={src} target="_blank" rel="noopener noreferrer" style={styles.btn}>
            ↗ Buka Tab Baru
          </a>
        </div>
      </div>
      {failed ? (
        <div style={styles.fallback}>
          <p>Browser tidak bisa menampilkan PDF inline.</p>
          <a href={src} download={fileName} style={styles.btnPrimary}>
            ⬇ Klik untuk Unduh
          </a>
        </div>
      ) : (
        <object
          data={src}
          type="application/pdf"
          width="100%"
          height={height}
          onError={() => setFailed(true)}
        >
          <iframe
            src={src}
            title={fileName}
            width="100%"
            height={height}
            style={{ border: 'none' }}
          />
        </object>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    background: 'white',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#f1f5f9',
    borderBottom: '1px solid #cbd5e1',
  },
  fileName: { fontWeight: 600, fontSize: 13, color: '#334155' },
  actions: { display: 'flex', gap: 8 },
  btn: {
    padding: '6px 12px',
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    color: '#475569',
    textDecoration: 'none',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#1e3a8a',
    color: 'white',
    borderRadius: 6,
    textDecoration: 'none',
    fontWeight: 600,
    display: 'inline-block',
    marginTop: 12,
  },
  fallback: { padding: 48, textAlign: 'center', color: '#64748b' },
};
