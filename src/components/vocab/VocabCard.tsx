import { useNavigate, useLocation } from "react-router-dom";
import { VocabWord } from "@/data/vocabulary";
import { Badge } from "@/components/ui/badge";

interface VocabCardProps {
  word: VocabWord;
  filteredWords?: VocabWord[];
}

export const VocabCard = ({ word, filteredWords }: VocabCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    // Navigate to word detail page, passing filtered words context if available
    navigate(`/vocabulary/word/${word.id}`, {
      state: {
        filteredWords: filteredWords || [],
        allWords: []
      }
    });
  };

  return (
    <div 
      className="vocab-card cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-xl font-serif font-bold text-foreground">{word.word}</h3>
        <Badge variant="outline" className="text-xs shrink-0">
          {word.partOfSpeech}
        </Badge>
      </div>
      
      <p className="text-muted-foreground mb-4 line-clamp-2">{word.meaning}</p>
      
      {word.examples.length > 0 && (
        <div className="space-y-2">
          <div className="pl-3 border-l-2 border-vocab/30">
            <p className="text-sm text-foreground italic line-clamp-2">"{word.examples[0].quote}"</p>
            <p className="text-xs text-muted-foreground mt-1">— {word.examples[0].show}</p>
          </div>
          {word.examples.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{word.examples.length - 1} more example{word.examples.length - 1 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
