import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";

import Evaluate from "./pages/Evaluate";
import ChunkingLab from "./pages/ChunkingLab";
import History from "./pages/History";
import Upload from "./pages/Upload";


function App() {

  const [currentPage, setCurrentPage] =
    useState("evaluate");


  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">

      {/* Sidebar */}

      <div className="w-72 border-r border-[#222230] bg-[#0f0f17] p-6">

        <div className="mb-10">

          <h1 className="text-3xl font-bold tracking-tight">
            RAG Studio
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Evaluation & Observability
          </p>

        </div>

        <div className="space-y-3">

          <button
            onClick={() => setCurrentPage("evaluate")}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${
              currentPage === "evaluate"
                ? "bg-violet-600"
                : "bg-[#171722] hover:bg-[#202030]"
            }`}
          >
            Evaluate
          </button>

          <button
            onClick={() => setCurrentPage("chunking")}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${
              currentPage === "chunking"
                ? "bg-violet-600"
                : "bg-[#171722] hover:bg-[#202030]"
            }`}
          >
            Chunking Lab
          </button>

          <button
            onClick={() => setCurrentPage("history")}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${
              currentPage === "history"
                ? "bg-violet-600"
                : "bg-[#171722] hover:bg-[#202030]"
            }`}
          >
            Insights
          </button>

          <button
            onClick={() => setCurrentPage("upload")}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${
              currentPage === "upload"
                ? "bg-violet-600"
                : "bg-[#171722] hover:bg-[#202030]"
            }`}
          >
            Uploads
          </button>

        </div>

      </div>


      {/* Main */}

      <div className="flex-1 overflow-y-auto">

        {/* Header */}

        <div className="border-b border-[#222230] px-10 py-6 bg-[#0f0f17] sticky top-0 z-10 backdrop-blur-xl">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-3xl font-bold">
                {currentPage === "evaluate" && "RAG Evaluation"}
                {currentPage === "chunking" && "Chunking Strategy Lab"}
                {currentPage === "history" && "Evaluation Insights"}
                {currentPage === "upload" && "Knowledge Base"}
              </h2>

              <p className="text-slate-500 mt-1">
                Track experiment runs, compare chunking strategies, and analyze performance trends over time.
              </p>

            </div>

            <div className="flex gap-3">
              

              <div className="pill">
                LIVE
              </div>

              <div className="pill">
                LOCAL LLM
              </div>

            </div>

          </div>

        </div>


        {/* Content */}

        <div className="p-10">

          {currentPage === "evaluate" && (
            <Evaluate />
          )}

          {currentPage === "chunking" && (
            <ChunkingLab />
          )}

          {currentPage === "history" && (
            <History />
          )}

          {currentPage === "upload" && (
            <Upload />
          )}

        </div>

      </div>

    </div>
  );
}


export default App;