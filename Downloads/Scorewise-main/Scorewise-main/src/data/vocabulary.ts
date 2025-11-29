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

// Sample vocabulary - full list will be uploaded by the founder
export const vocabularyList: VocabWord[] = [
  {
    id: 1,
    word: "Aberration",
    partOfSpeech: "noun",
    meaning: "A departure from what is normal, usual, or expected",
    examples: [
      { show: "Big Bang Theory", quote: "Sheldon considered social interaction an aberration in his otherwise orderly routine." },
      { show: "Modern Family", quote: "Phil's serious moment was an aberration from his usual comedic self." }
    ]
  },
  {
    id: 2,
    word: "Acerbic",
    partOfSpeech: "adjective",
    meaning: "Sharp and forthright; harsh in temper or tone",
    examples: [
      { show: "Gilmore Girls", quote: "Paris's acerbic comments often left her classmates speechless." },
      { show: "Friends", quote: "Chandler's acerbic wit was his defense mechanism." }
    ]
  },
  {
    id: 3,
    word: "Alacrity",
    partOfSpeech: "noun",
    meaning: "Brisk and cheerful readiness",
    examples: [
      { show: "Modern Family", quote: "Gloria accepted the challenge with alacrity, eager to prove herself." },
      { show: "Big Bang Theory", quote: "Howard showed surprising alacrity when NASA called." }
    ]
  },
  {
    id: 4,
    word: "Ambivalent",
    partOfSpeech: "adjective",
    meaning: "Having mixed feelings or contradictory ideas about something",
    examples: [
      { show: "Friends", quote: "Ross felt ambivalent about his feelings for Rachel throughout the series." },
      { show: "Gilmore Girls", quote: "Rory was ambivalent about choosing between Harvard and Yale." }
    ]
  },
  {
    id: 5,
    word: "Ameliorate",
    partOfSpeech: "verb",
    meaning: "To make something bad or unsatisfactory better",
    examples: [
      { show: "Big Bang Theory", quote: "Sheldon attempted to ameliorate the situation with a hot beverage." },
      { show: "Modern Family", quote: "Claire tried to ameliorate the family dispute during Thanksgiving." }
    ]
  },
  {
    id: 6,
    word: "Anomaly",
    partOfSpeech: "noun",
    meaning: "Something that deviates from what is standard, normal, or expected",
    examples: [
      { show: "Big Bang Theory", quote: "The experimental results showed an anomaly that puzzled the physicists." },
      { show: "Friends", quote: "Monica being messy was an anomaly that shocked everyone." }
    ]
  },
  {
    id: 7,
    word: "Antipathy",
    partOfSpeech: "noun",
    meaning: "A deep-seated feeling of dislike; aversion",
    examples: [
      { show: "Gilmore Girls", quote: "Emily's antipathy toward Luke was evident from their first meeting." },
      { show: "Friends", quote: "Rachel's initial antipathy toward her waitressing job was clear." }
    ]
  },
  {
    id: 8,
    word: "Arcane",
    partOfSpeech: "adjective",
    meaning: "Understood by few; mysterious or secret",
    examples: [
      { show: "Big Bang Theory", quote: "Sheldon's knowledge of arcane comic book lore was unmatched." },
      { show: "Gilmore Girls", quote: "Rory appreciated her grandfather's arcane collection of first editions." }
    ]
  },
  {
    id: 9,
    word: "Arduous",
    partOfSpeech: "adjective",
    meaning: "Involving or requiring strenuous effort; difficult and tiring",
    examples: [
      { show: "Modern Family", quote: "Phil's arduous journey to become a better cook was filled with disasters." },
      { show: "Friends", quote: "Monica's arduous pursuit of culinary perfection defined her career." }
    ]
  },
  {
    id: 10,
    word: "Articulate",
    partOfSpeech: "adjective/verb",
    meaning: "Having or showing the ability to speak fluently and coherently",
    examples: [
      { show: "Gilmore Girls", quote: "Lorelai was surprisingly articulate when defending her daughter." },
      { show: "Big Bang Theory", quote: "Despite his intelligence, Raj struggled to articulate his feelings." }
    ]
  },
  {
    id: 11,
    word: "Audacious",
    partOfSpeech: "adjective",
    meaning: "Showing a willingness to take surprisingly bold risks",
    examples: [
      { show: "Modern Family", quote: "Jay's audacious business move paid off handsomely." },
      { show: "Friends", quote: "Joey's audacious attempt at method acting led to hilarious results." }
    ]
  },
  {
    id: 12,
    word: "Benevolent",
    partOfSpeech: "adjective",
    meaning: "Well-meaning and kindly",
    examples: [
      { show: "Friends", quote: "Phoebe's benevolent nature made her help everyone, even strangers." },
      { show: "Gilmore Girls", quote: "Miss Patty's benevolent gossip often brought the town together." }
    ]
  },
  {
    id: 13,
    word: "Brevity",
    partOfSpeech: "noun",
    meaning: "Concise and exact use of words in writing or speech",
    examples: [
      { show: "Big Bang Theory", quote: "Brevity was never Sheldon's strong suit in explanations." },
      { show: "Gilmore Girls", quote: "Emily valued brevity in social pleasantries." }
    ]
  },
  {
    id: 14,
    word: "Cacophony",
    partOfSpeech: "noun",
    meaning: "A harsh, discordant mixture of sounds",
    examples: [
      { show: "Modern Family", quote: "The family dinner devolved into a cacophony of arguments." },
      { show: "Big Bang Theory", quote: "Penny's singing created a cacophony that disturbed Sheldon." }
    ]
  },
  {
    id: 15,
    word: "Candor",
    partOfSpeech: "noun",
    meaning: "The quality of being open and honest in expression; frankness",
    examples: [
      { show: "Friends", quote: "Monica appreciated Chandler's candor about their relationship." },
      { show: "Gilmore Girls", quote: "Lorelai's candor often got her in trouble with Emily." }
    ]
  },
  {
    id: 16,
    word: "Capricious",
    partOfSpeech: "adjective",
    meaning: "Given to sudden and unaccountable changes of mood or behavior",
    examples: [
      { show: "Gilmore Girls", quote: "Logan's capricious lifestyle initially attracted Rory." },
      { show: "Modern Family", quote: "Gloria's capricious reactions kept Jay on his toes." }
    ]
  },
  {
    id: 17,
    word: "Cogent",
    partOfSpeech: "adjective",
    meaning: "Clear, logical, and convincing",
    examples: [
      { show: "Big Bang Theory", quote: "Leonard presented a cogent argument for the physics experiment." },
      { show: "Gilmore Girls", quote: "Paris always had a cogent reason for her competitive behavior." }
    ]
  },
  {
    id: 18,
    word: "Complacent",
    partOfSpeech: "adjective",
    meaning: "Showing smug or uncritical satisfaction with oneself or one's achievements",
    examples: [
      { show: "Friends", quote: "Ross became complacent in his career before his sabbatical." },
      { show: "Modern Family", quote: "Phil warned against becoming complacent in real estate." }
    ]
  },
  {
    id: 19,
    word: "Conundrum",
    partOfSpeech: "noun",
    meaning: "A confusing and difficult problem or question",
    examples: [
      { show: "Big Bang Theory", quote: "The roommate agreement presented a conundrum for Leonard." },
      { show: "Gilmore Girls", quote: "Rory faced the conundrum of choosing between two lives." }
    ]
  },
  {
    id: 20,
    word: "Cursory",
    partOfSpeech: "adjective",
    meaning: "Hasty and therefore not thorough or detailed",
    examples: [
      { show: "Friends", quote: "Rachel gave a cursory glance at the fashion magazine." },
      { show: "Modern Family", quote: "Luke gave homework a cursory review before playing video games." }
    ]
  },
  {
    id: 21,
    word: "Dearth",
    partOfSpeech: "noun",
    meaning: "A scarcity or lack of something",
    examples: [
      { show: "Big Bang Theory", quote: "There was a dearth of social skills in the apartment." },
      { show: "Gilmore Girls", quote: "Stars Hollow never suffered a dearth of quirky characters." }
    ]
  },
  {
    id: 22,
    word: "Debilitate",
    partOfSpeech: "verb",
    meaning: "To make someone weak and infirm",
    examples: [
      { show: "Friends", quote: "The flu debilitated Joey before his big audition." },
      { show: "Modern Family", quote: "The heat debilitated everyone during the family vacation." }
    ]
  },
  {
    id: 23,
    word: "Diffident",
    partOfSpeech: "adjective",
    meaning: "Modest or shy because of a lack of self-confidence",
    examples: [
      { show: "Big Bang Theory", quote: "Raj's diffident nature around women was a running theme." },
      { show: "Gilmore Girls", quote: "Lane was initially diffident about her music dreams." }
    ]
  },
  {
    id: 24,
    word: "Dogmatic",
    partOfSpeech: "adjective",
    meaning: "Inclined to lay down principles as incontrovertibly true",
    examples: [
      { show: "Big Bang Theory", quote: "Sheldon's dogmatic approach to science often irritated his friends." },
      { show: "Gilmore Girls", quote: "Emily's dogmatic views on society clashed with Lorelai's." }
    ]
  },
  {
    id: 25,
    word: "Ebullient",
    partOfSpeech: "adjective",
    meaning: "Cheerful and full of energy",
    examples: [
      { show: "Modern Family", quote: "Phil's ebullient personality made him a great realtor." },
      { show: "Friends", quote: "Phoebe's ebullient spirit was contagious." }
    ]
  },
  {
    id: 26,
    word: "Eclectic",
    partOfSpeech: "adjective",
    meaning: "Deriving ideas or style from a broad range of sources",
    examples: [
      { show: "Friends", quote: "Phoebe's eclectic taste in music defined her character." },
      { show: "Modern Family", quote: "The Dunphy home featured an eclectic mix of decorations." }
    ]
  },
  {
    id: 27,
    word: "Efficacious",
    partOfSpeech: "adjective",
    meaning: "Successful in producing a desired or intended result; effective",
    examples: [
      { show: "Big Bang Theory", quote: "Sheldon's method proved efficacious in solving the equation." },
      { show: "Gilmore Girls", quote: "Paris found coffee to be highly efficacious for studying." }
    ]
  },
  {
    id: 28,
    word: "Ephemeral",
    partOfSpeech: "adjective",
    meaning: "Lasting for a very short time",
    examples: [
      { show: "Gilmore Girls", quote: "Rory learned that college romances can be ephemeral." },
      { show: "Friends", quote: "Joey's relationships were often ephemeral." }
    ]
  },
  {
    id: 29,
    word: "Equivocate",
    partOfSpeech: "verb",
    meaning: "To use ambiguous language to conceal the truth or avoid commitment",
    examples: [
      { show: "Friends", quote: "Ross would equivocate whenever asked about Rachel." },
      { show: "Modern Family", quote: "Phil tended to equivocate when Claire asked direct questions." }
    ]
  },
  {
    id: 30,
    word: "Erudite",
    partOfSpeech: "adjective",
    meaning: "Having or showing great knowledge or learning",
    examples: [
      { show: "Big Bang Theory", quote: "The erudite discussions at lunch covered quantum physics." },
      { show: "Gilmore Girls", quote: "Richard's erudite knowledge of history impressed everyone." }
    ]
  }
];

export const getVocabularyByLetter = (letter: string): VocabWord[] => {
  return vocabularyList.filter(word => 
    word.word.toLowerCase().startsWith(letter.toLowerCase())
  );
};

export const searchVocabulary = (query: string): VocabWord[] => {
  const lowerQuery = query.toLowerCase();
  return vocabularyList.filter(word =>
    word.word.toLowerCase().includes(lowerQuery) ||
    word.meaning.toLowerCase().includes(lowerQuery)
  );
};
