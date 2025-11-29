import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { ScoreResult } from "@/components/essay/AIScorePanel";

export const exportFeedbackAsDocx = async (
  result: ScoreResult,
  examType: "GRE" | "IELTS",
  taskType?: "task1" | "task2",
  topic?: string,
  essay?: string
) => {
  const maxScore = examType === "GRE" ? 6 : 9;
  const examLabel = examType === "GRE" 
    ? "GRE AWA" 
    : `IELTS Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'}`;

  const children: Paragraph[] = [
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: `${examLabel} - AI Score Report`,
          bold: true,
          size: 32,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    // Score
    new Paragraph({
      children: [
        new TextRun({
          text: `Score: ${result.score} / ${maxScore}`,
          bold: true,
          size: 48,
          color: result.score >= (maxScore * 0.7) ? "22C55E" : result.score >= (maxScore * 0.5) ? "CA8A04" : "EA580C",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),

    // Word Count
    new Paragraph({
      children: [
        new TextRun({
          text: `Word Count: ${result.word_count}`,
          size: 24,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  // Topic if available
  if (topic) {
    children.push(
      new Paragraph({
        text: "Topic",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: topic,
            italics: true,
          }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Feedback Section
  children.push(
    new Paragraph({
      text: "Feedback",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
    })
  );

  result.feedback.forEach((point) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "• ", bold: true, color: "22C55E" }),
          new TextRun({ text: point }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  // Areas to Improve
  children.push(
    new Paragraph({
      text: "Areas to Improve",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
    })
  );

  result.areas_to_improve.forEach((point) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "• ", bold: true, color: "CA8A04" }),
          new TextRun({ text: point }),
        ],
        spacing: { after: 100 },
      })
    );
  });

  // Essay content if provided
  if (essay) {
    children.push(
      new Paragraph({
        text: "Your Essay",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: essay }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  // Disclaimer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Note: This is automated scoring powered by Google Gemini and may not fully reflect official exam results.",
          italics: true,
          size: 20,
          color: "999999",
        }),
      ],
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "ScoreWise — Made by Mithil & Hasti",
          size: 20,
          color: "999999",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${examType}_Score_Report_${new Date().toISOString().split("T")[0]}.docx`;
  saveAs(blob, filename);
};
