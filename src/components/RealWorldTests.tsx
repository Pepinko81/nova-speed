/**
 * Real-World Tests Component
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Video, Gamepad2, Phone } from 'lucide-react';
import { PingResult, DownloadResult, UploadResult, ConnectionQuality } from '@/lib/speedtest-client';
import { testStreaming, testGaming, testVideoCall } from '@/lib/real-world-tests';

interface RealWorldTestsProps {
  ping: PingResult | null;
  download: DownloadResult | null;
  upload: UploadResult | null;
  quality: ConnectionQuality | null;
  isVisible: boolean;
}

export const RealWorldTests = ({
  ping,
  download,
  upload,
  quality,
  isVisible,
}: RealWorldTestsProps) => {
  if (!isVisible || !ping || !download || !upload || !quality) return null;

  const streamingResult = testStreaming(download, ping);
  const gamingResult = testGaming(ping, download);
  const videoCallResult = testVideoCall(upload, ping, quality);

  const tests = [
    {
      icon: Video,
      title: 'Streaming',
      result: streamingResult,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Gamepad2,
      title: 'Gaming',
      result: gamingResult,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Phone,
      title: 'Video Call',
      result: videoCallResult,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <Card className="p-6 bg-background/50 backdrop-blur max-w-4xl w-full mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Реални сценарии</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tests.map((test) => {
          const Icon = test.icon;
          const result = test.result as any;
          const score = result.overallScore || result.score || 0;
          const suitable = result.suitable !== undefined ? result.suitable : score >= 70;

          return (
            <div
              key={test.title}
              className={`p-4 rounded-lg border ${test.bgColor} border-border/50`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${test.color}`} />
                <h4 className="font-semibold">{test.title}</h4>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Оценка</span>
                  <Badge
                    variant={suitable ? 'success' : score >= 50 ? 'warning' : 'destructive'}
                  >
                    {score}/100
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">{result.message}</p>

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.recommendations.slice(0, 2).map((rec: string, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span>•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.recommendedQuality && (
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Препоръчано качество: </span>
                    <span className="font-medium">{result.recommendedQuality}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

