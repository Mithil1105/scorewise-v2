import { FileText, Zap } from "lucide-react";

interface EssayStatsProps {
  wordCount: number;
  wpm: number;
}

export const EssayStats = ({ wordCount, wpm }: EssayStatsProps) => {
  return (
    <div className="flex gap-4">
      <div className="stat-badge">
        <FileText className="h-4 w-4" />
        <span>{wordCount} words</span>
      </div>
      <div className="stat-badge">
        <Zap className="h-4 w-4" />
        <span>{wpm} WPM</span>
      </div>
    </div>
  );
};
