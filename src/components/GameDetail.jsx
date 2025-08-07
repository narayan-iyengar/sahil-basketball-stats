import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeftIcon, Share2Icon, EditIcon } from "lucide-react";

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

export default function GameDetail({ gameId, onEdit, onShare, onBack }) {
  const [game, setGame] = useState(null);

  useEffect(() => {
    getDoc(doc(db, "games", gameId)).then((snap) => setGame(snap.data()));
  }, [gameId]);

  if (!game) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-8">
      <button className="mb-2 flex items-center gap-1 text-blue-700 dark:text-orange-400" onClick={onBack}>
        <ChevronLeftIcon size={20} /> Back
      </button>
      <div className="text-xl font-bold mb-2">{game.teamName} vs {game.opponent}</div>
      <div className="text-gray-500 text-sm mb-2">{game.date} {game.time}</div>
      <div className="font-semibold mb-2 text-lg">Score: {game.scoreTeam} - {game.scoreOpponent}</div>
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 px-2 py-1 rounded text-xs font-bold uppercase">
          {game.mode === "live" ? "Live" : "Past"}
        </span>
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
          {game.periodType === "halves" ? "Halves" : "Quarters"}: {game.periodLength} min
        </span>
      </div>
      <div className="border-t pt-4">
        {statLabels.map(({ key, label }) => (
          <div key={key} className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
            <span>{label}</span>
            <span className="font-semibold">{(game.stats && game.stats[key]) || 0}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        <button className="w-1/2 bg-blue-700 text-white py-2 rounded-xl font-bold hover:bg-blue-800 flex items-center gap-1 justify-center" onClick={onEdit}>
          <EditIcon size={18} /> Edit
        </button>
        <button className="w-1/2 border border-blue-700 text-blue-700 py-2 rounded-xl font-bold hover:bg-blue-50 flex items-center gap-1 justify-center" onClick={onShare}>
          <Share2Icon size={18} /> Share Live
        </button>
      </div>
    </div>
  );
}




