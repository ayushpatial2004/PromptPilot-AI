import { useState } from 'react';
import {
  PIPELINE_BENEFITS,
  PIPELINE_LAYERS,
  PIPELINE_MODEL,
  PRODUCTION_PYTHON_CODE,
  LAYER_1_SYSTEM_INSTRUCTIONS,
  LAYER_2_DEVELOPER_RULES,
} from '../config/cachingPipeline';

/**
 * Resolve the template placeholders inside the production reference
 * implementation so the "Copy" button ships a runnable Python file.
 */
function resolvePythonCode(raw) {
  return raw
    .replaceAll('${MODEL_PLACEHOLDER}', PIPELINE_MODEL)
    .replaceAll(
      '${L1_PLACEHOLDER}',
      JSON.stringify(LAYER_1_SYSTEM_INSTRUCTIONS).slice(1, -1)
    )
    .replaceAll(
      '${L2_PLACEHOLDER}',
      JSON.stringify(LAYER_2_DEVELOPER_RULES).slice(1, -1)
    );
}

export default function CachingPipeline() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeLayer, setActiveLayer] = useState(null);

  const pythonCode = resolvePythonCode(PRODUCTION_PYTHON_CODE);

  async function handleCopyCode() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pythonCode);
      } else {
        const ta = document.createElement('textarea');
        ta.value = pythonCode;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('CachingPipeline: copy failed', err);
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 11,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 12px',
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(124,58,237,0.22)',
              border: '1px solid rgba(124,58,237,0.45)',
              color: '#c4b5fd',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            ⚡
          </span>
          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Cache-Optimized 3-Layer Pipeline
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              Gemini Prompt Caching · static → cached → dynamic
            </div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: '10px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderTop: '1px solid var(--border-color)',
            animation: 'fadeUp 0.2s ease',
          }}
        >
          {/* ── Layers ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {PIPELINE_LAYERS.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <div
                  key={layer.id}
                  style={{
                    border: `1px solid ${
                      isActive ? layer.accent : 'var(--border-color)'
                    }`,
                    borderRadius: 9,
                    background: isActive
                      ? 'rgba(255,255,255,0.04)'
                      : 'var(--bg-tertiary)',
                    transition: 'all 0.18s',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setActiveLayer(isActive ? null : layer.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 9px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 18,
                        borderRadius: 5,
                        background: `${layer.accent}26`,
                        color: layer.accent,
                        fontSize: 9,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {layer.badge}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          lineHeight: 1.25,
                        }}
                      >
                        {layer.title}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          color: layer.cacheable ? '#34d399' : '#f59e0b',
                          marginTop: 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontWeight: 700,
                        }}
                      >
                        {layer.subtitle}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--text-very-faint)',
                      }}
                    >
                      {layer.preview ? (isActive ? '−' : '+') : '·'}
                    </span>
                  </button>

                  {isActive && (
                    <div
                      style={{
                        padding: '8px 10px 10px',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10.5,
                          color: 'var(--text-muted)',
                          lineHeight: 1.55,
                          marginBottom: layer.preview ? 8 : 0,
                        }}
                      >
                        {layer.description}
                      </p>
                      {layer.preview && (
                        <pre
                          style={{
                            margin: 0,
                            padding: 9,
                            borderRadius: 7,
                            background: 'rgba(0,0,0,0.32)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            fontFamily: "'Courier New',Courier,monospace",
                            fontSize: 9.5,
                            lineHeight: 1.55,
                            color: 'rgba(255,255,255,0.7)',
                            maxHeight: 140,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {layer.preview}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Benefits row ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {PIPELINE_BENEFITS.map((b) => (
              <div
                key={b.label}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: '7px 8px',
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--text-faint)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                  }}
                >
                  {b.label}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: 'var(--accent-light)',
                    marginTop: 2,
                  }}
                >
                  {b.value}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--text-very-faint)',
                    marginTop: 2,
                    lineHeight: 1.35,
                  }}
                >
                  {b.detail}
                </div>
              </div>
            ))}
          </div>

          {/* ── Copy Production Python Code ── */}
          <button
            onClick={handleCopyCode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '10px 12px',
              borderRadius: 9,
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              color: 'white',
              background: copied
                ? 'rgba(52,211,153,0.85)'
                : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              transition: 'all 0.2s',
              boxShadow: copied ? 'none' : '0 3px 14px rgba(124,58,237,0.35)',
            }}
          >
            <span style={{ fontSize: 13 }}>{copied ? '✓' : '⧉'}</span>
            {copied
              ? 'Copied! Paste into caching_pipeline.py'
              : 'Copy Production Python Code'}
          </button>

          <p
            style={{
              fontSize: 10,
              color: 'var(--text-very-faint)',
              lineHeight: 1.5,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Uses the official{' '}
            <code
              style={{
                background: 'rgba(255,255,255,0.06)',
                padding: '0 4px',
                borderRadius: 3,
                color: 'var(--text-secondary)',
              }}
            >
              google-genai
            </code>{' '}
            SDK · model {PIPELINE_MODEL}
          </p>
        </div>
      )}

      {copied && !open && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,30,40,0.95)',
            border: '1px solid rgba(52,211,153,0.3)',
            color: '#34d399',
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 11.5,
            zIndex: 9999,
            whiteSpace: 'nowrap',
            animation: 'fadeUp 0.2s ease',
          }}
        >
          ✅ Python code copied
        </div>
      )}
    </div>
  );
}
