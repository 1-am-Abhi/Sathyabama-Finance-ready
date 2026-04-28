import React from "react";

const RequestTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      <h4 className="font-bold text-md mb-2">Request Timeline</h4>
      {timeline.map((t) => (
        <div key={t.id || t._id} className="border p-3 rounded bg-white shadow-sm">
          <p className="font-semibold">{t.action}</p>
          {t.metadata?.remarks && <p className="text-sm italic text-gray-600">{t.metadata.remarks}</p>}
          <p className="text-xs text-gray-500 mt-1">
            {new Date(t.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default RequestTimeline;
