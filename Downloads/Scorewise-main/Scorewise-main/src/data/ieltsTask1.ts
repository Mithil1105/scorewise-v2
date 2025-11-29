export interface IELTSTask1Question {
  id: string;
  type: 'bar-chart' | 'line-graph' | 'pie-chart' | 'table' | 'map' | 'process' | 'mixed';
  title: string;
  description: string;
  imageUrl?: string;
  instructions: string;
}

export const ieltsTask1Questions: IELTSTask1Question[] = [
  {
    id: "t1-001",
    type: "bar-chart",
    title: "Internet Usage by Age Group",
    description: "The bar chart shows the percentage of people using the internet in different age groups across three countries (USA, UK, and Japan) in 2023.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-002",
    type: "line-graph",
    title: "Global Temperature Changes",
    description: "The line graph illustrates changes in global average temperatures from 1900 to 2020, showing data for both land and ocean temperatures.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-003",
    type: "pie-chart",
    title: "Household Energy Consumption",
    description: "The pie charts compare household energy consumption by source in Australia in 1980 and 2020.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-004",
    type: "table",
    title: "University Enrollment Statistics",
    description: "The table shows undergraduate enrollment figures for five universities in the UK between 2015 and 2022.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-005",
    type: "map",
    title: "Town Centre Development",
    description: "The maps show the development of a town centre between 1990 and 2020, highlighting changes in infrastructure, green spaces, and commercial areas.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-006",
    type: "process",
    title: "Water Recycling Process",
    description: "The diagram illustrates the process of recycling wastewater for household use, from collection to final distribution.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-007",
    type: "bar-chart",
    title: "Smartphone Ownership by Country",
    description: "The bar chart shows smartphone ownership rates per 100 people in six different countries between 2010 and 2022.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-008",
    type: "line-graph",
    title: "Tourism Revenue Trends",
    description: "The line graph shows international tourism revenue for four European countries (France, Spain, Italy, Germany) from 2000 to 2023.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-009",
    type: "mixed",
    title: "Coffee Production and Export",
    description: "The bar chart shows coffee production in tonnes for five countries, while the pie chart shows the proportion of coffee exported from each country.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
  {
    id: "t1-010",
    type: "process",
    title: "Chocolate Manufacturing",
    description: "The diagram shows the stages involved in manufacturing chocolate, from harvesting cocoa beans to the final product.",
    instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  },
];

export const getRandomTask1Question = (): IELTSTask1Question => {
  return ieltsTask1Questions[Math.floor(Math.random() * ieltsTask1Questions.length)];
};

export const getTask1ByType = (type: IELTSTask1Question['type']): IELTSTask1Question[] => {
  return ieltsTask1Questions.filter(q => q.type === type);
};
