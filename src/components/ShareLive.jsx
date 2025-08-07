import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { XIcon } from "lucide-react";

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

function secondsToMMSS(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ShareLive({ gameId, onClose }) {
  const [game, setGame] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => setGame(snap.data()));
    return () => unsub();
  }, [gameId]);

  if (!game) return <div className="text-center py-12">Loading live game...</div>;

  const url = `${window.location.origin}/live/${game.liveShareId || gameId}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-md relative">
        <button className="absolute top-2 right-2" onClick={onClose}><XIcon /></button>
        <div className="text-lg font-bold text-blue-700 dark:text-orange-400 mb-2">Live Game</div>
        <div className="mb-2 text-gray-700 dark:text-gray-300">{game.teamName} vs {game.opponent}</div>
        <div className="mb-2 font-semibold">Score: {game.scoreTeam} - {game.scoreOpponent}</div>
        <div className="mb-4 font-mono text-xl">
          Period {game.period} / {game.periodType === "halves" ? 2 : 4} &nbsp; | &nbsp; 
          <span className="tabular-nums">{secondsToMMSS(game.clockRemaining ?? 0)}</span>
        </div>
        <div className="text-sm text-gray-500 mb-4">Share this link:</div>
        <input className="w-full border rounded-lg p-2 mb-4" value={url} readOnly onFocus={e => e.target.select()} />
        <div className="border-t pt-4">
          {statLabels.map(({ key, label }) => (
            <div key={key} className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
              <span>{label}</span>
              <span className="font-semibold">{(game.stats && game.stats[key]) || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}




