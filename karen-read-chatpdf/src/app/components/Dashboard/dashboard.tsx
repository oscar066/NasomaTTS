'use client'

import React, { useState } from 'react'
import { Bell, ChevronDown, Cog, FileText, Grid, HelpCircle, Home, Mic, Play, Pause, Search, Upload, User, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentFile, setCurrentFile] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const files = [
    { id: 1, name: 'Document 1.pdf', progress: 30 },
    { id: 2, name: 'Meeting Notes.docx', progress: 75 },
    { id: 3, name: 'Article.txt', progress: 50 },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Navigation Panel (Left Sidebar) */}
      <aside className={`bg-white w-64 min-h-screen p-4 ${sidebarOpen ? '' : 'hidden'}`}>
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
          <Button className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Cog className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Free Plan</p>
            <Button variant="link" className="p-0 h-auto text-blue-600">Upgrade</Button>
          </div>
          <Button variant="ghost" className="w-full justify-start">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Grid className="h-6 w-6" />
            </Button>
            <div className="flex-1 mx-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input type="search" placeholder="Search files..." className="pl-8" />
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" className="mr-2">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Account Settings</DropdownMenuItem>
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Central Content Display */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <h1 className="text-2xl font-semibold mb-6">Your Library</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <div key={file.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{file.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => alert('Rename functionality here')}>Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert('Share functionality here')}>Share</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => alert('Delete functionality here')}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Progress value={file.progress} className="mb-2" />
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentFile(file);
                      setIsPlaying(true);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                  <span className="text-sm text-gray-500">{file.progress}% complete</span>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Audio Controls Section */}
        {currentFile && (
          <footer className="bg-white border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <div>
                  <p className="font-medium">{currentFile.name}</p>
                  <Progress value={currentFile.progress} className="w-64" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select defaultValue="natural">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural Voice</SelectItem>
                    <SelectItem value="robotic">Robotic Voice</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center">
                  <Mic className="h-5 w-5 mr-2" />
                  <Slider defaultValue={[50]} max={100} step={1} className="w-32" />
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
