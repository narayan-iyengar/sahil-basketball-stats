import React from "react";

export default function DeleteConfirmationModal({ onConfirm, onCancel, message }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Are you sure?</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message || "This action cannot be undone. All stats for this game will be permanently deleted."}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}

