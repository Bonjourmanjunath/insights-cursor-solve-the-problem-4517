import { parseGuide } from "../lib/guide-parser";

describe("Guide Parser", () => {
  test("parses array format correctly", async () => {
    const input = [
      { theme: "Warm-up", question: "Please introduce yourself." },
      { theme: "Current Practices", question: "Describe your workflow." },
    ];

    const result = await parseGuide(input);

    expect(result).toHaveLength(2);
    expect(result[0].theme).toBe("Warm-up");
    expect(result[0].question).toBe("Please introduce yourself.");
    expect(result[1].theme).toBe("Current Practices");
  });

  test("parses string format with bullets", async () => {
    const input = `
      A. Warm-up
      * Please introduce yourself.
      * Tell me about your role.
      
      B. Current Practices
      * Describe your workflow.
      * What challenges do you face?
    `;

    const result = await parseGuide(input);

    expect(result).toHaveLength(4);
    expect(result[0].theme).toBe("Warm-up");
    expect(result[0].question).toBe("Please introduce yourself.");
    expect(result[2].theme).toBe("Current Practices");
    expect(result[2].question).toBe("Describe your workflow.");
  });

  test("parses string format with numbered items", async () => {
    const input = `
      A. Warm-up
      1. Please introduce yourself.
      2. Tell me about your role.
      
      B. Current Practices
      1. Describe your workflow.
      2. What challenges do you face?
    `;

    const result = await parseGuide(input);

    expect(result).toHaveLength(4);
    expect(result[0].theme).toBe("Warm-up");
    expect(result[1].question).toBe("Tell me about your role.");
    expect(result[2].theme).toBe("Current Practices");
  });

  test("skips boilerplate text", async () => {
    const input = `
      Introduction
      Thank you for participating in this interview. Your responses will be confidential.
      
      A. Warm-up
      * Please introduce yourself.
      
      GDPR Notice: This interview is being recorded.
    `;

    const result = await parseGuide(input);

    expect(result).toHaveLength(1);
    expect(result[0].theme).toBe("Warm-up");
    expect(result[0].question).toBe("Please introduce yourself.");
  });

  test("handles malformed input gracefully", async () => {
    const input = "This is not a properly formatted guide.";

    // Should not throw but might return empty array
    const result = await parseGuide(input);
    expect(Array.isArray(result)).toBe(true);
  });
});
