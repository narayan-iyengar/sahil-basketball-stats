import React, { useEffect, useState } from "react";
import { db, auth, provider, rtdb } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { XIcon } from "lucide-react";

export default function GameOnboarding({ onGameCreated, onCancel }) {
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState([]);
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [mode, setMode] = useState("live");
  const [periodType, setPeriodType] = useState("quarters");
  const [periodLength, setPeriodLength] = useState(8);

  useEffect(() => {
    getDocs(collection(db, "teams")).then((snap) => {
      console.log("Teams snap:", snap.docs.map((d) => d.data()));
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeams(arr);
      if (arr.length) setTeamId(arr[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Make random live share id:
    const liveShareId = Math.random().toString(36).slice(2, 10);
    const docRef = await addDoc(collection(db, "games"), {
      teamId,
      teamName: teams.find((t) => t.id === teamId)?.name || "",
      opponent,
      date,
      time,
      mode,
      periodType,
      periodLength,
      period: 1,
      clockRunning: false,
      clockRemaining: periodLength * 60,
      liveShareId,
      stats: {},
      createdAt: new Date().toISOString(),
    });
    onGameCreated(docRef.id);
  };

  return (
    <form className="p-6 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg mt-8 space-y-4 relative" onSubmit={handleSubmit}>
      <button type="button" className="absolute top-2 right-2" onClick={onCancel}><XIcon /></button>
      <h2 className="text-2xl font-bold text-center mb-2">New Game</h2>
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Select Team</label>
        <select
          className="w-full rounded border p-2"
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
          required
        >
          {teams.map((t) => (
            <option value={t.id} key={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Opponent</label>
        <input className="w-full rounded border p-2" value={opponent} onChange={e => setOpponent(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Date</label>
          <input type="date" className="w-full rounded border p-2" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="flex-1">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Time</label>
          <input type="time" className="w-full rounded border p-2" value={time} onChange={e => setTime(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "live"} onChange={() => setMode("live")} />
          Live
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "past"} onChange={() => setMode("past")} />
          Past
        </label>
      </div>
      <div className="flex gap-2 items-center">
        <label className="font-medium mr-2">Periods:</label>
        <select className="rounded border p-1" value={periodType} onChange={e => setPeriodType(e.target.value)}>
          <option value="quarters">4 Quarters</option>
          <option value="halves">2 Halves</option>
        </select>
        <span className="ml-2">Each</span>
        <input type="number" className="rounded border p-1 w-14 mx-2" value={periodLength} min={1} max={30}
          onChange={e => setPeriodLength(Number(e.target.value))} required
        />
        <span>minutes</span>
      </div>
      <button className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold hover:bg-blue-800 mt-4">Create Game</button>
    </form>
  );
}

