import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, ArrowLeft, Loader2, CheckCircle2, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SharePDFModal } from './SharePDFModal';

interface AnalysisResult {
  content: string;
  completed: boolean;
  error?: string;
}

interface AnalysisState {
  [key: string]: AnalysisResult;
}

interface SummaryViewProps {
  fileName: string;
  onBack: () => void;
  onAnalyze: (type: string) => Promise<string>;
}

type SummaryType = typeof summaryTypes[number]['id'];

const summaryTypes = [
  { 
    id: 'jtbd-analysis', 
    label: 'JTBD Goal Analysis',
    description: 'Analyzes the transcript to identify and extract Jobs-to-be-Done (JTBD) goals mentioned by the interviewee'
  },
  {
    id: 'gain-extractor',
    label: 'JTBD Gains Analysis',
    description: 'Identifies and analyzes potential gains or positive outcomes that the interviewee hopes to achieve, aligning with the Jobs-to-be-Done framework'
  },
  {
    id: 'needs',
    label: 'Needs Analysis Agent',
    description: 'Analyzes discovery call transcripts to identify both immediate and latent needs, examining indicators like urgency, metrics, stakeholder requirements, and potential future risks.'
  },
  {
    id: 'pain-extractor',
    label: 'JTBD Pains Analysis',
    description: 'Identifies and analyzes the pains, challenges, or frustrations mentioned by the interviewee, aligning with the Jobs-to-be-Done framework'
  },
  {
    id: 'friction',
    label: 'Preventions of Progress Analysis',
    description: 'Identifies and analyzes the obstacles or frictions that prevent the interviewee from making progress towards their goals, aligning with the Jobs-to-be-Done framework'
  },
  {
    id: 'pain-assessment',
    label: 'Problem Severity Scoring Agent',
    description: 'Systematically evaluates and compares how an individual perceives and expresses the pain level of their problems using a Pain Level Scoring Rubric.'
  },
  {
    id: 'curse',
    label: 'CURSE Problem Analyst',
    description: 'Evaluates customer pain points using a comprehensive 5-level scoring system to determine problem severity, urgency, and readiness to purchase. Analyzes if problems are Crucial, Ubiquitous, Recurring, Specific, and Extreme.'
  },
  {
    id: 'demand',
    label: 'Demand Analyst',
    description: 'Analyzes sales conversation transcripts to determine customer position in the buying cycle, evaluating Learning Demand (6-24mo), Solution Demand (3-6mo), or Vendor Demand (1-3mo) levels with supporting evidence and confidence scoring.'
  },
  {
    id: 'opportunity',
    label: 'Opportunity Qualification Agent',
    description: 'Evaluates if the interviewee represents a qualified opportunity based on problem experience, active search, and problem fit'
  },
  {
    id: 'final-report',
    label: 'Final Report',
    description: 'Comprehensive summary of all analyses'
  }
] as const;

export const SummaryView = ({ fileName, onBack, onAnalyze }: SummaryViewProps) => {
  const [selectedType, setSelectedType] = useState<SummaryType>('jtbd-analysis');
  const [analyses, setAnalyses] = useState<AnalysisState>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { toast } = useToast();

  const runAnalysis = async (type: string): Promise<boolean> => {
    if (analyses[type]?.completed) return true;
    
    setProcessing(type);
    setProgress(0);
    let progressInterval: NodeJS.Timeout;
    
    try {
      progressInterval = setInterval(() => {
        setProgress(prev => (prev >= 90 ? prev : prev + 10));
      }, 1000);

      const result = await onAnalyze(type);
      
      clearInterval(progressInterval);
      setProgress(100);

      setAnalyses(prev => ({
        ...prev,
        [type]: { content: result, completed: true }
      }));

      return true;
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error(`Error analyzing ${type}:`, error);
      setAnalyses(prev => ({
        ...prev,
        [type]: { error: error instanceof Error ? error.message : 'Analysis failed' }
      }));
      return false;
    } finally {
      setProcessing(null);
    }
  };

  const runAnalysisSequence = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    for (const type of summaryTypes) {
      if (!analyses[type.id]?.completed) {
        const success = await runAnalysis(type.id);
        if (!success) {
          toast({
            title: "Analysis failed",
            description: `Failed to complete ${type.label}. Stopping sequence.`,
            variant: "destructive",
          });
          break;
        }
        // Add a small delay between analyses
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsAnalyzing(false);
  };

  const handleAnalyze = async (type: string) => {
    await runAnalysis(type);
  };

  // Helper function to get formatted timestamp
  const getFormattedTimestamp = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];  // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');  // HH-MM-SS
    return `${date} - ${time}`;
  };

  const handleDownload = async () => {
    try {
      const completedAnalyses = summaryTypes
        .filter(type => analyses[type.id]?.completed)
        .map(type => ({
          label: type.label,
          description: type.description,
          content: analyses[type.id]?.content
        }));

      if (completedAnalyses.length === 0) {
        toast({
          title: "No completed analyses",
          description: "Please wait for analyses to complete before downloading.",
          variant: "destructive",
        });
        return;
      }

      const htmlContent = generateReportHtml();

      const response = await fetch('https://dec-13-usertest-version.onrender.com/api/convert-to-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          fileName: `${fileName.replace(/\.[^/.]+$/, '')}_analysis`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      
      // Verify blob content type and size
      console.log('PDF blob type:', blob.type);
      console.log('PDF blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Customer Research Analysis Report - ${getFormattedTimestamp()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "PDF report downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const generateReportHtml = () => {
    const completedAnalyses = summaryTypes
      .filter(type => analyses[type.id]?.completed)
      .map(type => ({
        label: type.label,
        description: type.description,
        content: analyses[type.id]?.content
      }));

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Analyst Side Kick - ${fileName}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              max-width: 800px; 
              margin: 40px auto; 
              padding: 0 20px;
              line-height: 1.6;
            }
            h1 { 
              color: #333;
              font-size: 24px;
              margin-bottom: 20px;
            }
            h2 { 
              color: #666;
              font-size: 20px;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            pre { 
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              white-space: pre-wrap;
              word-wrap: break-word;
              overflow-wrap: break-word;
              font-size: 14px;
              line-height: 1.5;
              max-width: 100%;
            }
            p {
              margin: 10px 0;
            }
            em {
              color: #666;
              font-style: italic;
            }
            section {
              margin: 30px 0;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <h1>Customer Analyst Side Kick - ${fileName}</h1>
          ${completedAnalyses.map(analysis => `
            <section>
              <h2>${analysis.label}</h2>
              <p><em>${analysis.description}</em></p>
              <pre>${analysis.content}</pre>
            </section>
          `).join('')}
        </body>
      </html>
    `;
  };

  // Start the analysis sequence when component mounts
  useEffect(() => {
    runAnalysisSequence();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F5F5]">
      {/* Fixed Header */}
      <div className="flex-none flex justify-between items-center p-4 border-b bg-white">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 min-h-0">
        <div className="h-full bg-white rounded-lg shadow-sm p-6 flex flex-col">
          {/* Fixed Title */}
          <h1 className="flex-none text-2xl font-semibold mb-6">Customer Analyst Side Kick</h1>
          
          {/* Scrollable Content Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Sidebar - Analysis Types */}
            <div className="col-span-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
              <div className="space-y-2">
                {summaryTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedType === type.id ? 'bg-gray-200 text-gray-900' :
                      processing === type.id ? 'bg-gray-200 text-gray-900' :
                      analyses[type.id]?.completed ? 'bg-gray-100' :
                      'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span>{type.label}</span>
                      {processing === type.id ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {progress}%
                        </div>
                      ) : analyses[type.id]?.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                    {processing === type.id && (
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="col-span-8 bg-gray-50 rounded-lg p-6 flex flex-col min-h-0">
              {selectedType && (
                <>
                  {/* Fixed Header */}
                  <div className="flex-none mb-4">
                    <h2 className="text-xl font-semibold mb-2">
                      {summaryTypes.find(t => t.id === selectedType)?.label}
                    </h2>
                    <p className="text-gray-600">
                      {summaryTypes.find(t => t.id === selectedType)?.description}
                    </p>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto">
                    {analyses[selectedType]?.content ? (
                      <pre className="whitespace-pre-wrap font-mono bg-white p-4 rounded-lg">
                        {analyses[selectedType].content}
                      </pre>
                    ) : analyses[selectedType]?.error ? (
                      <div className="flex flex-col items-start gap-4">
                        <pre className="whitespace-pre-wrap font-mono bg-white p-4 rounded-lg text-red-600">
                          {analyses[selectedType].error}
                        </pre>
                        <Button 
                          onClick={() => handleAnalyze(selectedType)}
                          className="flex items-center gap-2"
                        >
                          {processing === selectedType ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowLeft className="h-4 w-4" />
                          )}
                          Try Again
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <SharePDFModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        htmlContent={generateReportHtml()}
        fileName={fileName}
      />
    </div>
  );
};
