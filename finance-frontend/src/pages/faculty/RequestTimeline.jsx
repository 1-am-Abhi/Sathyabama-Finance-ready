import React from "react";

const RequestTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      <h4 className="font-bold text-md mb-2 text-white">Request Timeline</h4>
      {timeline.map((t) => (
        <div key={t.id || t._id} className="p-3 rounded bg-slate-700 mb-2">
          <p className="font-semibold text-white">{t.action}</p>
          
          {t.amount && (
            <p className="text-green-400 text-sm">
              ₹{t.amount}
            </p>
          )}

          {t.metadata?.remarks && <p className="text-sm italic text-gray-300">{t.metadata.remarks}</p>}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(t.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default RequestTimeline;
