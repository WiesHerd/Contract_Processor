import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, Zap, Clock, Database } from 'lucide-react';
import { cacheUtils, CacheStats } from '@/utils/cacheManager';

interface CachePerformanceDashboardProps {
  className?: string;
}

export const CachePerformanceDashboard: React.FC<CachePerformanceDashboardProps> = ({ className }) => {
  const [stats, setStats] = useState<Record<string, CacheStats>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCache, setSelectedCache] = useState<string | null>(null);

  const refreshStats = () => {
    setIsRefreshing(true);
    const newStats = cacheUtils.getCacheStats() as Record<string, CacheStats>;
    setStats(newStats);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getOverallStats = () => {
    const cacheTypes = Object.keys(stats);
    if (cacheTypes.length === 0) return null;

    const totalHits = cacheTypes.reduce((sum, type) => sum + stats[type].hits, 0);
    const totalMisses = cacheTypes.reduce((sum, type) => sum + stats[type].misses, 0);
    const totalSize = cacheTypes.reduce((sum, type) => sum + stats[type].size, 0);
    const overallHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      totalHits,
      totalMisses,
      totalSize,
      overallHitRate,
      cacheCount: cacheTypes.length,
    };
  };

  const overallStats = getOverallStats();

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 0.8) return 'text-green-600';
    if (hitRate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHitRateBadge = (hitRate: number) => {
    if (hitRate >= 0.8) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (hitRate >= 0.6) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Cache Performance Dashboard</h2>
        </div>
        <Button
          onClick={refreshStats}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Overall Performance */}
      {overallStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Overall Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{overallStats.cacheCount}</div>
                <div className="text-sm text-gray-600">Active Caches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{overallStats.totalHits.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Hits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{overallStats.totalMisses.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Misses</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getHitRateColor(overallStats.overallHitRate)}`}>
                  {(overallStats.overallHitRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Hit Rate</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={overallStats.overallHitRate * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Cache Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(stats).map(([cacheType, cacheStats]) => (
          <Card
            key={cacheType}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCache === cacheType ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedCache(selectedCache === cacheType ? null : cacheType)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="capitalize">{cacheType}</span>
                </div>
                {getHitRateBadge(cacheStats.hitRate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Hit Rate */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Hit Rate</span>
                    <span className={`font-semibold ${getHitRateColor(cacheStats.hitRate)}`}>
                      {(cacheStats.hitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={cacheStats.hitRate * 100} className="h-2" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Hits</div>
                    <div className="font-semibold text-green-600">{cacheStats.hits.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Misses</div>
                    <div className="font-semibold text-red-600">{cacheStats.misses.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Size</div>
                    <div className="font-semibold">{cacheStats.size}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Avg Age</div>
                    <div className="font-semibold">{formatTime(cacheStats.averageAge)}</div>
                  </div>
                </div>

                {/* Cache Actions */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      cacheUtils.invalidateCache(cacheType);
                      refreshStats();
                    }}
                  >
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-500" />
            <span>Performance Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-semibold text-green-600">✓ Good Performance</div>
              <ul className="text-gray-600 space-y-1">
                <li>• Hit rates above 80%</li>
                <li>• Cache sizes under limits</li>
                <li>• Regular cache cleanup</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-red-600">⚠ Areas for Improvement</div>
              <ul className="text-gray-600 space-y-1">
                <li>• Hit rates below 60%</li>
                <li>• Large cache sizes</li>
                <li>• High miss rates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 