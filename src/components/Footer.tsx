import React from 'react';
import { ArrowRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img 
              src="https://i.postimg.cc/vTgQLCkq/Optimizers-Logo-White-V1.png" 
              alt="Optimizers Logo" 
              className="h-10 w-auto"
            />
            <span className="text-gray-900 font-medium text-lg">
              Optimizers Agency
            </span>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-gray-900 font-semibold text-lg mb-3">
              CSV Data Visualization Tool
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4 max-w-2xl">
              This tool is a universal visualization tool for any data sets from any csv report from ga4 
              creating a chart view, table view, and analytical insights for each csv, each date range and each period.
            </p>
            <a 
              href="#sop-guide" 
              className="inline-flex items-center gap-2 text-gray-900 font-medium text-sm hover:text-gray-700 transition-colors"
            >
              View SOP Guide
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};