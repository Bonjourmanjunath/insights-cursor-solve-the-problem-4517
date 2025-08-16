interface GuideItem {
  theme: string;
  question: string;
}

export async function parseGuide(
  guide: string | GuideItem[],
): Promise<GuideItem[]> {
  // If guide is already in the correct format, return it
  if (Array.isArray(guide) && guide.length > 0 && guide[0].question) {
    return guide.map((item) => ({
      theme: item.theme || "General",
      question: item.question,
    }));
  }

  // If guide is a string, parse it
  if (typeof guide === "string") {
    return parseGuideString(guide);
  }

  // If we get here, the guide format is invalid
  throw new Error(
    "Invalid guide format. Must be an array of {theme, question} objects or a string",
  );
}

function parseGuideString(guideText: string): GuideItem[] {
  const lines = guideText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const result: GuideItem[] = [];

  let currentTheme = "General";
  const sectionHeaderRegex = /^([A-Z]\.|[0-9]+\.|[IVX]+\.)\s*(.+)$/i;
  const bulletPointRegex = /^\s*[\*\-\u2022]\s+(.+)$/;
  const numberedItemRegex = /^\s*\d+[\.)\s]\s*(.+)$/;

  // Skip boilerplate text
  const boilerplateKeywords = [
    "thank you",
    "gdpr",
    "consent",
    "minutes",
    "introduction",
    "confidential",
    "recording",
    "disclosure",
    "welcome",
    "agenda",
  ];

  for (const line of lines) {
    // Check if line is a section header
    const sectionMatch = line.match(sectionHeaderRegex);
    if (sectionMatch) {
      currentTheme = sectionMatch[2].trim();
      continue;
    }

    // Check if line is a bullet point or numbered item
    const bulletMatch = line.match(bulletPointRegex);
    const numberedMatch = line.match(numberedItemRegex);

    if (bulletMatch || numberedMatch) {
      const questionText = (
        bulletMatch ? bulletMatch[1] : numberedMatch[1]
      ).trim();

      // Skip boilerplate
      const isBoilerplate = boilerplateKeywords.some((keyword) =>
        questionText.toLowerCase().includes(keyword),
      );

      if (!isBoilerplate && questionText.length > 10) {
        result.push({
          theme: currentTheme,
          question: questionText,
        });
      }
    }
  }

  return result;
}
