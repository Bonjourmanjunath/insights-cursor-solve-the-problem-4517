import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface AnomaliesProps {
  results: any;
}

export default function AnomaliesPanel({ results }: AnomaliesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          🚨 Anomalies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Anomalies Detection</h3>
          <p className="text-muted-foreground mb-4">
            This panel will show detected anomalies and unusual patterns
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
