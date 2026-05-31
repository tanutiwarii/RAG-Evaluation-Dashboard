import { useState } from "react";

import SingleEvalForm from "../components/evaluate/SingleEvalForm";
import BatchEvalForm from "../components/evaluate/BatchEvalForm";

function Evaluate() {
  const [activeTab, setActiveTab] = useState("single");

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-5xl font-bold mb-4">
          Evaluate Pipeline
        </h1>

        <p className="text-sm text-slate-400">
          Run single-question debugging or production-grade batch evaluation.
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setActiveTab("single")}
          className={`px-5 py-3 rounded-xl border transition ${
            activeTab === "single"
              ? "bg-violet-600 border-violet-500 text-white"
              : "border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
          }`}
        >
          Single Evaluation
        </button>

        <button
          onClick={() => setActiveTab("batch")}
          className={`px-5 py-3 rounded-xl border transition ${
            activeTab === "batch"
              ? "bg-violet-600 border-violet-500 text-white"
              : "border-[#383850] text-slate-300 hover:bg-[#1a1a24]"
          }`}
        >
          Batch Evaluation
        </button>
      </div>

      {activeTab === "single" && <SingleEvalForm />}

      {activeTab === "batch" && <BatchEvalForm />}
    </div>
  );
}

export default Evaluate;