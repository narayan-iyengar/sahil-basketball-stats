import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PauseCircleIcon, PlayCircleIcon, SkipForwardIcon, SaveIcon } from "lucide-react";

const statLabels = [
  { key: "points", label: "PTS" },
  { key: "fg2m", label: "2PT Made" },
  { key: "fg3m", label: "3PT Made" },
  { key: "ftm", label: "FT Made" },
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

export default function StatEntry({ gameId, onDone }) {
  const [stats, setStats] = useState({});
  const [game, setGame] = useState(null);
  const [score, setScore] = useState({ team: 0, opponent: 0 });
  const [saving, setSaving] = useState(false);
  const timerRef = useRef();
  const [clock, setClock] = useState(0);
  const [clockRunning, setClockRunning] = useState(false);
  const [period, setPeriod] = useState(1);

  useEffect(() => {
    getDoc(doc(db, "games", gameId)).then((snap) => {
      const d = snap.data();
      setStats(d.stats || {});
      setScore({ team: d.scoreTeam ?? 0, opponent: d.scoreOpponent ?? 0 });
      setGame(d);
      setClock(d.clockRemaining ?? (d.periodLength || 8) * 60);
      setClockRunning(d.clockRunning || false);
      setPeriod(d.period || 1);
    });
  }, [gameId]);

  // Handle clock
  useEffect(() => {
    if (clockRunning) {
      timerRef.current = setInterval(() => {
        setClock((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            setClockRunning(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [clockRunning]);

  const handleStat = (key, delta) => {
    setStats((s) => ({ ...s, [key]: Math.max(0, (s[key] || 0) + delta) }));
    // For live game, auto-start clock on score
    if (game?.mode === "live" && !clockRunning && delta > 0 && ["points", "fg2m", "fg3m", "ftm"].includes(key)) {
      setClockRunning(true);
    }
  };

  const saveStats = async () => {
    setSaving(true);
    await updateDoc(doc(db, "games", gameId), {
      stats,
      scoreTeam: Number(score.team),
      scoreOpponent: Number(score.opponent),
      clockRemaining: clock,
      clockRunning,
      period,
    });
    setSaving(false);
    onDone && onDone();
  };

  const toggleClock = () => {
    setClockRunning((r) => !r);
    updateDoc(doc(db, "games", gameId), {
      clockRunning: !clockRunning,
    });
  };

  const advancePeriod = () => {
    // End current period, advance to next and reset clock
    let newPeriod = period + 1;
    let maxPeriods = game?.periodType === "halves" ? 2 : 4;
    if (newPeriod > maxPeriods) newPeriod = maxPeriods;
    setPeriod(newPeriod);
    setClock(game?.periodLength * 60 || 480);
    setClockRunning(false);
    updateDoc(doc(db, "games", gameId), {
      period: newPeriod,
      clockRemaining: game?.periodLength * 60 || 480,
      clockRunning: false,
    });
  };

  if (!game) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-md mx-auto mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-2 text-center">{game.teamName} vs {game.opponent}</h2>
      <div className="flex justify-between mb-2">
        <span className="font-semibold text-lg">{game.date} {game.time}</span>
        {game.mode === "live" && (
          <span className="bg-orange-100 dark:bg-orange-700 text-orange-800 dark:text-orange-100 rounded px-3 py-1 text-xs font-bold uppercase">
            Live
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-xl">{score.team} <span className="text-gray-400 font-bold">-</span> {score.opponent}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Score</div>
        </div>
        <div className="flex gap-2 items-center">
          <input type="number" min="0" className="border rounded p-1 w-14 text-center"
            value={score.team}
            onChange={e => setScore(s => ({ ...s, team: e.target.value }))}
          />
          <span className="font-bold">-</span>
          <input type="number" min="0" className="border rounded p-1 w-14 text-center"
            value={score.opponent}
            onChange={e => setScore(s => ({ ...s, opponent: e.target.value }))}
          />
        </div>
      </div>
      {game.mode === "live" && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900 rounded p-3 mb-2">
          <span className="font-semibold">Period {period} / {game.periodType === "halves" ? 2 : 4}</span>
          <span className="text-2xl font-bold tabular-nums">{secondsToMMSS(clock)}</span>
          <div className="flex gap-2">
            <button onClick={toggleClock} className="p-1">
              {clockRunning ? <PauseCircleIcon className="text-blue-600" size={28} /> : <PlayCircleIcon className="text-blue-600" size={28} />}
            </button>
            <button onClick={advancePeriod} className="p-1" title="Next Period">
              <SkipForwardIcon size={26} />
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {statLabels.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</span>
            <div className="flex items-center gap-2">
              <button
                className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-lg flex items-center justify-center"
                onClick={() => handleStat(key, -1)}
              >–</button>
              <span className="text-xl font-bold w-8 text-center">{stats[key] || 0}</span>
              <button
                className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center"
                onClick={() => handleStat(key, 1)}
              >+</button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="mt-2 w-full bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 flex items-center justify-center gap-2"
        onClick={saveStats}
        disabled={saving}
      >
        <SaveIcon /> {saving ? "Saving..." : "Save & Finish"}
      </button>
    </div>
  );
}




