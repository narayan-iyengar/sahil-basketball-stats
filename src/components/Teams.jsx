import React, { useEffect, useState } from "react";
import { db, auth, provider, rtdb } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { EditIcon, TrashIcon, PlusIcon, XIcon, SaveIcon } from "lucide-react";

export default function Teams({ onClose }) {
  const [teams, setTeams] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    getDocs(collection(db, "teams")).then((snap) =>
      console.log("Teams snap:", snap.docs.map((d) => d.data()));
       setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const addTeam = async () => {
    if (!newName) return;
    const docRef = await addDoc(collection(db, "teams"), { name: newName });
    setTeams([...teams, { id: docRef.id, name: newName }]);
    setNewName("");
  };

  const startEdit = (id, name) => {
    setEditingId(id);
    setEditingValue(name);
  };

  const saveEdit = async () => {
    await updateDoc(doc(db, "teams", editingId), { name: editingValue });
    setTeams(teams.map((t) => (t.id === editingId ? { ...t, name: editingValue } : t)));
    setEditingId(null);
    setEditingValue("");
  };

  const removeTeam = async (id) => {
    await deleteDoc(doc(db, "teams", id));
    setTeams(teams.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg max-w-md w-full relative">
        <button className="absolute top-2 right-2" onClick={onClose}><XIcon /></button>
        <h2 className="text-xl font-bold mb-4">Teams</h2>
        <div className="space-y-2">
          {teams.map((t) =>
            editingId === t.id ? (
              <div key={t.id} className="flex gap-2">
                <input
                  className="border rounded p-2 flex-1"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                />
                <button className="bg-green-500 text-white px-3 rounded" onClick={saveEdit}><SaveIcon size={16} /></button>
                <button className="bg-gray-300 px-3 rounded" onClick={() => setEditingId(null)}><XIcon size={16} /></button>
              </div>
            ) : (
              <div key={t.id} className="flex items-center gap-2 justify-between bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                <span>{t.name}</span>
                <div className="flex gap-1">
                  <button className="p-1" onClick={() => startEdit(t.id, t.name)}><EditIcon size={16} /></button>
                  <button className="p-1 text-red-600" onClick={() => removeTeam(t.id)}><TrashIcon size={16} /></button>
                </div>
              </div>
            )
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Add new team"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="bg-blue-700 text-white px-4 rounded" onClick={addTeam}><PlusIcon size={18} /></button>
        </div>
      </div>
    </div>
  );
}

