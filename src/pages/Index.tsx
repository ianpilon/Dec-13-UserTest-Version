import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { FileUpload } from '@/components/FileUpload';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { SummaryView } from '@/components/SummaryView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { analyzeContent } from '@/lib/claude';
import { extractTextFromPDF, transcribeMedia } from '@/lib/fileProcessing';

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!file && !text && !mediaFile) {
      toast({
        title: "No content provided",
        description: "Please upload a file or enter text to summarize.",
        variant: "destructive",
      });
      return;
    }

    setShowSummary(true);
  };

  const handleAnalysis = async (type: string) => {
    try {
      let contentToAnalyze = text;
      
      if (file) {
        contentToAnalyze = await extractTextFromPDF(file);
      } else if (mediaFile) {
        contentToAnalyze = await transcribeMedia(mediaFile);
      }

      const result = await analyzeContent({
        content: contentToAnalyze,
        type: type as any
      });

      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBack = () => {
    setShowSummary(false);
    setFile(null);
    setMediaFile(null);
    setText('');
  };

  if (showSummary) {
    return (
      <div className="min-h-screen film-grain">
        <SummaryView 
          fileName={file?.name || mediaFile?.name || "Text Analysis"}
          onBack={handleBack}
          onAnalyze={handleAnalysis}
        />
      </div>
    );
  }

  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id='noiseFilter'>
          <feTurbulence 
            type='fractalNoise' 
            baseFrequency='0.6' 
            stitchTiles='stitch'
            numOctaves='3'
          />
        </filter>
      </svg>

      <div className="min-h-screen film-grain flex flex-col items-center justify-center">
        {/* Header */}
        <header className="w-full flex flex-col items-center space-y-6">
          <Logo />
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Evaluate customer research in seconds
            </h1>
            <p className="text-lg text-gray-600">
              Upload a file, video, audio or enter text to get deep analysis on your customers pain and get a problem solution fit score.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full flex flex-col items-center space-y-8 mt-12">
          <Tabs defaultValue="file" className="w-full max-w-xl">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">Upload PDF</TabsTrigger>
              <TabsTrigger value="media">Upload Media</TabsTrigger>
              <TabsTrigger value="text">Enter Text</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-6">
              <FileUpload onFileSelect={setFile} type="pdf" />
            </TabsContent>

            <TabsContent value="media" className="mt-6">
              <FileUpload onFileSelect={setMediaFile} type="media" />
            </TabsContent>

            <TabsContent value="text" className="mt-6">
              <Textarea 
                placeholder="Enter or paste your text here..."
                className="min-h-[200px] resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </TabsContent>
          </Tabs>
          
          <Button
            className="w-full max-w-xl h-12 text-base"
            onClick={handleGenerate}
            disabled={!file && !text && !mediaFile}
          >
            Generate Analysis
          </Button>
        </main>
      </div>
    </>
  );
};

export default Index;