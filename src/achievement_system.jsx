// Achievement Badge System
import React from "react";

// Badge definitions
export const ACHIEVEMENT_BADGES = {
  DOUBLE_DIGITS: {
    id: 'double_digits',
    name: 'Double Digits',
    emoji: '🏀',
    description: '10+ points in a game',
    check: (stats) => (stats.points || 0) >= 10
  },
  BIG_GAME: {
    id: 'big_game',
    name: 'Big Game',
    emoji: '🔥',
    description: '20+ points in a game',
    check: (stats) => (stats.points || 0) >= 20
  },
  PERFECT_SHOOTER: {
    id: 'perfect_shooter',
    name: 'Perfect Shooter',
    emoji: '💯',
    description: '100% shooting (3+ attempts)',
    check: (stats) => {
      const totalMade = (stats.fg2m || 0) + (stats.fg3m || 0);
      const totalAtt = (stats.fg2a || 0) + (stats.fg3a || 0);
      return totalAtt >= 3 && totalMade === totalAtt;
    }
  },
  PERFECT_FREE_THROWS: {
    id: 'perfect_free_throws',
    name: 'Perfect Free Throws',
    emoji: '🎯',
    description: '100% free throws (3+ attempts)',
    check: (stats) => {
      const ftm = stats.ftm || 0;
      const fta = stats.fta || 0;
      return fta >= 3 && ftm === fta;
    }
  },
  SHARPSHOOTER: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    emoji: '🎯',
    description: '3+ three-pointers made',
    check: (stats) => (stats.fg3m || 0) >= 3
  },
  PLAYMAKER: {
    id: 'playmaker',
    name: 'Playmaker',
    emoji: '🤝',
    description: '5+ assists in a game',
    check: (stats) => (stats.assists || 0) >= 5
  },
  DEFENDER: {
    id: 'defender',
    name: 'Defender',
    emoji: '🛡️',
    description: '3+ steals or blocks',
    check: (stats) => (stats.steals || 0) + (stats.blocks || 0) >= 3
  },
  HUSTLE: {
    id: 'hustle',
    name: 'Hustle',
    emoji: '💪',
    description: '10+ rebounds in a game',
    check: (stats) => (stats.rebounds || 0) >= 10
  },
  TRIPLE_DOUBLE: {
    id: 'triple_double',
    name: 'Triple Double',
    emoji: '⭐',
    description: '10+ in three stat categories',
    check: (stats) => {
      const statValues = [
        stats.points || 0,
        stats.rebounds || 0,
        stats.assists || 0,
        stats.steals || 0,
        stats.blocks || 0
      ];
      return statValues.filter(val => val >= 10).length >= 3;
    }
  },
  NO_TURNOVERS: {
    id: 'no_turnovers',
    name: 'Clean Game',
    emoji: '✨',
    description: 'Zero turnovers',
    check: (stats) => (stats.turnovers || 0) === 0
  },
  ASSIST_MACHINE: {
    id: 'assist_machine',
    name: 'Assist Machine',
    emoji: '🎪',
    description: '8+ assists in a game',
    check: (stats) => (stats.assists || 0) >= 8
  }
};

// Function to get all earned badges for a game
export const getEarnedBadges = (gameStats) => {
  const earnedBadges = [];
  
  Object.values(ACHIEVEMENT_BADGES).forEach(badge => {
    if (badge.check(gameStats)) {
      earnedBadges.push(badge);
    }
  });
  
  return earnedBadges;
};

// Badge component for displaying individual badges
export const Badge = ({ badge, size = "sm" }) => {
  const sizeClasses = {
    xs: "text-xs px-1 py-0.5",
    sm: "text-sm px-2 py-1", 
    md: "text-base px-3 py-1.5",
    lg: "text-lg px-4 py-2"
  };
  
  return (
    <span 
      className={`inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full font-medium ${sizeClasses[size]}`}
      title={badge.description}
    >
      <span>{badge.emoji}</span>
      <span className="hidden sm:inline">{badge.name}</span>
    </span>
  );
};

// Badge summary component for collapsed view
export const BadgeSummary = ({ badges }) => {
  if (badges.length === 0) return null;
  
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">🏆</span>
      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
        {badges.length} achievement{badges.length !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-0.5">
        {badges.slice(0, 3).map((badge, index) => (
          <span key={badge.id} className="text-sm" title={badge.name}>
            {badge.emoji}
          </span>
        ))}
        {badges.length > 3 && (
          <span className="text-xs text-gray-500">+{badges.length - 3}</span>
        )}
      </div>
    </div>
  );
};

// Full badge display for expanded view
export const BadgeDisplay = ({ badges }) => {
  if (badges.length === 0) {
    return (
      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-center text-gray-500 dark:text-gray-400 text-sm">
        No achievements this game
      </div>
    );
  }
  
  return (
    <div className="mt-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🏆 Achievements</h4>
      <div className="flex flex-wrap gap-1">
        {badges.map(badge => (
          <Badge key={badge.id} badge={badge} size="sm" />
        ))}
      </div>
    </div>
  );
};