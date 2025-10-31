import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ArchiveMode } from "./UrlInput";

interface DisplayAreaProps {
  mode: ArchiveMode | null;
  content: string | null;
  error: string | null;
  success: string | null;
}

export function DisplayArea({ mode, content, error, success }: DisplayAreaProps) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Enter a URL and select a mode to get started
      </div>
    );
  }

  if (mode === "snapshot") {
    return (
      <div className="border rounded-lg overflow-hidden" style={{ height: "600px" }}>
        <iframe
          srcDoc={content}
          className="w-full h-full"
          title="Webpage Snapshot"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  if (mode === "screenshot") {
    return (
      <div className="border rounded-lg overflow-hidden p-4 bg-card">
        <img
          src={content}
          alt="Webpage Screenshot"
          className="w-full h-auto"
        />
      </div>
    );
  }

  return null;
}
