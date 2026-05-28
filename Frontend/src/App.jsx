import { useState } from "react";

import Sidebar from "./components/Sidebar";

import Evaluate from "./pages/Evaluate";
import ChunkingLab from "./pages/ChunkingLab";
import History from "./pages/History";
import Upload from "./pages/Upload";


function App() {

  const [currentPage, setCurrentPage] =
    useState("evaluate");


  return (

    <div className="flex min-h-screen bg-slate-950 text-white">

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      <div className="flex-1 p-8">

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
  );
}


export default App;