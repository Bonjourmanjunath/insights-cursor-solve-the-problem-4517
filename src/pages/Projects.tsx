import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Folder,
  Edit,
  Upload,
  BarChart3,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  Sparkles,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/useProjects";
import ProjectForm from "@/components/ProjectForm";
import FileUploadService, {
  UploadProgress,
} from "@/services/file-upload-service";
import { useAuth } from "@/hooks/useAuth";

export default function Projects() {
  const { projects, loading, error, createProject, updateProject, refetch } =
    useProjects();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleCreateProject = async (projectData: any) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create projects",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extract transcripts from project data
      const { transcripts, ...projectConfig } = projectData;

      // Create the project first
      const newProject = await createProject(projectConfig);

      // Handle file uploads if any files were selected
      if (transcripts && transcripts.length > 0) {
        setUploadingFiles(true);

        toast({
          title: "Project Created",
          description: `Project created! Uploading ${transcripts.length} file(s)...`,
        });

        let uploadedCount = 0;
        const failedUploads: string[] = [];

        // Upload files sequentially to avoid overwhelming the system
        for (const file of transcripts) {
          try {
            console.log(`📤 Uploading file: ${file.name}`);
            const result = await FileUploadService.uploadFileWithDocument(
              file,
              user.id,
              newProject.id,
              (progress: UploadProgress) => {
                console.log(
                  `Upload progress for ${file.name}: ${progress.progress}%`,
                );
              },
            );

            if (result.success) {
              uploadedCount++;
              console.log(`✅ Successfully uploaded: ${file.name}`);
            } else {
              console.error(`❌ Failed to upload ${file.name}:`, result.error);
              failedUploads.push(`${file.name}: ${result.error}`);
            }
          } catch (error) {
            console.error(`❌ Upload error for ${file.name}:`, error);
            failedUploads.push(
              `${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        setUploadingFiles(false);

        if (failedUploads.length === 0) {
          toast({
            title: "Success!",
            description: `Project created with ${uploadedCount} file(s) uploaded successfully!`,
          });
        } else {
          toast({
            title: uploadedCount > 0 ? "Partial Success" : "Upload Failed",
            description:
              uploadedCount > 0
                ? `Project created. ${uploadedCount} files uploaded, ${failedUploads.length} failed.`
                : `Project created but file uploads failed: ${failedUploads.join(", ")}`,
            variant: uploadedCount > 0 ? "default" : "destructive",
          });
        }

        // Refresh projects to update document counts
        refetch();
      } else {
        toast({
          title: "Success",
          description: "Project created successfully!",
        });
      }

      setShowNewProject(false);
    } catch (error) {
      console.error("Project creation error:", error);
      setUploadingFiles(false);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleEditProject = async (projectData: any) => {
    if (!editingProject || !user?.id) return;

    try {
      const { transcripts, ...projectConfig } = projectData;

      // Update the project configuration first
      await updateProject(editingProject.id, projectConfig);

      // Handle file uploads if any files were selected
      if (transcripts && transcripts.length > 0) {
        setUploadingFiles(true);

        toast({
          title: "Project Updated",
          description: `Project updated! Uploading ${transcripts.length} file(s)...`,
        });

        let uploadedCount = 0;
        const failedUploads: string[] = [];

        // Upload files sequentially to avoid overwhelming the system
        for (const file of transcripts) {
          try {
            console.log(`📤 Uploading file: ${file.name}`);
            const result = await FileUploadService.uploadFileWithDocument(
              file,
              user.id,
              editingProject.id,
              (progress: UploadProgress) => {
                console.log(
                  `Upload progress for ${file.name}: ${progress.progress}%`,
                );
              },
            );

            if (result.success) {
              uploadedCount++;
              console.log(`✅ Successfully uploaded: ${file.name}`);
            } else {
              console.error(`❌ Failed to upload ${file.name}:`, result.error);
              failedUploads.push(`${file.name}: ${result.error}`);
            }
          } catch (error) {
            console.error(`❌ Upload error for ${file.name}:`, error);
            failedUploads.push(
              `${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        setUploadingFiles(false);

        if (failedUploads.length === 0) {
          toast({
            title: "Success!",
            description: `Project updated with ${uploadedCount} file(s) uploaded successfully!`,
          });
        } else {
          toast({
            title: uploadedCount > 0 ? "Partial Success" : "Upload Failed",
            description:
              uploadedCount > 0
                ? `Project updated. ${uploadedCount} files uploaded, ${failedUploads.length} failed.`
                : `Project updated but file uploads failed: ${failedUploads.join(", ")}`,
            variant: uploadedCount > 0 ? "default" : "destructive",
          });
        }

        // Refresh projects to update document counts
        refetch();
      } else {
        toast({
          title: "Success",
          description: "Project updated successfully!",
        });
      }

      setEditingProject(null);
    } catch (error) {
      console.error("Project update error:", error);
      setUploadingFiles(false);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getProjectTypeDisplay = (projectType?: string) => {
    if (!projectType) return "Not specified";

    // Convert snake_case to Title Case
    return projectType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Management
          </h1>
          <p className="text-muted-foreground">
            Configure and manage your FMR qualitative research projects
          </p>
        </div>

        <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New FMR Project</DialogTitle>
              <DialogDescription>
                Set up a new qualitative research project with FMR configuration
                for transcript analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <ProjectForm
                onSubmit={handleCreateProject}
                onCancel={() => setShowNewProject(false)}
                loading={loading || uploadingFiles}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog
          open={!!editingProject}
          onOpenChange={() => setEditingProject(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update your FMR project configuration and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-4">
              <ProjectForm
                onSubmit={handleEditProject}
                onCancel={() => setEditingProject(null)}
                loading={loading || uploadingFiles}
                initialData={editingProject}
              />
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first FMR project to get started with qualitative
                research analysis.
              </p>
              <Button onClick={() => setShowNewProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        ) : (
          projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border border-gray-100 bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <Folder className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-500 leading-relaxed">
                          {project.description || "No description provided"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {project.priority && (
                        <Badge
                          variant={getPriorityColor(project.priority)}
                          className="text-xs px-3 py-1.5 font-semibold rounded-full"
                        >
                          {project.priority.toUpperCase()}
                        </Badge>
                      )}
                      {project.project_type && (
                        <Badge
                          variant="outline"
                          className="text-xs px-3 py-1.5 font-semibold border-gray-200 text-gray-700 rounded-full bg-gray-50"
                        >
                          {getProjectTypeDisplay(project.project_type)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Project Info Section */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-600">
                            Stakeholder:
                          </span>
                          <span className="text-gray-900">
                            {project.stakeholder_type || "Not specified"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-600">
                            Country:
                          </span>
                          <span className="text-gray-900">
                            {project.country || "Not specified"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-600">
                            Therapy Area:
                          </span>
                          <span className="text-gray-900">
                            {project.therapy_area || "Not specified"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-600">
                            Language:
                          </span>
                          <span className="text-gray-900 font-medium">
                            {(project.language || "EN").toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Research Goal Field */}
                      <div className="border-t border-gray-200 pt-3">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                          Research Goal
                        </div>
                        <div className="text-sm text-gray-900 leading-relaxed">
                          {project.research_goal ||
                            "No research goal specified"}
                        </div>
                      </div>
                    </div>

                    {/* Documents Count Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {project.document_count}
                      </div>
                      <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                        Documents
                      </div>
                    </div>

                    {/* Date Information Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                                Created
                              </div>
                              <div className="text-gray-900 font-medium">
                                {new Date(
                                  project.created_at,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Clock className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                                Updated
                              </div>
                              <div className="text-gray-900 font-medium">
                                {new Date(
                                  project.updated_at,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        {project.deadline && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <Calendar className="h-4 w-4 text-red-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-600 text-xs uppercase tracking-wide">
                                  Deadline
                                </div>
                                <div className="text-gray-900 font-medium">
                                  {new Date(
                                    project.deadline,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {project.owner && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Owner: {project.owner}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Section */}
                  <div className="space-y-3 pt-4">
                    {/* Edit Button */}
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700 font-medium"
                        onClick={() => setEditingProject(project)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-700 font-medium"
                        onClick={() =>
                          navigate(`/dashboard/projects/${project.id}/chat`)
                        }
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                    </div>

                    {/* Analysis Buttons - Each opens independent analysis window */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        Analysis Types
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-white hover:bg-green-50 border-gray-200 hover:border-green-300 text-gray-700 hover:text-green-700 font-medium justify-start"
                          onClick={() =>
                            navigate(
                              `/dashboard/projects/${project.id}/analysis`,
                            )
                          }
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Basic Analysis
                          <span className="ml-auto text-xs text-gray-500">
                            FMR Core
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-700 font-medium justify-start"
                          onClick={() =>
                            navigate(
                              `/dashboard/projects/${project.id}/pro-advanced-analysis`,
                            )
                          }
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Pro Advanced Analysis
                          <span className="ml-auto text-xs text-gray-500">
                            AI Enhanced
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-white hover:bg-indigo-50 border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 font-medium justify-start"
                          onClick={() =>
                            navigate(
                              `/dashboard/projects/${project.id}/analysis/content`,
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Content Analysis
                          <span className="ml-auto text-xs text-gray-500">
                            Guide Matrix
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
