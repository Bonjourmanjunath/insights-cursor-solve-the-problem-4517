import { processTranscripts } from "../lib/transcript-processor";

describe("Transcript Processor", () => {
  test("filters moderator content", async () => {
    const input = [
      {
        name: "test.txt",
        label: "Test",
        content: `
          Interviewer: How are you today?
          Respondent: I'm doing well, thank you.
          Interviewer: Can you tell me about your role?
          Respondent: I'm a nurse in the ER department.
        `,
      },
    ];

    const result = await processTranscripts(input);

    expect(result).toHaveLength(1);
    expect(result[0].fileId).toBe("test.txt");
    expect(result[0].label).toBe("Test");

    // Should only contain respondent lines
    const combinedChunkContent = result[0].chunks
      .map((c) => c.content)
      .join(" ");
    expect(combinedChunkContent).toContain("I'm doing well");
    expect(combinedChunkContent).toContain("I'm a nurse");
    expect(combinedChunkContent).not.toContain("How are you today?");
    expect(combinedChunkContent).not.toContain("Can you tell me about");
  });

  test("creates chunks with appropriate size", async () => {
    // Create a long transcript with repeated content
    const longContent = Array(50)
      .fill(
        "Respondent: This is a test response with enough content to create multiple chunks.",
      )
      .join("\n");

    const input = [
      {
        name: "long.txt",
        label: "Long",
        content: longContent,
      },
    ];

    const result = await processTranscripts(input);

    expect(result[0].chunks.length).toBeGreaterThan(1);

    // Check that chunks have reasonable size
    result[0].chunks.forEach((chunk) => {
      expect(chunk.tokenCount).toBeLessThan(2000);
      expect(chunk.windows.length).toBeGreaterThan(0);
    });
  });

  test("creates windows within chunks", async () => {
    const input = [
      {
        name: "test.txt",
        label: "Test",
        content: `
          Respondent: First answer that should be in the first window.
          Respondent: Second answer that might span across windows.
          Respondent: Third answer that should be in another window.
          Respondent: Fourth answer with more content to ensure multiple windows.
          Respondent: Fifth answer with even more content to push into different windows.
        `,
      },
    ];

    const result = await processTranscripts(input);

    // Check that windows were created
    const windows = result[0].chunks[0].windows;
    expect(windows.length).toBeGreaterThan(0);

    // Check window properties
    windows.forEach((window) => {
      expect(window.windowId).toContain("w");
      expect(window.content.length).toBeGreaterThan(0);
      expect(window.tokenCount).toBeGreaterThan(0);
    });
  });
});
