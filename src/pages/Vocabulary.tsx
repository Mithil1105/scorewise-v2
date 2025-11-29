import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { VocabCard } from "@/components/vocab/VocabCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { vocabularyList, searchVocabulary } from "@/data/vocabulary";
import { Search, X } from "lucide-react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Vocabulary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const filteredWords = useMemo(() => {
    let words = vocabularyList;

    if (searchQuery) {
      words = searchVocabulary(searchQuery);
    } else if (selectedLetter) {
      words = words.filter(w => w.word.toUpperCase().startsWith(selectedLetter));
    }

    return words;
  }, [searchQuery, selectedLetter]);

  const availableLetters = useMemo(() => {
    return new Set(vocabularyList.map(w => w.word[0].toUpperCase()));
  }, []);

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

        {/* Word Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredWords.length} of {vocabularyList.length} words
        </div>

        {/* Word Grid */}
        {filteredWords.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWords.map((word) => (
              <VocabCard key={word.id} word={word} />
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
            Full vocabulary list with 500+ high-frequency words coming soon!
          </p>
        </div>
      </div>
    </PageLayout>
  );
};

export default Vocabulary;
