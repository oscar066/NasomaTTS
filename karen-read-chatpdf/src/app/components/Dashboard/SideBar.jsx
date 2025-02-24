import React from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, Upload, Cog, HelpCircle } from "lucide-react";

const Sidebar = ({ isOpen }) => {
  return (
    <aside 
      className={`
        bg-white w-64 min-h-screen p-4 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <nav className="space-y-6">
        <Button variant="ghost" className="w-full justify-start">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
        
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Library</h3>
          <Button variant="ghost" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            All Documents
          </Button>
        </div>
        
        <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        
        <Button variant="ghost" className="w-full justify-start">
          <Cog className="mr-2 h-4 w-4" />
          Settings
        </Button>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-800">Free Plan</p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-blue-600 hover:text-blue-700"
          >
            Upgrade
          </Button>
        </div>
        
        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help & Support
        </Button>
      </nav>
    </aside>
  );
};

export default Sidebar;