// Simplified Photo System - URL-based instead of file storage
import React, { useState } from "react";

// Camera/Photo icon
const PhotoIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LinkIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

// Simple photo URL management
export const PhotoManager = ({ gameId, photos = [], onPhotosUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoDescription, setNewPhotoDescription] = useState("");

  const addPhotoUrl = () => {
    if (!newPhotoUrl.trim()) return;
    
    // Basic URL validation
    try {
      new URL(newPhotoUrl.trim());
    } catch (error) {
      alert("Please enter a valid URL");
      return;
    }
    
    // Check if it's an iCloud link and warn user
    const isICloudLink = newPhotoUrl.includes('icloud.com');
    
    const photoData = {
      id: Date.now() + Math.random(),
      url: newPhotoUrl.trim(),
      description: newPhotoDescription.trim() || "Game photo",
      timestamp: new Date().toISOString(),
      isICloudLink: isICloudLink
    };
    
    if (isICloudLink) {
      const confirmed = window.confirm(
        "⚠️ iCloud links only work for people signed into your iCloud account.\n\n" +
        "For family sharing, consider:\n" +
        "• Google Photos (shareable links)\n" +
        "• iCloud Shared Albums\n" +
        "• Dropbox/OneDrive public links\n\n" +
        "Continue with iCloud link anyway?"
      );
      if (!confirmed) return;
    }
    
    try {
      const updatedPhotos = [...photos, photoData];
      onPhotosUpdate(gameId, updatedPhotos);
      
      setNewPhotoUrl("");
      setNewPhotoDescription("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding photo:", error);
      alert("Error adding photo. Please try again.");
    }
  };

  const removePhoto = (photoId) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    onPhotosUpdate(gameId, updatedPhotos);
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📸 Game Photos</h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          <LinkIcon className="w-3 h-3" />
          Add Photo
        </button>
      </div>
      
      {showAddForm && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
          <input
            type="url"
            placeholder="Paste photo URL (Google Photos, iCloud, etc.)"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Photo description (optional)"
            value={newPhotoDescription}
            onChange={(e) => setNewPhotoDescription(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={addPhotoUrl}
              disabled={!newPhotoUrl.trim()}
              className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPhotoUrl("");
                setNewPhotoDescription("");
              }}
              className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            💡 <strong>Best for family sharing:</strong> Google Photos, iCloud Shared Albums, Dropbox
            <br />
            📱 <strong>iCloud links:</strong> Only work for people signed into your iCloud account
          </div>
        </div>
      )}
      
      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <img
                src={photo.url}
                alt={photo.description}
                className="w-12 h-12 object-cover rounded cursor-pointer"
                onClick={() => window.open(photo.url, '_blank')}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzYiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {photo.description}
                  {photo.isICloudLink && (
                    <span className="ml-1 text-xs text-blue-500" title="iCloud link - only visible to account owner">
                      ☁️
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(photo.timestamp).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => removePhoto(photo.id)}
                className="p-1 text-red-400 hover:text-red-600 rounded"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {photos.length === 0 && !showAddForm && (
        <div className="text-center py-2 text-gray-500 dark:text-gray-400 text-xs">
          No photos yet. Add some game memories!
        </div>
      )}
    </div>
  );
};

// Photo thumbnail display for collapsed view
export const PhotoThumbnails = ({ photos = [] }) => {
  if (photos.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1 mt-1">
      <PhotoIcon className="w-3 h-3 text-gray-500" />
      <span className="text-xs text-gray-600 dark:text-gray-300">
        {photos.length} photo{photos.length !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-0.5">
        {photos.slice(0, 2).map((photo) => (
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.description}
            className="w-4 h-4 object-cover rounded cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.open(photo.url, '_blank');
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ))}
        {photos.length > 2 && (
          <span className="text-xs text-gray-500">+{photos.length - 2}</span>
        )}
      </div>
    </div>
  );
};

// Legacy support - rename PhotoUpload to PhotoManager
export const PhotoUpload = PhotoManager;