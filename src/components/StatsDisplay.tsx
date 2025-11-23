import { Activity, ArrowDown, ArrowUp, AlertCircle, Clock } from "lucide-react";
import { PingResult, DownloadResult, UploadResult } from "@/lib/speedtest-client";

interface StatsDisplayProps {
  ping: PingResult | null;
  download: DownloadResult | null;
  upload: UploadResult | null;
  isVisible: boolean;
}

export const StatsDisplay = ({ ping, download, upload, isVisible }: StatsDisplayProps) => {
  const stats = [
    {
      icon: Activity,
      label: "Ping",
      value: ping?.latency ?? null,
      unit: "ms",
      color: "text-primary",
      details: ping ? (
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {ping.jitter > 0 && <div>Jitter: {ping.jitter.toFixed(1)} ms</div>}
          {ping.packetLoss !== undefined && ping.packetLoss > 0 && (
            <div className="flex items-center gap-1 text-yellow-500">
              <AlertCircle className="w-3 h-3" />
              Загуба: {ping.packetLoss.toFixed(1)}%
            </div>
          )}
          {ping.minLatency !== undefined && ping.maxLatency !== undefined && (
            <div>Min/Max: {ping.minLatency.toFixed(0)}/{ping.maxLatency.toFixed(0)} ms</div>
          )}
        </div>
      ) : null,
    },
    {
      icon: ArrowDown,
      label: "Download",
      value: download?.throughput ?? null,
      unit: "Mbps",
      color: "text-accent",
      details: download ? (
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {download.ttfb !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              TTFB: {download.ttfb.toFixed(0)} ms
            </div>
          )}
          {download.speedVariance !== undefined && download.speedVariance > 10 && (
            <div className="text-yellow-500">
              Вариация: {download.speedVariance.toFixed(1)}%
            </div>
          )}
        </div>
      ) : null,
    },
    {
      icon: ArrowUp,
      label: "Upload",
      value: upload?.throughput ?? null,
      unit: "Mbps",
      color: "text-primary",
      details: upload?.speedVariance !== undefined && upload.speedVariance > 10 ? (
        <div className="text-xs text-muted-foreground mt-1">
          <div className="text-yellow-500">
            Вариация: {upload.speedVariance.toFixed(1)}%
          </div>
        </div>
      ) : null,
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl mx-auto px-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-3 animate-fade-in-up min-h-[100px] sm:min-h-0"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <stat.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color}`} strokeWidth={2} />
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground font-light mb-1">
              {stat.label}
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {stat.value !== null ? (
                <>
                  {stat.value.toFixed(stat.unit === "ms" ? 0 : 1)}
                  <span className="text-base sm:text-lg text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </div>
            {stat.details}
          </div>
        </div>
      ))}
    </div>
  );
};
