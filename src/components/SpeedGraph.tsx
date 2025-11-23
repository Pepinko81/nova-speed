/**
 * Real-time Speed Graph Component
 */

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface SpeedGraphProps {
  samples: number[];
  maxSpeed: number;
  label: string;
  color?: string;
  isVisible: boolean;
}

export const SpeedGraph = ({ 
  samples, 
  maxSpeed, 
  label, 
  color = 'hsl(var(--primary))',
  isVisible 
}: SpeedGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !isVisible || samples.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw speed line
    if (samples.length > 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const stepX = (width - 2 * padding) / (samples.length - 1);
      const maxValue = Math.max(maxSpeed, ...samples);

      samples.forEach((sample, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (sample / maxValue) * (height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Fill area under curve
      ctx.fillStyle = color + '20';
      ctx.lineTo(width - padding, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fill();
    }

    // Draw current value
    if (samples.length > 0) {
      const currentValue = samples[samples.length - 1];
      const maxValue = Math.max(maxSpeed, ...samples);
      const x = width - padding;
      const y = height - padding - (currentValue / maxValue) * (height - 2 * padding);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [samples, maxSpeed, color, isVisible]);

  if (!isVisible || samples.length === 0) return null;

  return (
    <Card className="p-4 bg-background/50 backdrop-blur">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full h-[120px]"
      />
      <div className="text-xs text-muted-foreground mt-2 text-right">
        {samples.length > 0 && (
          <>
            Текущо: {samples[samples.length - 1].toFixed(1)} Mbps
          </>
        )}
      </div>
    </Card>
  );
};

