/**
 * Connection Diagnostics Component
 */

import { ConnectionQuality } from '@/lib/speedtest-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface DiagnosticsProps {
  quality: ConnectionQuality | null;
  isVisible: boolean;
}

export const Diagnostics = ({ quality, isVisible }: DiagnosticsProps) => {
  if (!isVisible || !quality) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number): 'success' | 'warning' | 'destructive' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  return (
    <Card className="p-6 bg-background/50 backdrop-blur max-w-2xl w-full mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Диагностика на връзката</h3>
      </div>

      <div className="space-y-4">
        {/* Stability Score */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            {quality.isStable ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <div className="text-sm font-medium">Оценка на стабилността</div>
              <div className="text-xs text-muted-foreground">
                {quality.isStable ? 'Стабилна връзка' : 'Нестабилна връзка'}
              </div>
            </div>
          </div>
          <Badge variant={getScoreBadge(quality.stabilityScore)} className="text-lg px-3 py-1">
            {quality.stabilityScore}/100
          </Badge>
        </div>

        {/* Recommendations */}
        {quality.recommendations.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Препоръки
            </div>
            <ul className="space-y-2">
              {quality.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

