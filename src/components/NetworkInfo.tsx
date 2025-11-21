import { useEffect, useState } from "react";
import { Globe, MapPin, Wifi, Clock, AlertCircle, Loader2 } from "lucide-react";

interface IPInfo {
  ip: string;
  country?: string;
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  isp?: string;
  timezone?: string;
  accuracy?: string;
  error?: string;
  message?: string;
}

interface NetworkInfoProps {
  className?: string;
}

// Country code to flag emoji mapping
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
};

export const NetworkInfo = ({ className = "" }: NetworkInfoProps) => {
  const [info, setInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIPInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine API URL (use same host and port logic as WebSocket)
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        // For production domain, use same port; for localhost, use 3001
        const port = host.includes('speedflux.hashmatrix.dev') ? '' : ':3001';
        const apiUrl = `${protocol}//${host}${port}/info`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: IPInfo = await response.json();
        setInfo(data);
      } catch (err) {
        console.error("Failed to fetch IP info:", err);
        setError(err instanceof Error ? err.message : "Failed to load network information");
      } finally {
        setLoading(false);
      }
    };

    fetchIPInfo();
  }, []);

  if (loading) {
    return (
      <div className={`glass rounded-xl sm:rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading network information...</span>
        </div>
      </div>
    );
  }

  if (error || (info && info.error)) {
    return (
      <div className={`glass rounded-xl sm:rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <div>
            <div className="font-semibold">Unable to load network information</div>
            <div className="text-sm text-muted-foreground mt-1">
              {error || info?.error || info?.message || "Network information is not available"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!info) {
    return null;
  }

  return (
    <div className={`glass rounded-xl sm:rounded-2xl p-4 sm:p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Network Information</h3>
        </div>

        {/* IP Address */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Wifi className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Public IP Address</div>
            <div className="text-sm font-mono font-medium break-all">{info.ip}</div>
          </div>
        </div>

        {/* Location */}
        {(info.country || info.city) && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Location</div>
              <div className="flex items-center gap-2">
                {info.countryCode && (
                  <span className="text-lg" title={info.country}>
                    {getCountryFlag(info.countryCode)}
                  </span>
                )}
                <div className="text-sm font-medium">
                  {info.city && info.country ? (
                    <>
                      {info.city}, {info.country}
                    </>
                  ) : info.country ? (
                    info.country
                  ) : info.city ? (
                    info.city
                  ) : (
                    "Unknown"
                  )}
                </div>
              </div>
              {info.accuracy && (
                <div className="text-xs text-muted-foreground mt-1">{info.accuracy}</div>
              )}
            </div>
          </div>
        )}

        {/* ISP / ASN */}
        {(info.isp || info.asn) && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Wifi className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">ISP / Network</div>
              <div className="text-sm font-medium">
                {info.isp || "Unknown"}
                {info.asn && (
                  <span className="text-muted-foreground ml-2">(AS{info.asn})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timezone */}
        {info.timezone && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Timezone</div>
              <div className="text-sm font-medium">{info.timezone}</div>
            </div>
          </div>
        )}

        {/* Coordinates (if available) */}
        {info.latitude && info.longitude && (
          <div className="flex items-start gap-3 pt-2 border-t border-border/50">
            <div className="mt-0.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Coordinates</div>
              <div className="text-xs font-mono">
                {info.latitude.toFixed(4)}, {info.longitude.toFixed(4)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

