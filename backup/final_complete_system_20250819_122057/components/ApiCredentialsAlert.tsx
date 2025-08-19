import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ApiCredentialsAlert() {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Missing API Credentials</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          Your Azure OpenAI credentials are not configured. Please add them in
          the project settings.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("https://tempo.build/projects", "_blank")}
        >
          Go to Project Settings
        </Button>
      </AlertDescription>
    </Alert>
  );
}
