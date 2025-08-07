import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CloseIcon } from "./icons";

export default function StatGraphModal({ graphData, onClose }) {
  if (!graphData) return null;
  const { statName, data } = graphData;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-3xl border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-orange-500">
            {statName} Over Time
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                interval="preserveEnd"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded bg-gray-900 text-gray-100 px-4 py-2 text-xs border border-gray-800">
                      <div>
                        <strong>Date:</strong> {d.date}
                      </div>
                      {d.team && d.opponent && (
                        <div>
                          <strong>Teams:</strong> {d.team} vs {d.opponent}
                        </div>
                      )}
                      <div>
                        <strong>{statName}:</strong> {d.value}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              <Line
                type="monotone"
                dataKey="value"
                name={statName}
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 4, fill: "#f97316" }}
                activeDot={{ r: 8, fill: "#f97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

