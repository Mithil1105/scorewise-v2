import { GRETopic } from "@/data/greTopics";
import { Badge } from "@/components/ui/badge";

interface TopicCardProps {
  topic: GRETopic;
}

export const TopicCard = ({ topic }: TopicCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={topic.type === 'issue' ? 'default' : 'secondary'} className="uppercase text-xs">
          {topic.type}
        </Badge>
      </div>
      <p className="text-foreground leading-relaxed font-serif">{topic.topic}</p>
      <p className="text-sm text-muted-foreground italic">{topic.instructions}</p>
    </div>
  );
};
