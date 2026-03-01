import { motion } from "framer-motion";

export default function RiskPreview({ analysis }) {
  const summary = analysis?.summary;
  const topClause = analysis?.clauses?.[0];
  const badgeLabel = summary?.contract_health ?? "No Analysis";
  const badgeClass = summary
    ? summary.overall_risk >= 70
      ? "bg-ember/20 text-rose-300 border-rose-400/30"
      : summary.overall_risk >= 40
        ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
    : "bg-white/5 text-mist border-white/15";

  const handleDownload = () => {
    if (!analysis) return;

    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `risk-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live Risk Summary</h2>
        <span className={`px-3 py-1 rounded-full text-xs border ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        <Metric title="Overall Risk" value={summary?.overall_risk} />
        <Metric title="Financial" value={summary?.financial_risk} />
        <Metric title="Termination" value={summary?.termination_risk} />
        <Metric title="Liability" value={summary?.liability_risk} />
        <Metric title="Power" value={summary?.power_imbalance_risk} />
        <Metric title="Ambiguity" value={summary?.ambiguity_risk} />
      </div>

      <article className="mt-6 bg-white/[0.03] border border-white/10 rounded-xl p-4">
        <p className="text-xs text-neon uppercase tracking-wider">
          Clause Type: {topClause?.clause_type ?? "No analysis yet"}
        </p>
        <p className="mt-2 text-sm text-slate-100">
          {topClause?.simplified_explanation ??
            "Run an analysis to see clause explanations and risk details here."}
        </p>
        <p className="mt-3 text-xs text-mist">
          Safer Alternative: {topClause?.suggested_safe_alternative ??
            "No recommendation yet."}
        </p>
      </article>

      <button
        className="cta-btn w-full mt-6 bg-neon text-white disabled:opacity-60"
        onClick={handleDownload}
        disabled={!analysis}
      >
        {analysis ? "Download Annotated Report" : "Analyze a document to enable download"}
      </button>
    </motion.section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors">
      <p className="text-xs text-mist">{title}</p>
      <p className="text-xl font-bold text-slate-100 mt-1">{value ?? "--"}</p>
    </div>
  );
}
