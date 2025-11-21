import { Activity, ArrowDown, ArrowUp } from "lucide-react";

interface StatsDisplayProps {
  ping: number | null;
  download: number | null;
  upload: number | null;
  isVisible: boolean;
}

export const StatsDisplay = ({ ping, download, upload, isVisible }: StatsDisplayProps) => {
  const stats = [
    {
      icon: Activity,
      label: "Ping",
      value: ping,
      unit: "ms",
      color: "text-primary",
    },
    {
      icon: ArrowDown,
      label: "Download",
      value: download,
      unit: "Mbps",
      color: "text-accent",
    },
    {
      icon: ArrowUp,
      label: "Upload",
      value: upload,
      unit: "Mbps",
      color: "text-primary",
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mx-auto transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-3 animate-fade-in-up"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <stat.icon className={`w-8 h-8 ${stat.color}`} strokeWidth={2} />
          <div className="text-center">
            <div className="text-sm text-muted-foreground font-light mb-1">
              {stat.label}
            </div>
            <div className="text-3xl font-bold">
              {stat.value !== null ? (
                <>
                  {stat.value.toFixed(stat.unit === "ms" ? 0 : 1)}
                  <span className="text-lg text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
