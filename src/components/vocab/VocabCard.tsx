import { VocabWord } from "@/data/vocabulary";
import { Badge } from "@/components/ui/badge";

interface VocabCardProps {
  word: VocabWord;
}

export const VocabCard = ({ word }: VocabCardProps) => {
  return (
    <div className="vocab-card">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-xl font-serif font-bold text-foreground">{word.word}</h3>
        <Badge variant="outline" className="text-xs shrink-0">
          {word.partOfSpeech}
        </Badge>
      </div>
      
      <p className="text-muted-foreground mb-4">{word.meaning}</p>
      
      <div className="space-y-3">
        {word.examples.map((example, index) => (
          <div key={index} className="pl-3 border-l-2 border-vocab/30">
            <p className="text-sm text-foreground italic">"{example.quote}"</p>
            <p className="text-xs text-muted-foreground mt-1">— {example.show}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
