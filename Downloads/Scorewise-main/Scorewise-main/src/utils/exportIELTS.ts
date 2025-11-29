import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { IELTSTask1Question } from "@/data/ieltsTask1";
import { IELTSTask2Topic } from "@/data/ieltsTask2";

export const exportIELTSTask1AsDocx = async (
  essay: string,
  question: IELTSTask1Question | null,
  wordCount: number,
  customImageUsed: boolean
) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "IELTS Writing Task 1",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Type: ${question?.type?.toUpperCase() || "Custom"} | Word Count: ${wordCount}`,
                italics: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Question:",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: question?.title || "Custom Question",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: question?.description || (customImageUsed ? "Custom uploaded image" : ""),
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
                text: question?.instructions || "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
                italics: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "Response:",
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
                text: "Generated with ScoreWise IELTS - Made by Mithil & Hasti — Be Band Ready.",
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
  const fileName = `IELTS_Task1_${question?.id || "custom"}_${Date.now()}.docx`;
  saveAs(blob, fileName);
};

export const exportIELTSTask2AsDocx = async (
  essay: string,
  topic: IELTSTask2Topic | null,
  wordCount: number
) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "IELTS Writing Task 2",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Type: ${topic?.type?.toUpperCase().replace('-', ' ') || "Custom"} | Word Count: ${wordCount}`,
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
                text: topic?.instructions || "Write at least 250 words.",
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
                text: "Generated with ScoreWise IELTS - Made by Mithil & Hasti — Be Band Ready.",
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
  const fileName = `IELTS_Task2_${topic?.id || "custom"}_${Date.now()}.docx`;
  saveAs(blob, fileName);
};
