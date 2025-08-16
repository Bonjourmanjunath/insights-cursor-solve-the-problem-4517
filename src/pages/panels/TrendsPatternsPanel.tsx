import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users } from "lucide-react";

interface TrendsPatternsProps {
  results: any;
}

export default function TrendsPatternsPanel({ results }: TrendsPatternsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          📊 Trends & Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results?.trends_patterns ? (
          <div className="space-y-8">
            {/* Within-Theme Trends */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-600">
                🔄 Within-Theme Trends
              </h4>
              <div className="grid gap-4">
                {results.trends_patterns.within_theme_trends?.length > 0 ? (
                  results.trends_patterns.within_theme_trends.map(
                    (trend: any, index: number) => (
                      <Card
                        key={index}
                        className="border-l-4 border-l-blue-500"
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium">
                              {trend?.theme || `Theme ${index + 1}`}
                            </h5>
                            <Badge variant="outline">
                              {trend?.frequency || 0} occurrences
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {trend?.pattern || "Pattern analysis in progress"}
                          </p>
                        </CardContent>
                      </Card>
                    ),
                  )
                ) : (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="text-center py-6">
                        <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                        <h5 className="font-medium mb-2">
                          Trend Analysis in Progress
                        </h5>
                        <p className="text-sm text-muted-foreground mb-4">
                          Within-theme patterns are being identified.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Visuals Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-purple-600">
                📈 Visuals
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="text-center p-6">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <h5 className="font-medium mb-2">Heatmap</h5>
                  <p className="text-sm text-muted-foreground">
                    Themes × Participants intensity visualization
                  </p>
                </Card>
                <Card className="text-center p-6">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <h5 className="font-medium mb-2">Flow Diagram</h5>
                  <p className="text-sm text-muted-foreground">
                    Process and protocol flow visualization
                  </p>
                </Card>
                <Card className="text-center p-6">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <h5 className="font-medium mb-2">Network Map</h5>
                  <p className="text-sm text-muted-foreground">
                    Theme relationship network visualization
                  </p>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Trends & Patterns Available
            </h3>
            <p className="text-muted-foreground mb-4">
              Run advanced analysis to see trends and patterns
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
