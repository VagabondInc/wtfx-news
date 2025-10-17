import React, { useState, useEffect } from 'react';
import { DownloadService } from '../services/downloadService';

interface DownloadStatusProps {
  downloadService: DownloadService;
}

export const DownloadStatus: React.FC<DownloadStatusProps> = ({ downloadService }) => {
  const [stats, setStats] = useState(downloadService.getDownloadStats());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(downloadService.getDownloadStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [downloadService]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanup = () => {
    downloadService.cleanupOldDownloads(30);
    setStats(downloadService.getDownloadStats());
  };

  const handleExport = () => {
    const exportData = downloadService.exportDownloadList();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wtfx-downloads-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (stats.totalAssets === 0) {
    return null; // Don't show if no downloads yet
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg overflow-hidden">
        {/* Compact Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">
              💾 {stats.totalAssets} assets saved
            </span>
          </div>
          <div className="text-slate-400 text-xs">
            {formatFileSize(stats.totalSize)}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-slate-600 p-4 bg-slate-900">
            <h3 className="text-white font-bold mb-3">Download Status</h3>
            
            {/* Asset Type Breakdown */}
            <div className="space-y-2 mb-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-slate-300 capitalize">
                    {type === 'image' ? '🖼️' : type === 'video' ? '🎬' : '🎵'} {type}s:
                  </span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            </div>

            {/* Download Info */}
            <div className="text-xs text-slate-400 space-y-1 mb-4">
              <div>Total Size: {formatFileSize(stats.totalSize)}</div>
              {stats.newestDownload && (
                <div>
                  Latest: {new Date(stats.newestDownload).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={handleCleanup}
                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                title="Remove downloads older than 30 days"
              >
                🧹 Cleanup
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                title="Export download list as JSON"
              >
                📤 Export
              </button>
            </div>

            {/* Warning */}
            <div className="mt-3 p-2 bg-amber-900/50 border border-amber-600/30 rounded text-xs text-amber-200">
              <div className="font-medium mb-1">⚠️ Auto-Download Active</div>
              <div>All generated assets are automatically saved locally to prevent loss after 1-hour server expiration.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 