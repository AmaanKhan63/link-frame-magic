import { useState } from "react";
import { UrlInput, ArchiveMode } from "@/components/UrlInput";
import { DisplayArea } from "@/components/DisplayArea";
import { SavedPagesList } from "@/components/SavedPagesList";
import { useToast } from "@/hooks/use-toast";

const BACKEND_URL = "http://localhost:3001";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ArchiveMode | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSnapshot = async (url: string) => {
    const response = await fetch(`${BACKEND_URL}/api/snapshot?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create snapshot");
    }
    return await response.text();
  };

  const handleScreenshot = async (url: string) => {
    const response = await fetch(`${BACKEND_URL}/api/screenshot?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to capture screenshot");
    }
    const data = await response.json();
    return data.base64;
  };

  const handleSave = async (url: string) => {
    const response = await fetch(`${BACKEND_URL}/api/save-page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save page");
    }
    return await response.json();
  };

  const handleSubmit = async (url: string, mode: ArchiveMode) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setContent(null);
    setCurrentMode(mode);

    try {
      switch (mode) {
        case "snapshot": {
          const html = await handleSnapshot(url);
          setContent(html);
          toast({
            title: "Snapshot created",
            description: "Page loaded inline successfully",
          });
          break;
        }
        case "screenshot": {
          const base64Image = await handleScreenshot(url);
          setContent(base64Image);
          toast({
            title: "Screenshot captured",
            description: "Full page screenshot created",
          });
          break;
        }
        case "save": {
          const result = await handleSave(url);
          setSuccess(`Page saved offline! ID: ${result.id}`);
          toast({
            title: "Page saved",
            description: "Click the link in the saved pages list to open it",
          });
          window.dispatchEvent(new Event("refresh-saved-pages"));
          break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Webpage Archiver</h1>
          <p className="text-muted-foreground">
            Save, snapshot, or screenshot any webpage
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />
            <DisplayArea
              mode={currentMode}
              content={content}
              error={error}
              success={success}
            />
          </div>

          <div>
            <SavedPagesList key={Date.now()} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Index;
