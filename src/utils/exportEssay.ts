import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { GRETopic } from "@/data/greTopics";

export const exportEssayAsDocx = async (
  essay: string,
  topic: GRETopic | null,
  wordCount: number
) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "GRE AWA Essay",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Type: ${topic?.type?.toUpperCase() || "Custom"} | Word Count: ${wordCount}`,
                italics: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Topic:",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: topic?.topic || "Custom topic",
                italics: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Instructions:",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: topic?.instructions || "Write your response.",
                italics: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Essay:",
            heading: HeadingLevel.HEADING_2,
          }),
          ...essay.split("\n").map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24,
                  }),
                ],
                spacing: { after: 200 },
              })
          ),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated with ScoreWise - Made by Mithil & Hasti for GRE Warriors",
                italics: true,
                size: 20,
                color: "666666",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `GRE_Essay_${topic?.type || "custom"}_${Date.now()}.docx`;
  saveAs(blob, fileName);
};
