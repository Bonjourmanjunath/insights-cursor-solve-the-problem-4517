import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface DriversProps {
  results: any;
}

export default function DriversPanel({ results }: DriversProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />⚡ Key Drivers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Key Drivers Analysis</h3>
          <p className="text-muted-foreground mb-4">
            This panel will show key drivers and motivators from the analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
