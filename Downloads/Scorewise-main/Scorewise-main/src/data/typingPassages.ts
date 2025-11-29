export const typingPassages = [
  {
    id: 1,
    title: "The Scientific Method",
    text: "The scientific method represents one of humanity's greatest intellectual achievements. It provides a systematic approach to understanding the natural world through observation, hypothesis formation, experimentation, and analysis. Scientists must remain objective, carefully documenting their procedures so that others can replicate their findings. This reproducibility is essential for validating claims and building upon existing knowledge."
  },
  {
    id: 2,
    title: "Economic Principles",
    text: "Supply and demand form the fundamental basis of market economics. When demand for a product exceeds its supply, prices tend to rise. Conversely, when supply outpaces demand, prices typically fall. Understanding these dynamics helps businesses make informed decisions about production levels, pricing strategies, and inventory management. Market equilibrium occurs when supply and demand reach a balance."
  },
  {
    id: 3,
    title: "Environmental Conservation",
    text: "Climate change poses unprecedented challenges to ecosystems worldwide. Rising temperatures affect biodiversity, causing species to migrate or face extinction. Governments and organizations must collaborate on sustainable solutions, including renewable energy adoption and carbon emission reduction. Individual actions, such as reducing waste and conserving water, also contribute to environmental preservation efforts."
  },
  {
    id: 4,
    title: "Historical Analysis",
    text: "The Renaissance marked a profound transformation in European culture, spanning roughly from the fourteenth to the seventeenth century. This period witnessed remarkable advances in art, literature, science, and philosophy. Thinkers began questioning traditional authorities, emphasizing human reason and classical learning. The invention of the printing press accelerated the spread of new ideas across the continent."
  },
  {
    id: 5,
    title: "Technological Innovation",
    text: "Artificial intelligence continues to reshape industries and daily life. Machine learning algorithms analyze vast datasets, identifying patterns that humans might miss. While automation increases efficiency, it also raises ethical questions about privacy, employment, and decision-making. Balancing technological progress with human values remains a critical challenge for society."
  },
  {
    id: 6,
    title: "Social Dynamics",
    text: "Communities thrive when members engage in constructive dialogue and mutual support. Social cohesion depends on shared values, effective communication, and inclusive institutions. Research indicates that diverse perspectives enhance problem-solving and innovation. However, maintaining unity while respecting differences requires ongoing effort and commitment from all stakeholders."
  },
  {
    id: 7,
    title: "Educational Philosophy",
    text: "Critical thinking represents a cornerstone of quality education. Students must learn not only to absorb information but also to evaluate sources, question assumptions, and construct logical arguments. Teachers facilitate this process by encouraging curiosity and providing opportunities for independent exploration. Education should prepare individuals for lifelong learning and responsible citizenship."
  },
  {
    id: 8,
    title: "Health and Wellness",
    text: "Preventive healthcare emphasizes maintaining wellness rather than merely treating illness. Regular exercise, balanced nutrition, and adequate sleep contribute to physical and mental health. Medical professionals increasingly recognize the connection between lifestyle choices and disease prevention. Public health initiatives aim to educate communities about risk factors and promote healthy behaviors."
  },
];

export const getRandomPassage = () => {
  return typingPassages[Math.floor(Math.random() * typingPassages.length)];
};
