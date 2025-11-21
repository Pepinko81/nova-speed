import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SpeedMeter } from "@/components/SpeedMeter";
import { StatsDisplay } from "@/components/StatsDisplay";
import { Zap } from "lucide-react";

type TestState = "idle" | "testing" | "complete";

const Index = () => {
  const [testState, setTestState] = useState<TestState>("idle");
  const [speed, setSpeed] = useState(0);
  const [ping, setPing] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);

  // Simulated speed test logic (frontend only)
  const runSpeedTest = async () => {
    setTestState("testing");
    setSpeed(0);
    setPing(null);
    setDownload(null);
    setUpload(null);

    // Simulate ping test
    await new Promise(resolve => setTimeout(resolve, 800));
    const simulatedPing = Math.random() * 30 + 10;
    setPing(simulatedPing);

    // Simulate download test with gradual speed increase
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const simulatedDownload = Math.random() * 150 + 50;
      setSpeed(simulatedDownload);
      if (i === 100) setDownload(simulatedDownload);
    }

    // Brief pause
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate upload test with gradual speed increase
    for (let i = 0; i <= 100; i += 2) {
      await new Promise(resolve => setTimeout(resolve, 30));
      const simulatedUpload = Math.random() * 100 + 30;
      setSpeed(simulatedUpload);
      if (i === 100) setUpload(simulatedUpload);
    }

    setTestState("complete");
  };

  const resetTest = () => {
    setTestState("idle");
    setSpeed(0);
    setPing(null);
    setDownload(null);
    setUpload(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow">
              <Zap className="w-6 h-6 text-background" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight">SpeedFlux</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 gap-12">
        {/* Title section */}
        <div className="text-center space-y-3 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Test Your Internet Speed
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-light">
            {testState === "idle" && "Click the button below to start testing your connection"}
            {testState === "testing" && "Analyzing your connection speed..."}
            {testState === "complete" && "Test complete! Here are your results"}
          </p>
        </div>

        {/* Speed meter */}
        <div className="w-full max-w-md animate-scale-in">
          <SpeedMeter 
            speed={speed} 
            maxSpeed={200} 
            isTesting={testState === "testing"}
          />
        </div>

        {/* Start/Stop button */}
        <div className="animate-scale-in" style={{ animationDelay: '200ms' }}>
          {testState === "idle" && (
            <Button
              size="lg"
              onClick={runSpeedTest}
              className="h-16 px-12 text-lg font-semibold rounded-full gradient-primary hover:opacity-90 transition-all duration-300 glow hover:scale-105"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Test
            </Button>
          )}
          
          {testState === "testing" && (
            <Button
              size="lg"
              disabled
              className="h-16 px-12 text-lg font-semibold rounded-full gradient-primary animate-pulse-glow glow"
            >
              Testing...
            </Button>
          )}
          
          {testState === "complete" && (
            <Button
              size="lg"
              onClick={resetTest}
              variant="outline"
              className="h-16 px-12 text-lg font-semibold rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300"
            >
              Test Again
            </Button>
          )}
        </div>

        {/* Stats display */}
        <StatsDisplay
          ping={ping}
          download={download}
          upload={upload}
          isVisible={testState === "complete"}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-4 text-center text-sm text-muted-foreground">
        <p className="font-light">
          Results are simulated for demonstration purposes
        </p>
      </footer>
    </div>
  );
};

export default Index;
