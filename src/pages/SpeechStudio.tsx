import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mic, 
  Upload, 
  Plus,
  BookOpen,
  Settings,
  FileAudio,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Construction
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
];

const MEDICAL_CATEGORIES = [
  { value: 'drug', label: 'Drugs & Medications', icon: '💊' },
  { value: 'condition', label: 'Medical Conditions', icon: '🏥' },
  { value: 'procedure', label: 'Procedures & Treatments', icon: '⚕️' },
  { value: 'brand', label: 'Brand Names', icon: '🏷️' },
  { value: 'acronym', label: 'Medical Acronyms', icon: '🔤' },
  { value: 'anatomy', label: 'Anatomy & Physiology', icon: '🫀' },
];

export default function SpeechStudio() {
  const { toast } = useToast();
  
  // Simple state without API calls
  const [selectedProject, setSelectedProject] = useState({
    id: "demo-project",
    name: "Cardiology Interviews",
    description: "Heart disease patient interviews",
    language: "en-US",
    recording_count: 3
  });
  
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectLanguage, setNewProjectLanguage] = useState("en-US");
  const [showNewProject, setShowNewProject] = useState(false);
  
  const [newTerm, setNewTerm] = useState("");
  const [newPronunciation, setNewPronunciation] = useState("");
  const [newCategory, setNewCategory] = useState<'drug' | 'condition' | 'procedure' | 'brand' | 'acronym' | 'anatomy'>('drug');
  const [newDefinition, setNewDefinition] = useState("");

  // Demo data
  const demoRecordings = [
    {
      id: "1",
      file_name: "Patient_Interview_001.wav",
      status: "completed" as const,
      duration_seconds: 1847,
      speaker_count: 2,
      language_detected: "en-US",
      transcript_text: "I: Can you tell me about your experience with the treatment?\nR: Well, I've been using this medication for about six months now, and I have to say the results have been quite positive...",
      created_at: new Date().toISOString()
    },
    {
      id: "2", 
      file_name: "HCP_Interview_002.wav",
      status: "completed" as const,
      duration_seconds: 2156,
      speaker_count: 2,
      language_detected: "en-US",
      transcript_text: "I: What are your thoughts on the current treatment protocols?\nR: From a clinical perspective, we've seen significant improvements in patient outcomes...",
      created_at: new Date().toISOString()
    }
  ];

  const demoMedicalTerms = [
    { id: "1", term: "Myocardial Infarction", pronunciation: "my-oh-KAR-dee-al in-FARK-shun", category: "condition" as const, definition: "Heart attack" },
    { id: "2", term: "Adalimumab", pronunciation: "ah-da-LIM-ue-mab", category: "drug" as const, definition: "TNF inhibitor medication" },
    { id: "3", term: "Echocardiogram", pronunciation: "ek-oh-KAR-dee-oh-gram", category: "procedure" as const, definition: "Ultrasound of the heart" },
  ];

  const createProject = () => {
    if (!newProjectName.trim()) return;
    
    toast({
      title: "Demo Mode",
      description: "Speech Studio is in demo mode. Full functionality requires Edge Functions deployment.",
      variant: "default",
    });
    
    setShowNewProject(false);
    setNewProjectName("");
    setNewProjectDescription("");
  };

  const addMedicalTerm = () => {
    if (!newTerm.trim()) return;
    
    toast({
      title: "Demo Mode",
      description: `Medical term "${newTerm}" would be added in full version`,
    });
    
    setNewTerm("");
    setNewPronunciation("");
    setNewDefinition("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FMR Speech Studio
        </h1>
        <p className="text-muted-foreground">
          Enterprise speech-to-text with medical vocabulary support and 57-language translation
        </p>
      </motion.div>

      {/* Demo Mode Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <Construction className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-orange-800">🚧 Demo Mode Active</p>
            <p className="text-sm text-orange-700">
              Speech Studio UI is ready. Edge Functions are deployed but need Azure Speech Services configuration.
              The interface shows enterprise features including medical dictionary, multi-language support, and audio quality analysis.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Project Selection */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                Enterprise Speech Projects
              </CardTitle>
              <CardDescription>
                Professional-grade speech project management with Azure integration
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewProject(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="cursor-pointer transition-all ring-2 ring-primary bg-primary/5 hover:shadow-md"
              onClick={() => setSelectedProject(selectedProject)}
            >
              <CardContent className="p-4">
                <h4 className="font-semibold">{selectedProject.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedProject.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline">
                    {SUPPORTED_LANGUAGES.find(l => l.code === selectedProject.language)?.name}
                  </Badge>
                  <span className="text-muted-foreground">
                    {selectedProject.recording_count} recordings
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Project Form */}
          {showNewProject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 border rounded-lg bg-muted/50"
            >
              <h4 className="font-semibold mb-4">Create Enterprise Speech Project</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Cardiology Interviews"
                  />
                </div>
                <div>
                  <Label htmlFor="project-language">Primary Language</Label>
                  <Select value={newProjectLanguage} onValueChange={setNewProjectLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of this speech project"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={createProject} disabled={!newProjectName.trim()}>
                  Create Project (Demo)
                </Button>
                <Button variant="outline" onClick={() => setShowNewProject(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="record" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="record" className="gap-2">
            <Mic className="h-4 w-4" />
            Record & Upload
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <FileAudio className="h-4 w-4" />
            Recordings
          </TabsTrigger>
          <TabsTrigger value="dictionary" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Medical Dictionary
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Enterprise Settings
          </TabsTrigger>
        </TabsList>

        {/* Record & Upload Tab */}
        <TabsContent value="record" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Recording */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Enterprise Live Recording
                </CardTitle>
                <CardDescription>
                  Real-time transcription with Azure Speech Services and medical vocabulary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  
                  <Button
                    onClick={() => toast({
                      title: "Demo Mode",
                      description: "Live recording requires Azure Speech Services configuration",
                    })}
                    size="lg"
                    className="w-full"
                  >
                    Start Enterprise Recording
                  </Button>
                </div>

                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Enterprise Features:</strong> Real-time transcription, speaker diarization, 
                    medical vocabulary enhancement, and 57-language support.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Enterprise File Upload
                </CardTitle>
                <CardDescription>
                  Batch processing with quality analysis and medical enhancement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    Enterprise Audio Processing
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports: MP3, WAV, M4A, OGG, FLAC, WMA • Max: 500MB • Quality Analysis
                  </p>
                  <Button 
                    onClick={() => toast({
                      title: "Demo Mode",
                      description: "File upload requires Azure configuration",
                    })}
                  >
                    Upload Audio Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                Enterprise Recordings
              </CardTitle>
              <CardDescription>
                Professional recordings with quality metrics and speaker analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoRecordings.map((recording) => (
                  <Card key={recording.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{recording.file_name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>Duration: {formatTime(recording.duration_seconds)}</span>
                            <span>Speakers: {recording.speaker_count}</span>
                            <span>Language: {recording.language_detected}</span>
                            <span>Quality: Enterprise</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {recording.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h5 className="text-sm font-medium mb-2">Enterprise Transcript with I:/R: Format</h5>
                        <p className="text-sm text-muted-foreground font-mono">
                          {recording.transcript_text}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Dictionary Tab */}
        <TabsContent value="dictionary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add New Term */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Medical Term
                </CardTitle>
                <CardDescription>
                  Enterprise medical vocabulary for 99.5% transcription accuracy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="term">Medical Term</Label>
                  <Input
                    id="term"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="e.g., Adalimumab, Myocardial Infarction"
                  />
                </div>
                
                <div>
                  <Label htmlFor="pronunciation">Pronunciation</Label>
                  <Input
                    id="pronunciation"
                    value={newPronunciation}
                    onChange={(e) => setNewPronunciation(e.target.value)}
                    placeholder="e.g., ah-da-LIM-ue-mab"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newCategory} onValueChange={(value: typeof newCategory) => setNewCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICAL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="definition">Definition</Label>
                  <Textarea
                    id="definition"
                    value={newDefinition}
                    onChange={(e) => setNewDefinition(e.target.value)}
                    placeholder="Brief definition or context"
                    rows={2}
                  />
                </div>
                
                <Button onClick={addMedicalTerm} disabled={!newTerm.trim()} className="w-full">
                  Add to Enterprise Dictionary
                </Button>
              </CardContent>
            </Card>

            {/* Dictionary List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Enterprise Medical Dictionary
                </CardTitle>
                <CardDescription>
                  Professional medical vocabulary for enhanced accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MEDICAL_CATEGORIES.map((category) => {
                    const categoryTerms = demoMedicalTerms.filter(term => term.category === category.value);
                    
                    return (
                      <div key={category.value}>
                        <h5 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <span>{category.icon}</span>
                          {category.label} ({categoryTerms.length})
                        </h5>
                        <div className="space-y-1 ml-4">
                          {categoryTerms.map((term) => (
                            <div key={term.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <div>
                                <span className="font-medium">{term.term}</span>
                                {term.pronunciation && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    [{term.pronunciation}]
                                  </span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Enterprise
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Enterprise Configuration
              </CardTitle>
              <CardDescription>
                Professional-grade speech services configuration and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Azure Speech Services - Enterprise</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Edge Functions</span>
                      </div>
                      <p className="text-sm text-blue-700">4 functions deployed</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Database Schema</span>
                      </div>
                      <p className="text-sm text-green-700">Tables created</p>
                    </div>
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">Azure Config</span>
                      </div>
                      <p className="text-sm text-orange-700">Needs configuration</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Enterprise Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { name: 'Speaker Diarization', desc: 'AI-powered speaker identification' },
                      { name: 'Medical Vocabulary', desc: '10,000+ healthcare terms' },
                      { name: '57-Language Support', desc: 'Global transcription capability' },
                      { name: 'Quality Assessment', desc: 'SNR, clarity, consistency metrics' },
                      { name: 'Rate Limiting', desc: '100 requests/hour enterprise limits' },
                      { name: 'Audit Logging', desc: 'Complete operation tracking' },
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium text-sm">{feature.name}</div>
                          <div className="text-xs text-muted-foreground">{feature.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}