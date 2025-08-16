import axios from "axios";
import fs from "fs";
import path from "path";

// Configuration
const API_URL =
  process.env.API_URL || "http://localhost:7071/api/fmr-content-analysis";
const NUM_TRANSCRIPTS = process.env.NUM_TRANSCRIPTS
  ? parseInt(process.env.NUM_TRANSCRIPTS)
  : 2;
const NUM_QUESTIONS = process.env.NUM_QUESTIONS
  ? parseInt(process.env.NUM_QUESTIONS)
  : 10;

// Generate sample data
function generateSampleData() {
  // Generate sample transcripts
  const files = [];
  for (let i = 0; i < NUM_TRANSCRIPTS; i++) {
    const respondentName = `Respondent${i + 1}`;
    let content = "";

    // Generate transcript content with interviewer and respondent exchanges
    for (let j = 0; j < 20; j++) {
      content += `Interviewer: Question ${j + 1} about healthcare practices?\n`;
      content += `${respondentName}: This is my response to question ${j + 1}. `;
      content += `I work in a hospital setting with patients who have chronic conditions. `;
      content += `We typically follow standard protocols for treatment and assessment. `;
      content += `The challenges we face include limited resources and time constraints.\n\n`;
    }

    files.push({
      name: `Transcript_${i + 1}.txt`,
      label: respondentName,
      content,
    });
  }

  // Generate sample guide
  const guide = [];
  const themes = [
    "Warm-up",
    "Current Practices",
    "Challenges",
    "Future Outlook",
    "Closing",
  ];

  for (let i = 0; i < NUM_QUESTIONS; i++) {
    const themeIndex = Math.floor(i / (NUM_QUESTIONS / themes.length));
    guide.push({
      theme: themes[Math.min(themeIndex, themes.length - 1)],
      question: `Sample question ${i + 1} about healthcare practices and procedures?`,
    });
  }

  return { files, guide };
}

// Run load test
async function runLoadTest() {
  console.log(
    `Starting load test with ${NUM_TRANSCRIPTS} transcripts and ${NUM_QUESTIONS} questions`,
  );
  console.log(`API URL: ${API_URL}`);

  const startTime = Date.now();
  const sampleData = generateSampleData();

  try {
    console.log("Sending request...");
    const response = await axios.post(
      API_URL,
      {
        files: sampleData.files,
        guide: sampleData.guide,
        guideDescription: "Sample load test guide",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 300000, // 5 minute timeout
      },
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("Load test completed successfully");
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log("Response metadata:", response.data.analysis_metadata);

    // Save results to file
    const resultsDir = path.join(__dirname, "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsPath = path.join(resultsDir, `load-test-${timestamp}.json`);

    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          config: {
            numTranscripts: NUM_TRANSCRIPTS,
            numQuestions: NUM_QUESTIONS,
            apiUrl: API_URL,
          },
          timing: {
            startTime,
            endTime,
            durationSeconds: duration,
          },
          metadata: response.data.analysis_metadata,
          questionCount: response.data.fmr_dish.questions.length,
        },
        null,
        2,
      ),
    );

    console.log(`Results saved to ${resultsPath}`);
  } catch (error) {
    console.error("Load test failed:");
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Error: ${JSON.stringify(error.response?.data)}`);
    } else {
      console.error(error);
    }
  }
}

runLoadTest();
