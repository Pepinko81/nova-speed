import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SpeedMeter } from "@/components/SpeedMeter";
import { StatsDisplay } from "@/components/StatsDisplay";
import { NetworkInfo } from "@/components/NetworkInfo";
import { SpeedGraph } from "@/components/SpeedGraph";
import { Diagnostics } from "@/components/Diagnostics";
import { TestHistory } from "@/components/TestHistory";
import { RealWorldTests } from "@/components/RealWorldTests";
import { Settings } from "@/components/Settings";
import { Zap, Settings as SettingsIcon } from "lucide-react";
import { SpeedTestClient, TestProgress, PingResult, DownloadResult, UploadResult, ConnectionQuality } from "@/lib/speedtest-client";
import { saveTestToHistory } from "@/lib/test-history";
import { calculateConnectionQuality, getOperatorName, getOperatorEmoji } from "@/lib/diagnostics";

type TestState = "idle" | "testing" | "complete";
type TestPhase = "ping" | "download" | "upload" | null;

const Index = () => {
  const [testState, setTestState] = useState<TestState>("idle");
  const [testPhase, setTestPhase] = useState<TestPhase>(null);
  const [speed, setSpeed] = useState(0);
  const [ping, setPing] = useState<PingResult | null>(null);
  const [download, setDownload] = useState<DownloadResult | null>(null);
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [downloadSamples, setDownloadSamples] = useState<number[]>([]);
  const [uploadSamples, setUploadSamples] = useState<number[]>([]);
  const [networkInfo, setNetworkInfo] = useState<{ operator?: string; location?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const clientRef = useRef<SpeedTestClient | null>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

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
    setConnectionQuality(null);
    setDownloadSamples([]);
    setUploadSamples([]);
    setError(null);
    setTestPhase("ping");

    try {
      const client = clientRef.current!;

      // Progress callback for real-time updates
      const onProgress = (progress: TestProgress) => {
        if (progress.test === 'download' || progress.test === 'upload') {
          setSpeed(progress.value);
          
          // Collect samples for graphing
          if (progress.test === 'download') {
            setDownloadSamples(prev => {
              const newSamples = [...prev, progress.value];
              // Keep last 50 samples
              return newSamples.slice(-50);
            });
          } else if (progress.test === 'upload') {
            setUploadSamples(prev => {
              const newSamples = [...prev, progress.value];
              return newSamples.slice(-50);
            });
          }
        }
      };

      // Run ping test
      setTestPhase("ping");
      const pingResult = await client.runPingTest(onProgress);
      setPing(pingResult);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Run download test
      setTestPhase("download");
      setSpeed(0);
      setDownloadSamples([]);
      const downloadResult = await client.runDownloadTest(onProgress, 1000);
      setDownload(downloadResult);
      setSpeed(downloadResult.throughput);
      
      // Update samples from result if available
      if (downloadResult.speedSamples && downloadResult.speedSamples.length > 0) {
        setDownloadSamples(downloadResult.speedSamples);
      }

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Run upload test
      setTestPhase("upload");
      setSpeed(0);
      setUploadSamples([]);
      const uploadResult = await client.runUploadTest(onProgress, 1000);
      setUpload(uploadResult);
      setSpeed(uploadResult.throughput);
      
      // Update samples from result if available
      if (uploadResult.speedSamples && uploadResult.speedSamples.length > 0) {
        setUploadSamples(uploadResult.speedSamples);
      }

      // Calculate connection quality
      const quality = calculateConnectionQuality(pingResult, downloadResult, uploadResult);
      setConnectionQuality(quality);

      // Fetch network info for history
      try {
        const wsUrl = import.meta.env.VITE_WS_URL;
        let apiUrl: string;
        if (wsUrl) {
          apiUrl = wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:') + '/info';
        } else {
          const protocol = window.location.protocol;
          const host = window.location.hostname;
          const port = host.includes('hashmatrix.dev') ? '' : ':3001';
          apiUrl = `${protocol}//${host}${port}/info`;
        }
        const infoResponse = await fetch(apiUrl);
        if (infoResponse.ok) {
          const info = await infoResponse.json();
          setNetworkInfo({
            operator: getOperatorName(info.isp),
            location: info.city && info.country ? `${info.city}, ${info.country}` : undefined,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch network info:', err);
      }

      // Save to history
      saveTestToHistory({
        ping: pingResult.latency,
        jitter: pingResult.jitter,
        packetLoss: pingResult.packetLoss,
        download: downloadResult.throughput,
        upload: uploadResult.throughput,
        ttfb: downloadResult.ttfb,
        speedVariance: downloadResult.speedVariance,
        operator: networkInfo?.operator,
        location: networkInfo?.location,
      });

      setTestPhase(null);
      setTestState("complete");
    } catch (err) {
      console.error("Speed test error:", err);
      setError(err instanceof Error ? err.message : "Възникна грешка по време на теста");
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
    setConnectionQuality(null);
    setDownloadSamples([]);
    setUploadSamples([]);
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
          <div className="flex items-center gap-2">
            <TestHistory />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              aria-label="Настройки"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 gap-8 sm:gap-10 md:gap-12">
        {/* Title section */}
        <div className="text-center space-y-2 sm:space-y-3 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight px-4">
            Тест на Интернет Скорост
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-light px-4">
            {testState === "idle" && "Натиснете бутона по-долу, за да започнете теста"}
            {testState === "testing" && testPhase === "ping" && "Измерване на латентност..."}
            {testState === "testing" && testPhase === "download" && "Тест на download скорост..."}
            {testState === "testing" && testPhase === "upload" && "Тест на upload скорост..."}
            {testState === "testing" && !testPhase && "Анализиране на връзката..."}
            {testState === "complete" && "Тестът завърши! Ето резултатите"}
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
              ref={startButtonRef}
              size="lg"
              onClick={runSpeedTest}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  runSpeedTest();
                }
              }}
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full gradient-primary hover:opacity-90 transition-all duration-300 glow active:scale-95 hover:scale-105 touch-none min-w-[200px]"
              aria-label="Започни тест на интернет скорост"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Започни Тест
            </Button>
          )}
          
          {testState === "testing" && (
            <Button
              size="lg"
              disabled
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full gradient-primary animate-pulse-glow glow min-w-[200px]"
            >
              Тестване...
            </Button>
          )}
          
          {testState === "complete" && (
            <Button
              size="lg"
              onClick={resetTest}
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300 active:scale-95 touch-none min-w-[200px]"
            >
              Тест Отново
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

        {/* Speed Graphs */}
        {testState === "complete" && (downloadSamples.length > 0 || uploadSamples.length > 0) && (
          <div className="w-full max-w-4xl mx-auto px-4 space-y-4">
            {downloadSamples.length > 0 && (
              <SpeedGraph
                samples={downloadSamples}
                maxSpeed={Math.max(1000, ...downloadSamples)}
                label="Download Скорост"
                color="hsl(var(--accent))"
                isVisible={testState === "complete"}
              />
            )}
            {uploadSamples.length > 0 && (
              <SpeedGraph
                samples={uploadSamples}
                maxSpeed={Math.max(1000, ...uploadSamples)}
                label="Upload Скорост"
                color="hsl(var(--primary))"
                isVisible={testState === "complete"}
              />
            )}
          </div>
        )}

        {/* Diagnostics */}
        <Diagnostics
          quality={connectionQuality}
          isVisible={testState === "complete"}
        />

        {/* Real-World Tests */}
        <RealWorldTests
          ping={ping}
          download={download}
          upload={upload}
          quality={connectionQuality}
          isVisible={testState === "complete"}
        />

        {/* Network Info */}
        <div className="w-full max-w-2xl mx-auto px-4 mt-8">
          <NetworkInfo />
        </div>

        {/* Settings Modal */}
        <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 sm:py-6 px-4 text-center text-xs sm:text-sm text-muted-foreground">
        <p className="font-light">
          Powered by SpeedFlux - Точно измерване на интернет скорост
        </p>
      </footer>
    </div>
  );
};

export default Index;
