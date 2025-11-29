export interface IELTSTask2Topic {
  id: string;
  type: 'opinion' | 'discussion' | 'problem-solution' | 'advantages-disadvantages' | 'two-part';
  topic: string;
  instructions: string;
}

export const ieltsTask2Topics: IELTSTask2Topic[] = [
  // Opinion Essays
  {
    id: "t2-001",
    type: "opinion",
    topic: "Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-002",
    type: "opinion",
    topic: "In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-003",
    type: "opinion",
    topic: "Some people think that parents should teach children how to be good members of society. Others, however, believe that school is the place to learn this. Discuss both views and give your own opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  
  // Discussion Essays
  {
    id: "t2-004",
    type: "discussion",
    topic: "Some people prefer to spend their lives doing the same things and avoiding change. Others, however, think that change is always a good thing. Discuss both these views and give your own opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-005",
    type: "discussion",
    topic: "Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations. Discuss both views and give your own opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  
  // Problem-Solution Essays
  {
    id: "t2-006",
    type: "problem-solution",
    topic: "In many cities, the use of video cameras in public places is being increased in order to reduce crime, but some people believe that these measures restrict our individual freedom. Do the benefits of increased security outweigh the drawbacks?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-007",
    type: "problem-solution",
    topic: "Global warming is one of the most serious issues that the world is facing today. What are the causes of global warming and what measures can governments and individuals take to tackle the issue?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-008",
    type: "problem-solution",
    topic: "Many working people get little or no exercise either during the working day or in their free time and have health problems as a result. Why do so many working people not get enough exercise? What can be done about this problem?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  
  // Advantages-Disadvantages Essays
  {
    id: "t2-009",
    type: "advantages-disadvantages",
    topic: "In some countries, many more people are choosing to live alone nowadays than in the past. Do you think this is a positive or negative development?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-010",
    type: "advantages-disadvantages",
    topic: "Today more people are travelling than ever before. Why is this the case? What are the benefits of travelling for the traveller?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  
  // Two-Part Questions
  {
    id: "t2-011",
    type: "two-part",
    topic: "Many museums charge for admission while others are free. Do you think the advantages of charging people for admission to museums outweigh the disadvantages?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-012",
    type: "two-part",
    topic: "Some people say that advertising is extremely successful at persuading us to buy things. Other people think that advertising is so common that we no longer pay attention to it. Discuss both views and give your own opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-013",
    type: "opinion",
    topic: "Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology. Discuss both views and give your own opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-014",
    type: "problem-solution",
    topic: "The internet has transformed the way information is shared and consumed, but it has also created problems that did not exist before. What are the most serious problems associated with the internet and what solutions can you suggest?",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
  {
    id: "t2-015",
    type: "discussion",
    topic: "Some people believe that there should be fixed punishments for each type of crime. Others, however, argue that the circumstances of an individual crime, and the motivation for committing it, should always be taken into account when deciding on the punishment. Discuss both views and give your opinion.",
    instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
  },
];

export const getRandomTask2Topic = (type?: IELTSTask2Topic['type']): IELTSTask2Topic => {
  const topics = type 
    ? ieltsTask2Topics.filter(t => t.type === type)
    : ieltsTask2Topics;
  return topics[Math.floor(Math.random() * topics.length)];
};

export const task2TypeLabels: Record<IELTSTask2Topic['type'], string> = {
  'opinion': 'Opinion',
  'discussion': 'Discussion',
  'problem-solution': 'Problem & Solution',
  'advantages-disadvantages': 'Advantages & Disadvantages',
  'two-part': 'Two-Part Question',
};
