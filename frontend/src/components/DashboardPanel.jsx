import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";

function getRiskBadgeClass(score) {
  if (score == null) return "text-mist border-white/15 bg-white/[0.02]";
  if (score >= 70) return "text-rose-300 border-rose-400/30 bg-rose-500/10";
  if (score >= 40) return "text-amber-300 border-amber-400/30 bg-amber-500/10";
  return "text-emerald-300 border-emerald-400/30 bg-emerald-500/10";
}

function buildPreviewLines(extractedText) {
  if (!extractedText) return [];
  return extractedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function DashboardPanel({ user, refreshSignal = 0, guestAnalysis = null, variant = "default" }) {
  const [role, setRole] = useState("free");
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedDocumentClauses, setSelectedDocumentClauses] = useState([]);
  const [loadingClauses, setLoadingClauses] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState(null);

  useEffect(() => {
    if (!user || !supabase) return;

    const load = async () => {
      const profileResponse = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileResponse.data) {
        setRole(profileResponse.data.role);
      }

      const documentsResponse = await supabase
        .from("documents")
        .select("id, file_url, overall_risk_score, extracted_text, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (documentsResponse.data) {
        setDocuments(documentsResponse.data);
        const firstId = documentsResponse.data[0]?.id ?? null;
        setSelectedDocumentId((current) =>
          current && documentsResponse.data.some((doc) => doc.id === current) ? current : firstId
        );
      }
    };

    load();
  }, [user, refreshSignal]);

  useEffect(() => {
    if (!selectedDocumentId || !supabase || !user) {
      setSelectedDocumentClauses([]);
      return;
    }

    const loadClauses = async () => {
      setLoadingClauses(true);
      const clausesResponse = await supabase
        .from("clauses")
        .select("id, clause_text, simplified_text, risk_level, risk_score, suggested_alternative")
        .eq("document_id", selectedDocumentId)
        .order("risk_score", { ascending: false });

      if (clausesResponse.data) {
        setSelectedDocumentClauses(clausesResponse.data);
        setSelectedClauseId(clausesResponse.data[0]?.id ?? null);
      } else {
        setSelectedDocumentClauses([]);
        setSelectedClauseId(null);
      }
      setLoadingClauses(false);
    };

    loadClauses();
  }, [selectedDocumentId, user]);

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId) ?? null;
  const previewLines = buildPreviewLines(selectedDocument?.extracted_text);

  if (!user) {
    const guestSummary = guestAnalysis?.summary;
    const guestClauses = guestAnalysis?.clauses ?? [];

    return (
      <section className="glass-card p-5">
        <h3 className="text-lg font-semibold">Quick Guest Analysis</h3>
        {!guestAnalysis ? (
          <p className="text-sm text-mist mt-2">
            Upload a contract to get a minimal risk preview. Sign in to unlock full clause diagnostics,
            recommendations, and history.
          </p>
        ) : (
          <>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-semibold break-words">{guestAnalysis.document_name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`text-xs border rounded-full px-2 py-0.5 ${getRiskBadgeClass(guestSummary?.overall_risk)}`}>
                  Overall Risk: {guestSummary?.overall_risk ?? "N/A"}/100
                </span>
                <span className="text-xs text-mist">{guestSummary?.contract_health ?? "No Data"}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {guestClauses.length === 0 ? (
                <p className="text-xs text-mist">No clause insights available.</p>
              ) : (
                guestClauses.map((clause, idx) => (
                  <div key={`${clause.clause_text?.slice(0, 30) || "guest"}-${idx}`} className="border border-white/10 rounded-lg p-3 bg-white/[0.02]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-neon">{clause.risk_level || "Unknown"}</p>
                      <span className={`text-[11px] border rounded-full px-2 py-0.5 ${getRiskBadgeClass(clause.risk_score)}`}>
                        Score {clause.risk_score ?? "N/A"}
                      </span>
                    </div>
                    <p className="text-xs mt-1 text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                      {clause.simplified_explanation || clause.clause_text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-mist mt-3">
              Sign in to unlock full clause list, safer recommendations, and upload history.
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card p-6 ${variant === "primary" ? "shadow-glow" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {variant === "primary" ? "Upload History & Critical Review" : "User Dashboard"}
        </h3>
        {variant === "primary" ? (
          <span className="text-xs border border-white/15 rounded-full px-3 py-1 uppercase tracking-wider text-mist">
            Latest 50 Uploads
          </span>
        ) : (
          <span className="text-xs border border-white/15 rounded-full px-3 py-1 uppercase tracking-wider text-neon">
            {role}
          </span>
        )}
      </div>

      <p className="text-sm text-mist mt-2">
        {variant === "primary"
          ? "Strict critical mode: highlights unsafe clauses and final contract decision."
          : `Role: ${role}`}
      </p>

      <h4 className="text-sm font-medium mt-5 mb-2 text-slate-200">Uploads & Reports</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 max-h-80 overflow-y-auto overflow-x-hidden pr-1 pretty-scrollbar">
          {documents.length === 0 ? (
            <p className="text-sm text-mist">No documents yet.</p>
          ) : (
            documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocumentId(doc.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedDocumentId === doc.id
                    ? "border-neon/50 bg-neon/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <p className="text-sm truncate">{doc.file_url}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] border rounded-full px-2 py-0.5 ${getRiskBadgeClass(
                      doc.overall_risk_score
                    )}`}
                  >
                    Risk {doc.overall_risk_score ?? "N/A"}/100
                  </span>
                  <span className="text-[11px] text-mist">{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 max-h-80 overflow-y-auto overflow-x-hidden pretty-scrollbar">
          {!selectedDocument ? (
            <p className="text-sm text-mist">Select an upload to view its report.</p>
          ) : (
            <>
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-sm font-semibold break-words">{selectedDocument.file_url}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs border rounded-full px-2 py-0.5 ${getRiskBadgeClass(
                      selectedDocument.overall_risk_score
                    )}`}
                  >
                    Overall Risk: {selectedDocument.overall_risk_score ?? "N/A"}/100
                  </span>
                  <span className="text-xs text-mist">
                    Uploaded: {new Date(selectedDocument.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="text-xs uppercase tracking-wide text-mist">Extracted Preview</p>
                {previewLines.length === 0 ? (
                  <p className="text-xs text-mist mt-2">No extracted text preview available.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {previewLines.map((line, idx) => (
                      <li key={`${selectedDocument.id}-line-${idx}`} className="text-xs text-slate-200 leading-relaxed">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {loadingClauses ? (
                  <p className="text-xs text-mist">Loading report details...</p>
                ) : selectedDocumentClauses.length === 0 ? (
                  <p className="text-xs text-mist">No clause report found for this upload.</p>
                ) : (
                  selectedDocumentClauses.slice(0, 8).map((clause) => (
                    <button
                      key={clause.id}
                      type="button"
                      onClick={() => setSelectedClauseId(clause.id)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        selectedClauseId === clause.id
                          ? "border-neon/50 bg-neon/10"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-neon">{clause.risk_level || "Unknown"}</p>
                        <span className={`text-[11px] border rounded-full px-2 py-0.5 ${getRiskBadgeClass(clause.risk_score)}`}>
                          Score {clause.risk_score ?? "N/A"}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                        {clause.simplified_text || clause.clause_text}
                      </p>
                      <div className="mt-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-emerald-300 font-semibold">
                          Safer Recommendation
                        </p>
                        <p className="text-xs text-emerald-100 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                          {clause.suggested_alternative || "No recommendation provided for this clause."}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
