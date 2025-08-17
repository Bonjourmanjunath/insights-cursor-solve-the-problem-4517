import { supabase } from "@/integrations/supabase/client";

// Comprehensive file type definitions
export interface FileTypeConfig {
  mimeTypes: string[];
  extensions: string[];
  bucket: "documents" | "transcripts";
  category: "document" | "audio" | "video";
}

export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  document: {
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".pdf", ".txt", ".doc", ".docx"],
    bucket: "documents",
    category: "document",
  },
};

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  filePath?: string;
  bucket?: string;
  error?: string;
}

export class FileUploadService {
  /**
   * Determines the file type configuration based on MIME type and extension
   */
  static getFileTypeConfig(file: File): FileTypeConfig | null {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Check each configuration
    for (const config of Object.values(FILE_TYPE_CONFIGS)) {
      // Check MIME type match
      const mimeMatch = config.mimeTypes.some(
        (mime) =>
          mimeType === mime || mimeType.startsWith(mime.split("/")[0] + "/"),
      );

      // Check extension match
      const extensionMatch = config.extensions.some((ext) =>
        fileName.endsWith(ext.toLowerCase()),
      );

      // If either MIME type or extension matches, use this config
      if (mimeMatch || extensionMatch) {
        return config;
      }
    }

    return null;
  }

  /**
   * Validates if a file is supported
   */
  static validateFile(file: File): {
    valid: boolean;
    error?: string;
    config?: FileTypeConfig;
  } {
    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB limit
      return { valid: false, error: "File size exceeds 100MB limit" };
    }

    const config = this.getFileTypeConfig(file);
    if (!config) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type || "unknown"}. Supported types: PDF, TXT, DOC, DOCX`,
      };
    }

    return { valid: true, config };
  }

  /**
   * Uploads a file to the appropriate Supabase storage bucket
   */
  static async uploadFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const config = validation.config!;
      const fileId = Math.random().toString(36).substr(2, 9);
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${userId}/${fileId}-${sanitizedFileName}`;

      console.log(`📁 Uploading ${file.name} to ${config.bucket} bucket`);
      console.log(`📝 File details:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        bucket: config.bucket,
        category: config.category,
      });

      // Notify upload start
      if (onProgress) {
        onProgress({
          fileId,
          fileName: file.name,
          progress: 0,
          status: "uploading",
        });
      }

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(`❌ Upload failed:`, uploadError);
        if (onProgress) {
          onProgress({
            fileId,
            fileName: file.name,
            progress: 0,
            status: "error",
            error: uploadError.message,
          });
        }
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      console.log(`✅ Upload successful:`, data);

      // Notify upload complete
      if (onProgress) {
        onProgress({
          fileId,
          fileName: file.name,
          progress: 100,
          status: "completed",
        });
      }

      return {
        success: true,
        fileId,
        filePath: data.path,
        bucket: config.bucket,
      };
    } catch (error) {
      console.error(`❌ Upload error:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown upload error";

      if (onProgress) {
        onProgress({
          fileId: "unknown",
          fileName: file.name,
          progress: 0,
          status: "error",
          error: errorMessage,
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Creates a document record in the database
   */
  static async createDocumentRecord(
    file: File,
    userId: string,
    projectId: string,
    uploadResult: UploadResult,
  ) {
    try {
      const config = this.getFileTypeConfig(file);
      if (!config) {
        throw new Error("Invalid file type for document creation");
      }

      // Extract file extension and ensure it matches database constraint
      const fileName = file.name.toLowerCase();
      let fileExtension = "unknown";

      if (fileName.endsWith(".docx")) {
        fileExtension = "docx";
      } else if (fileName.endsWith(".pdf")) {
        fileExtension = "pdf";
      } else if (fileName.endsWith(".txt")) {
        fileExtension = "txt";
      } else if (fileName.endsWith(".doc")) {
        fileExtension = "docx"; // Treat .doc as docx for database constraint
      }

      console.log(
        `📝 File: ${file.name}, Extension: ${fileExtension}, MIME: ${file.type}`,
      );

      const { data: document, error: dbError } = await supabase
        .from("research_documents")
        .insert({
          user_id: userId,
          project_id: projectId,
          name: file.name,
          file_type: fileExtension,
          file_size: file.size,
          storage_path: uploadResult.filePath,
          processing_status: "completed",
          content: "Document uploaded - content processing pending",
        })
        .select()
        .maybeSingle();

      if (dbError) {
        console.error("❌ Database error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!document) {
        console.error("❌ No document returned from database insert");
        throw new Error("Failed to create document record - no data returned");
      }

      console.log("✅ Document record created:", document.id);
      return document;
    } catch (error) {
      console.error("❌ Failed to create document record:", error);
      throw error;
    }
  }

  /**
   * Complete file upload process including database record creation and chunking
   */
  static async uploadFileWithDocument(
    file: File,
    userId: string,
    projectId: string,
    onProgress?: (progress: UploadProgress) => void,
  ) {
    try {
      console.log(`🚀 Starting upload process for ${file.name}...`);
      console.log(`📁 Project ID: ${projectId}`);
      console.log(`👤 User ID: ${userId}`);

      // Validate project exists and belongs to user
      console.log("🔍 Validating project...");
      const { data: project, error: projectError } = await supabase
        .from("research_projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("user_id", userId)
        .maybeSingle();

      if (projectError) {
        console.error("❌ Project validation error:", projectError);
        throw new Error(`Project validation failed: ${projectError.message}`);
      }

      if (!project) {
        console.error("❌ Project not found or access denied");
        console.log("🔍 Debug info:", { projectId, userId });

        // Check if project exists at all
        const { data: anyProject } = await supabase
          .from("research_projects")
          .select("id, name, user_id")
          .eq("id", projectId)
          .maybeSingle();

        if (anyProject) {
          console.log(
            "⚠️ Project exists but belongs to different user:",
            anyProject.user_id,
          );
          throw new Error(
            "Project not found or you do not have access to this project",
          );
        } else {
          console.log("⚠️ Project does not exist in database");
          throw new Error("Project not found");
        }
      }

      console.log(`✅ Project validated: ${project.name}`);

      // Upload file
      const uploadResult = await this.uploadFile(file, userId, onProgress);

      if (!uploadResult.success) {
        console.error("❌ File upload failed:", uploadResult.error);
        throw new Error(uploadResult.error);
      }

      console.log("✅ File uploaded successfully:", uploadResult.filePath);

      // Create document record
      console.log("📝 Creating document record...");
      const document = await this.createDocumentRecord(
        file,
        userId,
        projectId,
        uploadResult,
      );

      console.log("✅ Document record created:", document.id);

      // Automatically process document content
      console.log("🔄 Automatically processing document content...");
      try {
        const { data: processData, error: processError } =
          await supabase.functions.invoke("document-processor", {
            body: {
              document_id: document.id,
              project_id: projectId,
            },
          });

        if (processError) {
          console.warn("⚠️ Document processing failed:", processError);
          // Don't fail the upload, processing can be done manually later
        } else if (processData?.success) {
          console.log(
            "✅ Document content processed successfully:",
            processData.processed,
            "documents processed",
          );
        }
      } catch (processError) {
        console.warn("⚠️ Document processing error:", processError);
        // Don't fail the upload, processing can be done manually later
      }

      // Update project document count
      try {
        const { error: updateError } = await supabase.rpc(
          "increment_project_document_count",
          {
            project_id: projectId,
          } as any,
        );

        if (updateError) {
          console.warn(
            "⚠️ Failed to update project document count:",
            updateError,
          );
        } else {
          console.log("📊 Project document count updated");
        }
      } catch (error) {
        console.warn("⚠️ Document count update failed:", error);
      }

      // Trigger project ingest queue for chunking and embedding
      console.log("🔄 Triggering project ingest queue...");
      try {
        const { data: ingestData, error: ingestError } =
          await supabase.functions.invoke("project-ingest-queue", {
            body: {
              project_id: projectId,
            },
          });

        if (ingestError) {
          console.warn("⚠️ Project ingest queue failed:", ingestError);
          // Don't fail the upload, just log the warning
        } else if (ingestData?.success) {
          console.log(
            "✅ Ingest jobs queued:",
            ingestData.jobs_created,
            "jobs created,",
            "estimated completion:",
            new Date(ingestData.estimated_completion).toLocaleTimeString(),
          );
        }
      } catch (ingestError) {
        console.warn("⚠️ Project ingest queue error:", ingestError);
        // Don't fail the upload, queueing can be done later
      }

      return {
        success: true,
        document,
        uploadResult,
      };
    } catch (error) {
      console.error("❌ Complete upload process failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload process failed",
      };
    }
  }
}

export default FileUploadService;
