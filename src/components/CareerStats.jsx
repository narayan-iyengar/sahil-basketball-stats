import React, { useEffect, useState } from "react";
import { db, provider, rtdb, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { XIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const statLabels = [
  { key: "points", label: "PTS" },
  { key: "fg2m", label: "2PT" },
  { key: "fg3m", label: "3PT" },
  { key: "ftm", label: "FT" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "fouls", label: "FLS" },
  { key: "turnovers", label: "TO" },
];

function average(arr) {
  if (!arr.length) return 0;
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
}

export default function CareerStats({ onClose }) {
  const [games, setGames] = useState([]);

  useEffect(() => {
    getDocs(collection(db, "games")).then((snap) => {
      setGames(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.date > b.date ? 1 : -1))
      );
    });
  }, []);

  // Build data for charts: x = game #, y = stat
  const chartData = games.map((g, i) => ({
    name: g.date || `Game ${i + 1}`,
    ...statLabels.reduce((acc, s) => {
      acc[s.key] = g.stats?.[s.key] || 0;
      return acc;
    }, {}),
  }));

  // Career totals/averages
  const totals = statLabels.reduce(
    (acc, s) => {
      acc[s.key] = games.reduce((sum, g) => sum + (g.stats?.[s.key] || 0), 0);
      return acc;
    },
    {}
  );
  const averages = statLabels.reduce(
    (acc, s) => {
      acc[s.key] = average(games.map((g) => g.stats?.[s.key] || 0));
      return acc;
    },
    {}
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-2 right-2" onClick={onClose}><XIcon /></button>
        <h2 className="text-2xl font-bold mb-3">Career Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {statLabels.map((s) => (
            <div key={s.key} className="flex flex-col items-center">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
              <span className="text-lg font-bold">{totals[s.key]}</span>
              <span className="text-xs text-gray-400">Avg {averages[s.key]}</span>
            </div>
          ))}
        </div>
        <h3 className="font-semibold text-lg mb-2">Progression</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="points" stroke="#3b82f6" name="PTS" strokeWidth={2} />
              <Line type="monotone" dataKey="assists" stroke="#10b981" name="AST" />
              <Line type="monotone" dataKey="rebounds" stroke="#6366f1" name="REB" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs mt-4 text-gray-400">
          Graph shows point and assist totals for each game.
        </div>
      </div>
    </div>
  );
}






