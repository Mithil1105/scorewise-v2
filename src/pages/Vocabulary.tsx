import { useState, useMemo, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { VocabCard } from "@/components/vocab/VocabCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { vocabularyList, searchVocabulary, loadVocabulary, VocabWord } from "@/data/vocabulary";
import { Search, X, Loader2 } from "lucide-react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Vocabulary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWords = async () => {
      setLoading(true);
      setError(null);
      try {
        const loadedWords = await loadVocabulary();
        if (loadedWords.length === 0) {
          setError('No vocabulary words loaded. Please check if Verbalhelp.json exists in the public folder.');
        } else {
          setWords(loadedWords);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load vocabulary';
        setError(errorMessage);
        console.error('Error loading vocabulary:', err);
      } finally {
        setLoading(false);
      }
    };
    loadWords();
  }, []);

  const filteredWords = useMemo(() => {
    let filtered = words;

    if (searchQuery) {
      filtered = searchVocabulary(searchQuery, words);
    } else if (selectedLetter) {
      filtered = filtered.filter(w => w.word.toUpperCase().startsWith(selectedLetter));
    }

    return filtered;
  }, [searchQuery, selectedLetter, words]);

  const availableLetters = useMemo(() => {
    return new Set(words.map(w => w.word[0].toUpperCase()));
  }, [words]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedLetter(null);
  };

  return (
    <PageLayout>
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            Vocabulary Builder
          </h1>
          <p className="text-muted-foreground">
            High-frequency GRE words with memorable TV show examples
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedLetter(null);
            }}
            placeholder="Search words or meanings..."
            className="pl-10 pr-10"
          />
          {(searchQuery || selectedLetter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Alphabet Filter */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-1 min-w-max">
            <Button
              variant={selectedLetter === null && !searchQuery ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedLetter(null);
                setSearchQuery("");
              }}
              className="shrink-0"
            >
              All
            </Button>
            {alphabet.map((letter) => (
              <Button
                key={letter}
                variant={selectedLetter === letter ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedLetter(letter);
                  setSearchQuery("");
                }}
                disabled={!availableLetters.has(letter)}
                className="w-9 shrink-0"
              >
                {letter}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading vocabulary...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-2">Error loading vocabulary</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </div>
        ) : (
          <>
            {/* Word Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredWords.length} of {words.length} words
            </div>

            {/* Word Grid */}
            {filteredWords.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWords.map((word) => (
                  <VocabCard 
                    key={word.id} 
                    word={word} 
                    filteredWords={filteredWords}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No words found matching your search.</p>
                <Button onClick={handleClearFilters} variant="link" className="mt-2">
                  Clear filters
                </Button>
              </div>
            )}

            {/* Info Note */}
            <div className="mt-8 p-4 bg-vocab/10 rounded-lg border border-vocab/20 text-center">
              <p className="text-sm text-muted-foreground">
                Complete vocabulary list with {words.length} high-frequency GRE words from Verbalhelp.json
              </p>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default Vocabulary;
