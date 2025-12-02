export interface IELTSTask2Topic {
  id: string;
  type: 'opinion' | 'discussion' | 'problem-solution' | 'advantages-disadvantages' | 'two-part';
  topic: string;
  instructions: string;
}

// Map JSON category names to TypeScript type names
const categoryTypeMap: Record<string, IELTSTask2Topic['type']> = {
  'opinion': 'opinion',
  'discussion': 'discussion',
  'problem_solution': 'problem-solution',
  'advantages_disadvantages': 'advantages-disadvantages',
  'two_part': 'two-part',
};

// Load topics from essays.json
let ieltsTask2Topics: IELTSTask2Topic[] = [];

// Function to load topics from essays.json
async function loadTopicsFromJSON(): Promise<IELTSTask2Topic[]> {
  try {
    const response = await fetch('/essays.json');
    if (!response.ok) {
      throw new Error('Failed to load essays.json');
    }
    const data = await response.json();
    
    const topics: IELTSTask2Topic[] = [];
    let idCounter = 1;
    
    // Process each category
    for (const [category, topicList] of Object.entries(data)) {
      const type = categoryTypeMap[category];
      if (!type || !Array.isArray(topicList)) {
        console.warn(`Unknown category or invalid format: ${category}`);
        continue;
      }
      
      // Add each topic in the category
      for (const topicText of topicList) {
        if (typeof topicText === 'string' && topicText.trim()) {
          topics.push({
            id: `t2-${String(idCounter).padStart(3, '0')}`,
            type,
            topic: topicText.trim(),
            instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
          });
          idCounter++;
        }
      }
    }
    
    return topics;
  } catch (error) {
    console.error('Error loading topics from essays.json:', error);
    // Return empty array if loading fails
    return [];
  }
}

// Initialize topics - load synchronously if possible, otherwise use async
let topicsLoaded = false;
loadTopicsFromJSON().then(loadedTopics => {
  ieltsTask2Topics = loadedTopics;
  topicsLoaded = true;
}).catch(error => {
  console.error('Failed to load topics:', error);
});

// Export a getter function that ensures topics are loaded
export const getIELTSTask2Topics = async (): Promise<IELTSTask2Topic[]> => {
  if (topicsLoaded && ieltsTask2Topics.length > 0) {
    return ieltsTask2Topics;
  }
  const topics = await loadTopicsFromJSON();
  ieltsTask2Topics = topics;
  topicsLoaded = true;
  return topics;
};

// For backward compatibility, export the array (will be populated after first load)
export { ieltsTask2Topics };

export const getRandomTask2Topic = async (type?: IELTSTask2Topic['type']): Promise<IELTSTask2Topic> => {
  const topics = await getIELTSTask2Topics();
  const filteredTopics = type 
    ? topics.filter(t => t.type === type)
    : topics;
  
  if (filteredTopics.length === 0) {
    throw new Error(`No topics found${type ? ` for type: ${type}` : ''}`);
  }
  
  return filteredTopics[Math.floor(Math.random() * filteredTopics.length)];
};

export const task2TypeLabels: Record<IELTSTask2Topic['type'], string> = {
  'opinion': 'Opinion',
  'discussion': 'Discussion',
  'problem-solution': 'Problem & Solution',
  'advantages-disadvantages': 'Advantages & Disadvantages',
  'two-part': 'Two-Part Question',
};
