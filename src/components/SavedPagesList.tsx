import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SavedPage {
  id: string;
  originalUrl: string;
  savedAt: string;
}

const BACKEND_URL = "http://localhost:3001";

export function SavedPagesList() {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const { toast } = useToast();

  const fetchPages = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/saved-pages`);
      if (!response.ok) throw new Error("Failed to fetch saved pages");
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error("Error fetching saved pages:", error);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openOfflinePage = (id: string) => {
    const url = `${BACKEND_URL}/offline/${id}/index.html`;
    window.open(url, "_blank");
  };

  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Pages</CardTitle>
          <CardDescription>No offline pages saved yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Pages</CardTitle>
        <CardDescription>{pages.length} offline page(s) saved</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {pages.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{page.originalUrl}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(page.savedAt).toLocaleString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openOfflinePage(page.id)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
