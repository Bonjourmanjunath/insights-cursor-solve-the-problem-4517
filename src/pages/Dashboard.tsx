import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Calendar,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Projects',
      value: projects.length.toString(),
      change: '+12%',
      changeType: 'increase' as const,
      icon: BarChart3,
    },
    {
      title: 'Active Transcripts',
      value: '0', // TODO: Connect to transcripts data
      change: '+8%',
      changeType: 'increase' as const,
      icon: FileText,
    },
    {
      title: 'Analysis Complete',
      value: '0%', // TODO: Connect to analysis data
      change: '+5%',
      changeType: 'increase' as const,
      icon: TrendingUp,
    },
    {
      title: 'Documents',
      value: projects.reduce((sum, p) => sum + p.document_count, 0).toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: Users,
    },
  ];

  const handleNewProject = () => {
    navigate('/dashboard/projects');
  };

  const handleUploadTranscripts = () => {
    navigate('/dashboard/transcripts');
  };

  const handleRunAnalysis = () => {
    navigate('/dashboard/analysis');
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Clean Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Research Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your qualitative research projects and insights
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex space-x-3">
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
            <Button size="sm" className="flex items-center space-x-2" onClick={handleNewProject}>
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>

        {/* Clean Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                      <div className="flex items-center text-xs text-success">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>{stat.change} from last month</span>
                      </div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Projects & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Recent Projects</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </div>
              <CardDescription className="text-sm">
                Track progress on your active research projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No projects yet. Create your first project!</div>
              ) : (
                projects.slice(0, 3).map((project) => (
                <div
                  key={project.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground">{project.name}</h4>
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{project.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Documents: {project.document_count} | Codes: {project.code_count}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
              <CardDescription className="text-sm">
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div 
                className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                onClick={handleNewProject}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Create New Project</h4>
                    <p className="text-xs text-muted-foreground">Start a new qualitative research project</p>
                  </div>
                </div>
              </div>

              <div 
                className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                onClick={handleUploadTranscripts}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <FileText className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Upload Transcripts</h4>
                    <p className="text-xs text-muted-foreground">Add new interview transcripts for analysis</p>
                  </div>
                </div>
              </div>

              <div 
                className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                onClick={handleRunAnalysis}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-info/10 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Run Analysis</h4>
                    <p className="text-xs text-muted-foreground">Generate insights from your data</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Schedule Interview</h4>
                    <p className="text-xs text-muted-foreground">Book time with research participants</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-xl font-semibold text-foreground mt-1">8</p>
                  <p className="text-xs text-muted-foreground">Interviews completed</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-xl font-semibold text-foreground mt-1">3</p>
                  <p className="text-xs text-muted-foreground">Analysis reports</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-xl font-semibold text-foreground mt-1">94%</p>
                  <p className="text-xs text-muted-foreground">Data accuracy</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}