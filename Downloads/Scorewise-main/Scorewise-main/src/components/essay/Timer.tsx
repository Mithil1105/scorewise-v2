import { useEffect, useState, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerProps {
  initialMinutes: number;
  onTimeEnd: () => void;
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const Timer = ({ initialMinutes, onTimeEnd, isRunning, onToggle, onReset }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    setTimeLeft(initialMinutes * 60);
  }, [initialMinutes]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeEnd]);

  const handleReset = useCallback(() => {
    setTimeLeft(initialMinutes * 60);
    onReset();
  }, [initialMinutes, onReset]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (timeLeft / (initialMinutes * 60)) * 100;
  const isLowTime = timeLeft < 300; // Less than 5 minutes

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <svg className="w-20 h-20 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={isLowTime ? "hsl(var(--destructive))" : "hsl(var(--essay))"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 36}`}
            strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold ${isLowTime ? "text-destructive animate-pulse-soft" : "text-foreground"}`}>
          {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="gap-2"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Start"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
};
