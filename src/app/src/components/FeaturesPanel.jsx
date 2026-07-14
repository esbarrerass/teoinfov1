function Metric({ label, value, unit }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value != null && !Number.isNaN(value) ? value.toFixed(1) : '—'} {unit}
      </span>
    </div>
  );
}

export default function FeaturesPanel({ features }) {
  return (
    <div className="features-panel">
      <Metric label="FC" value={features?.fc} unit="lpm" />
      <Metric label="SDNN" value={features?.sdnn} unit="ms" />
      <Metric label="RMSSD" value={features?.rmssd} unit="ms" />
    </div>
  );
}
