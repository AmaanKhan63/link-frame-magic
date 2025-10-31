import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export type ArchiveMode = "snapshot" | "screenshot" | "save";

interface UrlInputProps {
  onSubmit: (url: string, mode: ArchiveMode) => void;
  isLoading: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<ArchiveMode>("snapshot");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim(), mode);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-card rounded-lg border">
      <div className="space-y-2">
        <Label htmlFor="url">Enter Webpage URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Archive Mode</Label>
        <RadioGroup value={mode} onValueChange={(value) => setMode(value as ArchiveMode)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="snapshot" id="snapshot" />
            <Label htmlFor="snapshot" className="font-normal cursor-pointer">
              Snapshot (Inline HTML)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="screenshot" id="screenshot" />
            <Label htmlFor="screenshot" className="font-normal cursor-pointer">
              Screenshot (Playwright)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="save" id="save" />
            <Label htmlFor="save" className="font-normal cursor-pointer">
              Save Offline (Full Download)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Processing..." : "Run"}
      </Button>
    </form>
  );
}
