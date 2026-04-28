import React, { useEffect, useState } from "react";
import apiClient from "../../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Card = ({ title, value }) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="text-xl font-bold text-gray-900 dark:text-white">
      {String(value).includes('%') ? value : `₹${Number(value).toLocaleString('en-IN')}`}
    </p>
  </div>
);

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/analytics/faculty")
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-900 dark:text-white">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-gray-900 dark:text-white">No data available</div>;

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-slate-900 min-h-[calc(100vh-4rem)]">

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Budget" value={data.totalBudget} />
        <Card title="Total Released" value={data.totalReleased} />
        <Card title="Utilization %" value={`${data.utilization}%`} />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="font-semibold mb-6 text-gray-900 dark:text-white text-lg">Project Spending Breakdown</h3>
        
        {data.projects && data.projects.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.projects} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="title" tick={{fill: '#888888'}} axisLine={{stroke: '#e5e7eb'}} />
              <YAxis tick={{fill: '#888888'}} axisLine={{stroke: '#e5e7eb'}} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
              <Tooltip 
                cursor={{fill: 'transparent'}} 
                contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px'}} 
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Released']}
              />
              <Bar dataKey="released" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="p-8 text-center text-gray-500">No project spending data available</div>
        )}
      </div>

    </div>
  );
}
