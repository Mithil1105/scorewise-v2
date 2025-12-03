export interface IELTSGeneralTask1Topic {
  id: string;
  type: "formal" | "informal" | "semi-formal";
  topic: string;
  instructions: string;
}

// General Task 1 will primarily use custom topic input
// This file provides structure and can be extended with sample topics if needed
export const ieltsGeneralTask1Topics: IELTSGeneralTask1Topic[] = [
  // Sample topics - users will primarily use custom input
  {
    id: "gt1-001",
    type: "formal",
    topic: "Write a letter to the manager of a hotel where you stayed recently. In your letter, explain what problems you experienced during your stay and suggest what should be done to improve the service.",
    instructions: "Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: Dear Sir or Madam,",
  },
  {
    id: "gt1-002",
    type: "informal",
    topic: "Write a letter to a friend who is coming to visit you. In your letter, tell them about the arrangements you have made for their visit and ask them to confirm their travel plans.",
    instructions: "Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: Dear [Friend's Name],",
  },
  {
    id: "gt1-003",
    type: "semi-formal",
    topic: "Write a letter to your landlord complaining about the noise from your neighbors. In your letter, explain the situation and ask them to take action.",
    instructions: "Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: Dear [Landlord's Name],",
  },
];

export function getRandomGeneralTask1Topic(): IELTSGeneralTask1Topic {
  const topics = ieltsGeneralTask1Topics;
  return topics[Math.floor(Math.random() * topics.length)];
}

