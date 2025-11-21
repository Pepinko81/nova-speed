import { useEffect, useState } from "react";

interface SpeedMeterProps {
  speed: number;
  maxSpeed: number;
  isTesting: boolean;
}

export const SpeedMeter = ({ speed, maxSpeed, isTesting }: SpeedMeterProps) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  
  useEffect(() => {
    setDisplaySpeed(speed);
  }, [speed]);

  const percentage = Math.min((displaySpeed / maxSpeed) * 100, 100);
  const rotation = (percentage / 100) * 270 - 135; // -135 to 135 degrees

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square flex items-center justify-center">
      {/* Background glow */}
      <div className="absolute inset-0 gradient-radial opacity-50" />
      
      {/* Orbiting particles */}
      {isTesting && (
        <>
          <div className="absolute w-3 h-3 bg-primary rounded-full glow animate-orbit" style={{ animationDelay: '0s' }} />
          <div className="absolute w-2 h-2 bg-accent rounded-full glow animate-orbit" style={{ animationDelay: '5s' }} />
          <div className="absolute w-2.5 h-2.5 bg-primary rounded-full glow animate-orbit" style={{ animationDelay: '10s' }} />
        </>
      )}
      
      {/* Gauge container */}
      <div className="relative w-[90%] aspect-square">
        {/* Outer ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background arc */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="hsl(var(--gauge-trail))"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="400 400"
            strokeDashoffset="67"
          />
          
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="400 400"
            strokeDashoffset={67 + (400 - 67) * (1 - percentage / 100)}
            className="transition-all duration-500 ease-out"
            style={{
              filter: isTesting ? 'drop-shadow(0 0 8px hsl(var(--speed-glow)))' : 'none'
            }}
          />
          
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--speed-gradient-start))" />
              <stop offset="100%" stopColor="hsl(var(--speed-gradient-end))" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className={`text-6xl md:text-7xl font-bold mb-2 transition-all duration-300 ${isTesting ? 'glow-text' : ''}`}>
              {displaySpeed.toFixed(0)}
            </div>
            <div className="text-muted-foreground text-lg font-light tracking-wider">
              Mbps
            </div>
          </div>
        </div>
        
        {/* Needle indicator */}
        <div 
          className="absolute top-1/2 left-1/2 w-1 h-24 -mt-24 -ml-0.5 origin-bottom transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-full h-full gradient-primary rounded-full" 
               style={{ 
                 boxShadow: isTesting ? '0 0 20px hsl(var(--speed-glow))' : 'none' 
               }} 
          />
        </div>
        
        {/* Center dot */}
        <div className={`absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 rounded-full gradient-primary ${isTesting ? 'glow animate-pulse-glow' : ''}`} />
      </div>
    </div>
  );
};
