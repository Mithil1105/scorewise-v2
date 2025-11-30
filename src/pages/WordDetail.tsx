import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadVocabulary, VocabWord, vocabularyList } from "@/data/vocabulary";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function WordDetail() {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState<VocabWord | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Get filter context from location state (if coming from Vocabulary page)
  const filterContext = location.state as { 
    filteredWords?: VocabWord[];
    allWords?: VocabWord[];
  } | null;

  useEffect(() => {
    const loadWords = async () => {
      setLoading(true);
      try {
        let loadedWords: VocabWord[] = [];
        
        // If we have filtered words from the Vocabulary page, use those
        if (filterContext?.filteredWords && filterContext.filteredWords.length > 0) {
          loadedWords = filterContext.filteredWords;
        } else {
          // Otherwise load all words
          loadedWords = await loadVocabulary();
        }
        
        setWords(loadedWords);
        
        // Find the current word
        const wordIdNum = parseInt(wordId || '0', 10);
        const word = loadedWords.find(w => w.id === wordIdNum);
        
        if (word) {
          setCurrentWord(word);
          const index = loadedWords.findIndex(w => w.id === wordIdNum);
          setCurrentIndex(index);
        } else {
          // Word not found, redirect to vocabulary page
          navigate('/vocabulary');
        }
      } catch (error) {
        console.error('Error loading word:', error);
        navigate('/vocabulary');
      } finally {
        setLoading(false);
      }
    };
    
    loadWords();
  }, [wordId, navigate, filterContext]);

  const handlePrevious = useCallback(async () => {
    if (currentIndex > 0 && words.length > 0) {
      // Normal case: move to previous word in current list
      const prevWord = words[currentIndex - 1];
      setCurrentWord(prevWord);
      setCurrentIndex(currentIndex - 1);
      navigate(`/vocabulary/word/${prevWord.id}`, { 
        state: filterContext,
        replace: true 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentIndex === 0 && words.length > 0) {
      // At start of current list - try to load previous alphabet
      const currentWordFirstLetter = currentWord?.word.charAt(0).toUpperCase() || '';
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const currentLetterIndex = alphabet.indexOf(currentWordFirstLetter);
      
      if (currentLetterIndex > 0) {
        // Try to find previous available letter
        for (let i = currentLetterIndex - 1; i >= 0; i--) {
          const prevLetter = alphabet[i];
          const allWords = await loadVocabulary();
          const prevLetterWords = allWords.filter(w => 
            w.word.charAt(0).toUpperCase() === prevLetter
          );
          
          if (prevLetterWords.length > 0) {
            // Found words for previous letter - navigate to last word
            const lastWordOfPrevLetter = prevLetterWords[prevLetterWords.length - 1];
            setCurrentWord(lastWordOfPrevLetter);
            setCurrentIndex(prevLetterWords.length - 1);
            setWords(prevLetterWords);
            navigate(`/vocabulary/word/${lastWordOfPrevLetter.id}`, {
              state: {
                filteredWords: prevLetterWords,
                allWords: allWords
              },
              replace: true
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
      }
    }
  }, [currentIndex, words, currentWord, navigate, filterContext]);

  const handleNext = useCallback(async () => {
    if (currentIndex < words.length - 1 && words.length > 0) {
      // Normal case: move to next word in current list
      const nextWord = words[currentIndex + 1];
      setCurrentWord(nextWord);
      setCurrentIndex(currentIndex + 1);
      navigate(`/vocabulary/word/${nextWord.id}`, { 
        state: filterContext,
        replace: true 
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentIndex >= words.length - 1 && words.length > 0) {
      // Reached end of current list - try to load next alphabet
      const currentWordFirstLetter = currentWord?.word.charAt(0).toUpperCase() || '';
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      const currentLetterIndex = alphabet.indexOf(currentWordFirstLetter);
      
      if (currentLetterIndex >= 0 && currentLetterIndex < alphabet.length - 1) {
        // Try to find next available letter
        for (let i = currentLetterIndex + 1; i < alphabet.length; i++) {
          const nextLetter = alphabet[i];
          const allWords = await loadVocabulary();
          const nextLetterWords = allWords.filter(w => 
            w.word.charAt(0).toUpperCase() === nextLetter
          );
          
          if (nextLetterWords.length > 0) {
            // Found words for next letter - navigate to first word
            const firstWordOfNextLetter = nextLetterWords[0];
            setCurrentWord(firstWordOfNextLetter);
            setCurrentIndex(0);
            setWords(nextLetterWords);
            navigate(`/vocabulary/word/${firstWordOfNextLetter.id}`, {
              state: {
                filteredWords: nextLetterWords,
                allWords: allWords
              },
              replace: true
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
      }
    }
  }, [currentIndex, words, currentWord, navigate, filterContext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || 
          (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // Always allow previous - will auto-advance to previous alphabet if needed
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Always allow next - will auto-advance to next alphabet if needed
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevious, handleNext]);

  if (loading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!currentWord) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Word not found</p>
              <Button onClick={() => navigate('/vocabulary')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Vocabulary
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/vocabulary', { state: filterContext })}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vocabulary
          </Button>
        </div>

        {/* Word Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-4xl font-serif font-bold mb-2">
                  {currentWord.word}
                </CardTitle>
                <Badge variant="outline" className="text-sm">
                  {currentWord.partOfSpeech}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meaning */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Meaning</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {currentWord.meaning}
              </p>
            </div>

            {/* Examples */}
            {currentWord.examples.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Examples</h3>
                <div className="space-y-4">
                  {currentWord.examples.map((example, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary"
                    >
                      <p className="text-foreground italic text-base leading-relaxed mb-2">
                        "{example.quote}"
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        — {example.show}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Info */}
            <div className="pt-4 border-t text-center text-sm text-muted-foreground">
              Word {currentIndex + 1} of {words.length}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground px-4">
            {currentIndex + 1} / {words.length}
            {currentWord && (
              <span className="block text-xs mt-1">
                ({currentWord.word.charAt(0).toUpperCase()})
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={handleNext}
            className="flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

