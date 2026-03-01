import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { analyzeDocument } from "../lib/api";

const steps = [
  "Upload PDF/DOCX/Image",
  "OCR & Text Extraction",
  "Clause Segmentation",
  "AI Risk Analysis",
  "Annotated Report Generation"
];

export default function UploadPanel({ userId, userEmail, onAnalysis }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(0);
      return;
    }

    setActiveStep(1);
    const interval = setInterval(() => {
      setActiveStep((current) => (current >= steps.length ? 1 : current + 1));
    }, 1100);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setMessage("Please select a document first.");
      return;
    }

    setIsAnalyzing(true);
    setMessage("Analyzing contract...");
    try {
      const result = await analyzeDocument(selectedFile, userId, userEmail);
      onAnalysis?.(result);
      setMessage("Analysis complete.");
    } catch (error) {
      setMessage(error.message || "Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <h2 className="text-xl font-semibold">Document Upload & Processing</h2>
      <p className="text-sm text-mist mt-2">
        Supported: PDF, DOCX, scanned PDF, JPG, PNG
      </p>

      <div
        className="mt-5 border-2 border-dashed border-white/20 rounded-xl p-6 hover:border-neon transition-colors cursor-pointer bg-white/[0.02]"
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="text-center text-sm text-mist">
          {selectedFile
            ? `Selected: ${selectedFile.name}`
            : "Drag & drop your contract here, or click to upload"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <ul className="mt-5 space-y-2">
        {steps.map((step, idx) => (
          <li
            key={step}
            className={`text-sm border rounded-lg px-3 py-2 flex justify-between transition-colors ${
              activeStep >= idx + 1
                ? "bg-neon/10 border-neon/40 text-slate-100"
                : "bg-white/[0.03] border-white/10"
            }`}
          >
            <span>{step}</span>
            <span className={activeStep >= idx + 1 ? "text-neon" : "text-mist"}>0{idx + 1}</span>
          </li>
        ))}
      </ul>

      {isAnalyzing ? (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 bg-neon loading-loop" />
          </div>
          <p className="text-xs text-mist mt-2">Processing... this can take up to 30-60 seconds.</p>
        </div>
      ) : null}

      <button
        className="cta-btn w-full mt-6 bg-ember text-white hover:shadow-ember disabled:opacity-60"
        onClick={handleAnalyze}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? "Analyzing..." : "Analyze Contract Now"}
      </button>

      {message ? <p className="text-sm text-mist mt-3">{message}</p> : null}
    </motion.section>
  );
}
