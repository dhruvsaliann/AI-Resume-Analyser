import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  setFile: (file: File | null) => void;
}

export function FileDropzone({ file, setFile }: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
      }
    },
    [setFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  if (file) {
    return (
      <div className="group relative border-2 border-primary/20 bg-primary/5 rounded-2xl p-4 sm:p-6 flex items-center justify-between transition-all hover:bg-primary/10 hover:border-primary/30">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center border border-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <button
          onClick={() => setFile(null)}
          className="shrink-0 p-2.5 bg-white/50 hover:bg-white text-slate-400 hover:text-destructive rounded-full transition-all shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          title="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : isDragReject
          ? "border-destructive bg-destructive/5"
          : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/40"
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        "w-16 h-16 rounded-2xl shadow-sm border flex items-center justify-center mb-4 transition-colors",
        isDragActive ? "bg-primary text-white border-primary" : "bg-white text-slate-400 border-slate-100"
      )}>
        <UploadCloud className="w-8 h-8" />
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1 text-center">
        {isDragActive ? "Drop your PDF here" : "Click to upload or drag & drop"}
      </p>
      <p className="text-sm text-slate-500 font-medium">
        PDF files only (max 5MB)
      </p>
    </div>
  );
}
