function Sidebar({
  currentPage,
  setCurrentPage
}) {

  const menuItems = [

    {
      id: "evaluate",
      label: "⚡ Evaluate"
    },

    {
      id: "chunking",
      label: "🧪 Chunking Lab"
    },

    {
      id: "history",
      label: "📊 Insights"
    },

    {
      id: "upload",
      label: "📄 Upload"
    }
  ];

  return (

    <div className="w-72 bg-slate-950 border-r border-slate-800 min-h-screen p-6">

      <h1 className="text-4xl font-bold mb-12">
        RAGeval
      </h1>

      <div className="space-y-3">

        {menuItems.map((item) => (

          <button
            key={item.id}

            onClick={() =>
              setCurrentPage(item.id)
            }

            className={`w-full text-left px-5 py-2 rounded-xl transition-all ${
              currentPage === item.id
                ? "bg-violet-600 text-white"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >

            {item.label}

          </button>
        ))}
      </div>

      <div className="mt-16">

        <p className="text-slate-500 text-sm mb-4">
          STACK
        </p>

        <div className="flex flex-wrap gap-2">

          {[
            "RAGAS",
            "LangChain",
            "ChromaDB",
            "FastAPI",
            "LangSmith"
          ].map((tech) => (

            <span
              key={tech}

              className="px-3 py-1 bg-slate-900 rounded-lg text-sm"
            >

              {tech}

            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Sidebar;