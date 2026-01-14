import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileText, Image, X, File } from "lucide-react";
import { Button } from "./button";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
  icon?: "upload" | "file" | "image";
  title?: string;
  description?: string;
  showPreview?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  accept = "*",
  multiple = false,
  maxFiles = 10,
  maxSize = 20,
  disabled = false,
  className,
  icon = "upload",
  title = "Nutempkite failus čia",
  description = "arba spustelėkite norėdami pasirinkti",
  showPreview = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback((files: File[]): File[] => {
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of files) {
      // Check size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`Failas "${file.name}" per didelis. Maksimalus dydis: ${maxSize}MB`);
        continue;
      }
      
      // Check accept types
      if (accept !== "*") {
        const acceptTypes = accept.split(",").map(t => t.trim());
        const fileType = file.type;
        const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
        
        const isAccepted = acceptTypes.some(type => {
          if (type.startsWith(".")) {
            return fileExt === type.toLowerCase();
          }
          if (type.endsWith("/*")) {
            return fileType.startsWith(type.replace("/*", "/"));
          }
          return fileType === type;
        });
        
        if (!isAccepted) {
          setError(`Failas "${file.name}" neatitinka priimamo tipo`);
          continue;
        }
      }
      
      validFiles.push(file);
    }
    
    // Check max files
    if (!multiple && validFiles.length > 1) {
      return [validFiles[0]];
    }
    
    if (validFiles.length > maxFiles) {
      setError(`Galima įkelti ne daugiau nei ${maxFiles} failus`);
      return validFiles.slice(0, maxFiles);
    }
    
    return validFiles;
  }, [accept, maxFiles, maxSize, multiple]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      if (showPreview) {
        setSelectedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
      }
      onFilesSelected(validFiles);
    }
  }, [disabled, validateFiles, onFilesSelected, showPreview, multiple]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = validateFiles(files);
    
    if (validFiles.length > 0) {
      if (showPreview) {
        setSelectedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
      }
      onFilesSelected(validFiles);
    }
    
    // Reset input
    e.target.value = "";
  }, [validateFiles, onFilesSelected, showPreview, multiple]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFilesSelected(newFiles);
      return newFiles;
    });
  }, [onFilesSelected]);

  const IconComponent = icon === "image" ? Image : icon === "file" ? FileText : Upload;

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (file.type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
    if (file.type.includes("spreadsheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      return <FileText className="h-4 w-4 text-green-600" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[160px] p-6",
          "border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
          "bg-muted/30 hover:bg-muted/50",
          isDragOver && "border-primary bg-primary/5 scale-[1.02]",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive",
          !isDragOver && !error && "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
        />
        
        <div className={cn(
          "flex flex-col items-center gap-2 text-center transition-transform duration-200",
          isDragOver && "scale-110"
        )}>
          <div className={cn(
            "p-3 rounded-full transition-colors",
            isDragOver ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {accept !== "*" && (
            <p className="text-xs text-muted-foreground">
              Priimami formatai: {accept.replace(/\./g, "").replace(/,/g, ", ")}
            </p>
          )}
        </div>
      </label>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(index);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
