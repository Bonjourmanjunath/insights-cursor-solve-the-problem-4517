import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { LocalGuideParser, ParsedSection } from "@/lib/local-guide-parser";
import { FileText, Zap, Copy, Download, RefreshCw } from "lucide-react";

/**
 * Simple Guide Parser - Works 100% locally!
 * No more edge function errors! This is like having a guide parser that works even on a desert island! 🏝️
 */
export default function SimpleGuideParser() {
  const [guideText, setGuideText] = useState("");
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const { toast } = useToast();

  // Sample guide text for testing
  const sampleGuide = `How do you expect demand for glucosamine to evolve in your country over the next 3-5 years?

(Hospital Pharmacists & HCPs) Taking into account all the benefits of glucosamine, including reimbursement and any other factors, for which conditions do you see glucosamine prescribed in the future?

What emerging risk factors could threaten stable glucosamine supply in the future?

What would make a supplier more competitive in winning glucosamine tenders in your country? (Challenge respondents to move beyond the "pricing" criterion.)

Thank you for the time and answers!`;

  const handleParse = () => {
    if (!guideText.trim()) {
      toast({
        title: "Oops! 🤔",
        description: "Please enter a discussion guide text. It's like trying to make a sandwich without bread!",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);

    // Simulate a tiny delay to show the user something is happening
    setTimeout(() => {
      try {
        const sections = LocalGuideParser.parseGuide(guideText);
        setParsedSections(sections);
        
        toast({
          title: "Success! 🎉",
          description: `Parsed ${sections.length} sections with ${sections.reduce((acc, s) => acc + s.questions.length + (s.subsections?.reduce((subAcc, sub) => subAcc + sub.questions.length, 0) || 0), 0)} questions total!`,
        });

        console.log("Parsed sections:", sections);
      } catch (error) {
        console.error("Parsing error:", error);
        toast({
          title: "Parsing Failed 😅",
          description: "Something went wrong. But hey, at least it didn't take 8 hours this time!",
          variant: "destructive",
        });
      } finally {
        setIsParsing(false);
      }
    }, 500);
  };

  const handleCopyJSON = () => {
    const jsonOutput = JSON.stringify(parsedSections, null, 2);
    navigator.clipboard.writeText(jsonOutput);
    toast({
      title: "Copied! 📋",
      description: "JSON copied to clipboard. Paste it wherever you need!",
    });
  };

  const handleDownloadJSON = () => {
    const jsonOutput = JSON.stringify(parsedSections, null, 2);
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parsed-discussion-guide.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded! 💾",
      description: "Your parsed guide is saved as JSON!",
    });
  };

  const handleReset = () => {
    setGuideText("");
    setParsedSections([]);
    toast({
      title: "Reset! 🔄",
      description: "Fresh start! Like hitting the reset button on a video game.",
    });
  };

  const handleUseSample = () => {
    setGuideText(sampleGuide);
    toast({
      title: "Sample Loaded! 📝",
      description: "Using the glucosamine guide sample. Parse it to see the magic!",
    });
  };

  // **Here's the education part:** This function counts all questions in a hierarchical structure
  const getTotalQuestions = (sections: ParsedSection[]) => {
    return sections.reduce((total, section) => {
      const sectionQuestions = section.questions.length;
      const subsectionQuestions = section.subsections?.reduce(
        (subTotal, subsection) => subTotal + subsection.questions.length,
        0
      ) || 0;
      return total + sectionQuestions + subsectionQuestions;
    }, 0);
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Simple Guide Parser
        </h1>
        <p className="text-muted-foreground text-lg">
          Works 100% locally! No edge functions, no timeouts, no tears! 😊
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Discussion Guide Text
            </CardTitle>
            <CardDescription>
              Paste your discussion guide below. We'll parse it faster than you can say "glucosamine"!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your discussion guide text here..."
              value={guideText}
              onChange={(e) => setGuideText(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleParse} 
                disabled={isParsing}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {isParsing ? "Parsing..." : "Parse Guide"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleUseSample}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Use Sample
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Parsed Structure
              </span>
              {parsedSections.length > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {parsedSections.length} sections
                  </Badge>
                  <Badge variant="secondary">
                    {getTotalQuestions(parsedSections)} questions
                  </Badge>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Your guide structure will appear here. It's like X-ray vision for documents! 🔍
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedSections.length > 0 ? (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  {parsedSections.map((section, sIndex) => (
                    <div key={section.id} className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">
                        {sIndex + 1}. {section.title}
                      </h3>
                      
                      {/* Direct questions */}
                      {section.questions.length > 0 && (
                        <div className="ml-4 space-y-1 mb-3">
                          {section.questions.map((question, qIndex) => (
                            <div key={qIndex} className="text-sm text-muted-foreground">
                              • {question}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Subsections */}
                      {section.subsections && section.subsections.map((subsection, subIndex) => (
                        <div key={subsection.id} className="ml-4 mb-4">
                          <h4 className="font-medium mb-1">
                            {sIndex + 1}.{subIndex + 1} {subsection.title}
                          </h4>
                          <div className="ml-4 space-y-1">
                            {subsection.questions.map((question, qIndex) => (
                              <div key={qIndex} className="text-sm text-muted-foreground">
                                • {question}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleCopyJSON}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleDownloadJSON}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <Zap className="h-12 w-12 mx-auto opacity-20" />
                  <p>No parsed content yet. Click "Parse Guide" to see the magic!</p>
                  <p className="text-sm">
                    **Here's the education part:** This parser looks for patterns like numbered lists,
                    questions (ending with ?), and section headers to structure your guide.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Education Box */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-blue-700 dark:text-blue-400">
            🎓 Here's the education part:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
          <p>
            <strong>Why this works:</strong> Instead of relying on external services (edge functions), 
            this parser runs 100% in your browser. It's like having a chef cook in your kitchen 
            instead of ordering delivery that never arrives!
          </p>
          <p>
            <strong>How it works:</strong> The parser looks for patterns in your text:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Section headers (like "1.", "A.", "Section 1")</li>
            <li>Subsection headers (like "1.1", "(a)", "a)")</li>
            <li>Questions (ending with "?" or starting with question words)</li>
          </ul>
          <p>
            <strong>Pro tip:</strong> Structure your guide with clear numbering and question marks 
            for best results. The parser is like a detective - the more clues you give it, the better it works!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}