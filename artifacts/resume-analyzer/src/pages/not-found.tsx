import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Page not found</h1>
        <p className="text-slate-500 mb-8 text-lg">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="inline-block">
          <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
