/* ============================================================
   Animated SVG charts — Area, Bars, Donut, Gauge, Sparkline
   ============================================================ */
import React, { useState, useEffect, useRef } from "react";

/* mount flag to trigger CSS transitions on first paint */
export function useMounted(delay = 60) {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, [delay]);
  return m;
}

/* ---------- count-up number ---------- */
export function useCountUp(target, dur = 1100) {
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skip = reduced || (typeof document !== "undefined" && document.hidden);
  const [val, setVal] = useState(skip ? target : 0);
  const ref = useRef({ raf: 0, start: 0, from: 0 });
  useEffect(() => {
    if (skip) { setVal(target); return; }
    const o = ref.current; o.from = val; o.start = 0;
    cancelAnimationFrame(o.raf);
    const step = (t) => {
      if (!o.start) o.start = t;
      const p = Math.min(1, (t - o.start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(o.from + (target - o.from) * e);
      if (p < 1) o.raf = requestAnimationFrame(step);
    };
    o.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(o.raf);
    // eslint-disable-next-line
  }, [target]);
  return val;
}

export function CountUp({ value, dur, format }) {
  const v = useCountUp(value, dur);
  const f = format || ((n) => Math.round(n).toLocaleString("en-US"));
  return <span className="num">{f(v)}</span>;
}

/* ---------- Area / line chart ---------- */
export function AreaChart({ data, height = 220, color = "var(--primary)", color2 = "var(--cyan)", labels }) {
  const mounted = useMounted();
  const w = 760, h = height, pad = { l: 8, r: 8, t: 16, b: 26 };
  const max = Math.max(...data, 1) * 1.15;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const pts = data.map((d, i) => {
    const x = pad.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = pad.t + ih - (d / max) * ih;
    return [x, y];
  });
  // smooth path
  function smooth(p) {
    if (p.length < 2) return "";
    let d = `M ${p[0][0]} ${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i], [x1, y1] = p[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
    }
    return d;
  }
  const line = smooth(pts);
  const area = line + ` L ${pts[pts.length - 1][0]} ${pad.t + ih} L ${pts[0][0]} ${pad.t + ih} Z`;
  const lineRef = useRef(null);
  const [len, setLen] = useState(1000);
  useEffect(() => { if (lineRef.current) setLen(lineRef.current.getTotalLength()); }, [line]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g}
          stroke="var(--border)" strokeWidth="1" strokeDasharray="2 5" />
      ))}
      <path d={area} fill="url(#areaFill)" style={{ opacity: mounted ? 1 : 0, transition: "opacity .9s ease .3s" }} />
      <path ref={lineRef} d={line} fill="none" stroke="url(#lineStroke)" strokeWidth="3" strokeLinecap="round"
        style={{ strokeDasharray: len, strokeDashoffset: mounted ? 0 : len, transition: "stroke-dashoffset 1.4s cubic-bezier(.22,.61,.36,1)" }} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#fff" stroke="url(#lineStroke)" strokeWidth="2.5"
          style={{ opacity: mounted ? 1 : 0, transition: `opacity .4s ease ${0.7 + i * 0.04}s` }} />
      ))}
      {labels && labels.map((lb, i) => {
        const x = pad.l + (i / (labels.length - 1)) * iw;
        return <text key={i} x={x} y={h - 6} fontSize="11" fill="var(--text-3)" textAnchor="middle" fontFamily="var(--font)">{lb}</text>;
      })}
    </svg>
  );
}

/* ---------- Grouped bars (in vs out) ---------- */
export function BarChart({ groups, height = 220, labels }) {
  // groups: [{in, out}]
  const mounted = useMounted();
  const w = 760, h = height, pad = { l: 8, r: 8, t: 16, b: 26 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const max = Math.max(...groups.flatMap((g) => [g.in, g.out]), 1) * 1.12;
  const gw = iw / groups.length;
  const bw = Math.min(16, gw * 0.28);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="barIn" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".7" /><stop offset="100%" stopColor="var(--primary)" /></linearGradient>
        <linearGradient id="barOut" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="var(--cyan)" stopOpacity=".7" /><stop offset="100%" stopColor="var(--cyan)" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 5" />
      ))}
      {groups.map((g, i) => {
        const cx = pad.l + gw * i + gw / 2;
        const hi = (g.in / max) * ih, ho = (g.out / max) * ih;
        return (
          <g key={i}>
            <rect x={cx - bw - 3} y={pad.t + ih - (mounted ? hi : 0)} width={bw} height={mounted ? hi : 0} rx="4" fill="url(#barIn)"
              style={{ transition: `height .9s cubic-bezier(.22,.61,.36,1) ${i * 0.05}s, y .9s cubic-bezier(.22,.61,.36,1) ${i * 0.05}s` }} />
            <rect x={cx + 3} y={pad.t + ih - (mounted ? ho : 0)} width={bw} height={mounted ? ho : 0} rx="4" fill="url(#barOut)"
              style={{ transition: `height .9s cubic-bezier(.22,.61,.36,1) ${i * 0.05 + .05}s, y .9s cubic-bezier(.22,.61,.36,1) ${i * 0.05 + .05}s` }} />
            {labels && <text x={cx} y={h - 6} fontSize="11" fill="var(--text-3)" textAnchor="middle" fontFamily="var(--font)">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Donut ---------- */
export function Donut({ segments, size = 180, thickness = 26, center }) {
  // segments: [{value, color, label}]
  const mounted = useMounted();
  const vals = segments.map((s) => (Number.isFinite(s.value) ? s.value : 0));
  const total = vals.reduce((s, v) => s + v, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, cx = size / 2;
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = vals[i] / total;
        const dash = frac * c;
        const off = acc * c; acc += frac;
        return (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${mounted ? dash : 0} ${c}`} strokeDashoffset={-off} strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: `stroke-dasharray 1.1s cubic-bezier(.22,.61,.36,1) ${i * 0.08}s` }} />
        );
      })}
      {center && (
        <foreignObject x="0" y="0" width={size} height={size}>
          <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}>{center}</div>
        </foreignObject>
      )}
    </svg>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, w = 70, h = 30, color = "#fff", up = true }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}
