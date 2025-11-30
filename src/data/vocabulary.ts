export interface VocabWord {
  id: number;
  word: string;
  partOfSpeech: string;
  meaning: string;
  examples: {
    show: string;
    quote: string;
  }[];
}

// Interface for the JSON structure
interface VerbalHelpWord {
  Word: string;
  Type: string;
  Meaning: string;
  "Modern Family Example": string;
  "Friends Example": string;
  "Gilmore Girls Example": string;
  "Big Bang Theory Example": string;
}

interface VerbalHelpData {
  [key: string]: VerbalHelpWord[];
}

// Convert Type abbreviation to full part of speech
const convertPartOfSpeech = (type: string | undefined | null): string => {
  if (!type) {
    return 'unknown';
  }
  const typeMap: { [key: string]: string } = {
    'adj': 'adjective',
    'v': 'verb',
    'n': 'noun',
    'adv': 'adverb',
    'prep': 'preposition',
    'conj': 'conjunction',
    'pron': 'pronoun',
    'interj': 'interjection',
  };
  return typeMap[type.toLowerCase()] || type;
};

// Load and parse vocabulary from Verbalhelp.json
let vocabularyList: VocabWord[] = [];
let vocabularyLoaded = false;

const loadVocabulary = async (): Promise<VocabWord[]> => {
  if (vocabularyLoaded && vocabularyList.length > 0) {
    return vocabularyList;
  }

  try {
    console.log('Loading vocabulary from /Verbalhelp.json...');
    // Try multiple possible paths
    let response: Response | null = null;
    const paths = ['/Verbalhelp.json', './Verbalhelp.json', 'Verbalhelp.json'];
    
    for (const path of paths) {
      try {
        response = await fetch(path);
        if (response.ok) {
          console.log(`Successfully found vocabulary at: ${path}`);
          break;
        }
      } catch (e) {
        console.log(`Failed to load from ${path}, trying next...`);
        continue;
      }
    }
    
    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response';
      console.error('Failed to load vocabulary data:', response?.status, response?.statusText, errorText);
      throw new Error(`Failed to load vocabulary data: ${response?.status || 'Network error'} ${response?.statusText || ''}`);
    }
    
    const data: VerbalHelpData = await response.json();
    console.log('Vocabulary JSON loaded, parsing...', Object.keys(data));
    
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Vocabulary JSON is empty or invalid');
    }
    
    // Flatten all lists into a single array
    const allWords: VerbalHelpWord[] = [];
    Object.keys(data).forEach((listKey) => {
      if (Array.isArray(data[listKey])) {
        allWords.push(...data[listKey]);
      }
    });

    console.log(`Total words found: ${allWords.length}`);

    // Convert to VocabWord format
    vocabularyList = allWords.map((word, index) => {
      const examples: { show: string; quote: string }[] = [];
      
      // Add examples if they exist
      if (word["Modern Family Example"]) {
        examples.push({
          show: "Modern Family",
          quote: word["Modern Family Example"]
        });
      }
      if (word["Friends Example"]) {
        examples.push({
          show: "Friends",
          quote: word["Friends Example"]
        });
      }
      if (word["Gilmore Girls Example"]) {
        examples.push({
          show: "Gilmore Girls",
          quote: word["Gilmore Girls Example"]
        });
      }
      if (word["Big Bang Theory Example"]) {
        examples.push({
          show: "Big Bang Theory",
          quote: word["Big Bang Theory Example"]
        });
      }

      // Capitalize first letter, keep rest as-is (some words may have special capitalization)
      const capitalizedWord = word.Word ? (word.Word.charAt(0).toUpperCase() + word.Word.slice(1)) : 'Unknown Word';

      return {
        id: index + 1,
        word: capitalizedWord,
        partOfSpeech: convertPartOfSpeech(word.Type),
        meaning: word.Meaning || 'No meaning provided',
        examples: examples
      };
    });

    console.log(`Vocabulary loaded successfully: ${vocabularyList.length} words`);
    vocabularyLoaded = true;
    return vocabularyList;
  } catch (error) {
    console.error('Error loading vocabulary:', error);
    // Re-throw error so component can handle it
    throw error;
  }
};

// Export vocabularyList (will be populated after loadVocabulary is called)
export { vocabularyList, loadVocabulary };

export const getVocabularyByLetter = (letter: string, words: VocabWord[] = vocabularyList): VocabWord[] => {
  return words.filter(word => 
    word.word.toLowerCase().startsWith(letter.toLowerCase())
  );
};

export const searchVocabulary = (query: string, words: VocabWord[] = vocabularyList): VocabWord[] => {
  const lowerQuery = query.toLowerCase();
  return words.filter(word =>
    word.word.toLowerCase().includes(lowerQuery) ||
    word.meaning.toLowerCase().includes(lowerQuery) ||
    word.examples.some(ex => ex.quote.toLowerCase().includes(lowerQuery))
  );
};
