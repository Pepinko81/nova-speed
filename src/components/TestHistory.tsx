/**
 * Test History Component
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Trash2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getTestHistory, clearTestHistory, getHistoryStats, TestHistoryEntry } from '@/lib/test-history';
import { format } from 'date-fns';
import { bg } from 'date-fns/locale';

export const TestHistory = () => {
  const [history, setHistory] = useState<TestHistoryEntry[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getHistoryStats> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const h = getTestHistory();
    setHistory(h);
    setStats(getHistoryStats());
  };

  const handleClear = () => {
    if (confirm('Сигурни ли сте, че искате да изтриете цялата история?')) {
      clearTestHistory();
      loadHistory();
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <History className="w-4 h-4" />
        История ({history.length})
      </Button>
    );
  }

  return (
    <Card className="p-6 bg-background/50 backdrop-blur max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          История на тестовете
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Изтрий
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Затвори
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Общо тестове</div>
            <div className="text-2xl font-bold">{stats.totalTests}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Среден Download</div>
            <div className="text-2xl font-bold">{stats.avgDownload.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Mbps</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Среден Upload</div>
            <div className="text-2xl font-bold">{stats.avgUpload.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Mbps</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Среден Ping</div>
            <div className="text-2xl font-bold">{stats.avgPing.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">ms</div>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Все още няма история на тестове
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">
                  {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm', { locale: bg })}
                </div>
                {entry.operator && (
                  <div className="text-xs text-muted-foreground">{entry.operator}</div>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Ping</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {entry.ping.toFixed(0)} ms
                  </div>
                  {entry.jitter > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Jitter: {entry.jitter.toFixed(1)} ms
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Download</div>
                  <div className="font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {entry.download.toFixed(1)} Mbps
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Upload</div>
                  <div className="font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {entry.upload.toFixed(1)} Mbps
                  </div>
                </div>
                {entry.packetLoss !== undefined && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Packet Loss</div>
                    <div className="font-semibold">
                      {entry.packetLoss.toFixed(1)}%
                    </div>
                  </div>
                )}
                {entry.ttfb !== undefined && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">TTFB</div>
                    <div className="font-semibold">
                      {entry.ttfb.toFixed(0)} ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

