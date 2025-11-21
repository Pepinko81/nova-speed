import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SpeedMeter } from "@/components/SpeedMeter";
import { StatsDisplay } from "@/components/StatsDisplay";
import { NetworkInfo } from "@/components/NetworkInfo";
import { Zap } from "lucide-react";
import { SpeedTestClient, TestProgress } from "@/lib/speedtest-client";

type TestState = "idle" | "testing" | "complete";
type TestPhase = "ping" | "download" | "upload" | null;

const Index = () => {
  const [testState, setTestState] = useState<TestState>("idle");
  const [testPhase, setTestPhase] = useState<TestPhase>(null);
  const [speed, setSpeed] = useState(0);
  const [ping, setPing] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<SpeedTestClient | null>(null);

  // Initialize client
  if (!clientRef.current) {
    const wsUrl = import.meta.env.VITE_WS_URL;
    clientRef.current = new SpeedTestClient(wsUrl);
  }

  const runSpeedTest = async () => {
    setTestState("testing");
    setSpeed(0);
    setPing(null);
    setDownload(null);
    setUpload(null);
    setError(null);
    setTestPhase("ping");

    try {
      const client = clientRef.current!;

      // Progress callback for real-time updates
      const onProgress = (progress: TestProgress) => {
        if (progress.test === 'download' || progress.test === 'upload') {
          setSpeed(progress.value);
        }
      };

      // Run ping test
      setTestPhase("ping");
      const pingResult = await client.runPingTest(onProgress);
      setPing(pingResult.latency);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Run download test
      setTestPhase("download");
      setSpeed(0);
      const downloadResult = await client.runDownloadTest(onProgress, 1000);
      setDownload(downloadResult.throughput);
      setSpeed(downloadResult.throughput);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Run upload test
      setTestPhase("upload");
      setSpeed(0);
      const uploadResult = await client.runUploadTest(onProgress, 1000);
      setUpload(uploadResult.throughput);
      setSpeed(uploadResult.throughput);

      setTestPhase(null);
      setTestState("complete");
    } catch (err) {
      console.error("Speed test error:", err);
      setError(err instanceof Error ? err.message : "An error occurred during the test");
      setTestState("idle");
      setTestPhase(null);
      setSpeed(0);
    }
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
      <header className="relative z-10 py-4 sm:py-6 px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-primary flex items-center justify-center glow">
              <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-background" strokeWidth={2.5} />
            </div>
            <span className="text-xl sm:text-2xl font-bold tracking-tight">SpeedFlux</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 gap-8 sm:gap-10 md:gap-12">
        {/* Title section */}
        <div className="text-center space-y-2 sm:space-y-3 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-4">
            Test Your Internet Speed
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-light px-4">
            {testState === "idle" && "Tap the button below to start testing"}
            {testState === "testing" && testPhase === "ping" && "Measuring latency..."}
            {testState === "testing" && testPhase === "download" && "Testing download speed..."}
            {testState === "testing" && testPhase === "upload" && "Testing upload speed..."}
            {testState === "testing" && !testPhase && "Analyzing your connection..."}
            {testState === "complete" && "Test complete! Here are your results"}
          </p>
          {error && (
            <p className="text-destructive text-sm mt-2 px-4">
              {error}
            </p>
          )}
        </div>

        {/* Speed meter */}
        <div className="w-full max-w-[280px] sm:max-w-sm md:max-w-md animate-scale-in px-4">
          <SpeedMeter 
            speed={speed} 
            maxSpeed={1000} 
            isTesting={testState === "testing"}
          />
        </div>

        {/* Start/Stop button */}
        <div className="animate-scale-in px-4" style={{ animationDelay: '200ms' }}>
          {testState === "idle" && (
            <Button
              size="lg"
              onClick={runSpeedTest}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full gradient-primary hover:opacity-90 transition-all duration-300 glow active:scale-95 hover:scale-105 touch-none min-w-[200px]"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Test
            </Button>
          )}
          
          {testState === "testing" && (
            <Button
              size="lg"
              disabled
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full gradient-primary animate-pulse-glow glow min-w-[200px]"
            >
              Testing...
            </Button>
          )}
          
          {testState === "complete" && (
            <Button
              size="lg"
              onClick={resetTest}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300 active:scale-95 touch-none min-w-[200px]"
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

        {/* Network Info */}
        <div className="w-full max-w-2xl mx-auto px-4 mt-8">
          <NetworkInfo />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 sm:py-6 px-4 text-center text-xs sm:text-sm text-muted-foreground">
        <p className="font-light">
          Powered by SpeedFlux - Accurate internet speed testing
        </p>
      </footer>
    </div>
  );
};

export default Index;
