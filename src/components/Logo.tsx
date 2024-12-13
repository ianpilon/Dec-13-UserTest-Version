import { FileText } from 'lucide-react';

export const Logo = () => {
  return (
    <div className="flex items-center space-x-2">
      <FileText className="w-8 h-8 text-primary" />
      <span className="text-xl font-semibold">Customer Problem Analyst</span>
    </div>
  );
};