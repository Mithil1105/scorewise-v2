export interface GRETopic {
  id: number;
  type: 'issue' | 'argument';
  topic: string;
  instructions: string;
}

export const greIssueTopics: GRETopic[] = [
  {
    id: 1,
    type: 'issue',
    topic: "As people rely more and more on technology to solve problems, the ability of humans to think for themselves will surely deteriorate.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take. In developing and supporting your position, you should consider ways in which the statement might or might not hold true and explain how these considerations shape your position."
  },
  {
    id: 2,
    type: 'issue',
    topic: "Scandals are useful because they focus our attention on problems in ways that no speaker or reformer ever could.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the claim. In developing and supporting your position, be sure to address the most compelling reasons and/or examples that could be used to challenge your position."
  },
  {
    id: 3,
    type: 'issue',
    topic: "Claim: Governments must ensure that their major cities receive the financial support they need in order to thrive.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the claim. In developing and supporting your position, be sure to address the most compelling reasons and/or examples that could be used to challenge your position."
  },
  {
    id: 4,
    type: 'issue',
    topic: "Some people believe that government funding of the arts is necessary to ensure that the arts can flourish and be available to all people. Others believe that government funding of the arts threatens the integrity of the arts.",
    instructions: "Write a response in which you discuss which view more closely aligns with your own position and explain your reasoning for the position you take. In developing and supporting your position, you should address both of the views presented."
  },
  {
    id: 5,
    type: 'issue',
    topic: "Claim: In any field—business, politics, education, government—those in power should step down after five years.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the claim. In developing and supporting your position, be sure to address the most compelling reasons and/or examples that could be used to challenge your position."
  },
  {
    id: 6,
    type: 'issue',
    topic: "The best way to teach is to praise positive actions and ignore negative ones.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take. In developing and supporting your position, you should consider ways in which the statement might or might not hold true and explain how these considerations shape your position."
  },
  {
    id: 7,
    type: 'issue',
    topic: "Governments should offer a free university education to any student who has been admitted to a university but who cannot afford the tuition.",
    instructions: "Write a response in which you discuss your views on the policy and explain your reasoning for the position you take. In developing and supporting your position, you should consider the possible consequences of implementing the policy and explain how these consequences shape your position."
  },
  {
    id: 8,
    type: 'issue',
    topic: "Educational institutions should actively encourage their students to choose fields of study that will prepare them for lucrative careers.",
    instructions: "Write a response in which you discuss the extent to which you agree or disagree with the claim. In developing and supporting your position, be sure to address the most compelling reasons and/or examples that could be used to challenge your position."
  },
];

export const greArgumentTopics: GRETopic[] = [
  {
    id: 101,
    type: 'argument',
    topic: "The following appeared in a memo from the director of student housing at Buckingham College: \"To serve the housing needs of our students, Buckingham College should build a number of new dormitories. Buckingham's enrollment is growing and, based on current trends, will double over the next 50 years, thus making existing dormitory space inadequate.\"",
    instructions: "Write a response in which you discuss what specific evidence is needed to evaluate the argument and explain how the evidence would weaken or strengthen the argument."
  },
  {
    id: 102,
    type: 'argument',
    topic: "The following appeared in a letter to the editor of the Balmer Island Gazette: \"On Balmer Island, weights of weights of weights have decreased. The population of tuna has doubled in the past five years. Clearly, eating fish is the key to weight loss.\"",
    instructions: "Write a response in which you examine the stated and/or unstated assumptions of the argument. Be sure to explain how the argument depends on these assumptions and what the implications are for the argument if the assumptions prove unwarranted."
  },
  {
    id: 103,
    type: 'argument',
    topic: "The following appeared in a health magazine published in Corpora: \"Medical experts say that only one-quarter of Corpora's citizens meet the current national fitness standards. A recent survey indicates that the weights of citizens in Corpora increased significantly during the past ten years.\"",
    instructions: "Write a response in which you discuss what questions would need to be answered in order to decide whether the recommendation and the argument on which it is based are reasonable. Be sure to explain how the answers to these questions would help to evaluate the recommendation."
  },
  {
    id: 104,
    type: 'argument',
    topic: "The following appeared in a memorandum from the manager of WWAC radio station: \"To reverse a decline in listener numbers, we should change from rock to country music. A survey conducted last month shows that most people in our listening area prefer country music.\"",
    instructions: "Write a response in which you examine the stated and/or unstated assumptions of the argument. Be sure to explain how the argument depends on these assumptions and what the implications are for the argument if the assumptions prove unwarranted."
  },
  {
    id: 105,
    type: 'argument',
    topic: "The following appeared in a letter from a firm providing investment advice to a client: \"Homes in the northeastern United States, where winters are generally cold, have much higher values than homes in other regions. Therefore, you should invest in a company that builds heating systems.\"",
    instructions: "Write a response in which you discuss what specific evidence is needed to evaluate the argument and explain how the evidence would weaken or strengthen the argument."
  },
];

export const getAllTopics = (): GRETopic[] => [...greIssueTopics, ...greArgumentTopics];

export const getRandomTopic = (type?: 'issue' | 'argument'): GRETopic => {
  const topics = type 
    ? (type === 'issue' ? greIssueTopics : greArgumentTopics)
    : getAllTopics();
  return topics[Math.floor(Math.random() * topics.length)];
};
