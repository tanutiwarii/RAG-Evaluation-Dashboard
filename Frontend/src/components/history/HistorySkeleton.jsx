function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="card border border-[#262638]"
        >
          <div className="h-6 bg-[#262638] rounded w-1/3 mb-4"></div>

          <div className="h-8 bg-[#262638] rounded w-2/3 mb-4"></div>

          <div className="h-4 bg-[#262638] rounded w-1/4 mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((metric) => (
              <div
                key={metric}
                className="bg-[#111118] border border-[#262638] rounded-xl p-5"
              >
                <div className="h-5 bg-[#262638] rounded w-1/2 mb-4"></div>

                <div className="space-y-3">
                  <div className="h-4 bg-[#262638] rounded"></div>
                  <div className="h-4 bg-[#262638] rounded"></div>
                  <div className="h-4 bg-[#262638] rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}

export default HistorySkeleton;