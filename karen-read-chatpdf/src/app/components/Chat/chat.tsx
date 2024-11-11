'use client'

import React, { useState } from 'react'
import { Bell, Book, ChevronDown, Cog, FileText, Folder, Grid, HelpCircle, Home, Mic, Moon, Search, Sun, Upload, User, X, MessageSquare } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function ChatPDFDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [currentDocument, setCurrentDocument] = useState(null)
  const [chatPDFOpen, setChatPDFOpen] = useState(false)
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false)

  const documents = [
    { id: 1, name: 'Research Paper.pdf', type: 'PDF', date: '2023-05-15', size: '2.5 MB' },
    { id: 2, name: 'Meeting Notes.docx', type: 'Word', date: '2023-05-20', size: '500 KB' },
    { id: 3, name: 'Presentation.pptx', type: 'PowerPoint', date: '2023-05-22', size: '3.2 MB' },
  ]

  const chatHistory = [
    { id: 1, type: 'user', content: 'What is the main topic of this document?' },
    { id: 2, type: 'ai', content: 'The main topic of this document is the impact of artificial intelligence on modern workplace productivity.' },
    { id: 3, type: 'user', content: 'Can you summarize the key points?' },
    { id: 4, type: 'ai', content: 'Here are the key points:\n\n1. AI is revolutionizing task automation in offices.\n2. Machine learning algorithms are improving decision-making processes.\n3. Natural Language Processing is enhancing communication and data analysis.\n4. There are concerns about job displacement due to AI adoption.\n5. The document suggests a balanced approach to AI integration, focusing on human-AI collaboration.' },
  ]

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Main Navigation Sidebar */}
      <aside className={`bg-white dark:bg-gray-800 w-64 min-h-screen p-4 ${sidebarOpen ? '' : 'hidden'}`}>
        <nav className="space-y-6">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Document Library</h3>
            <ScrollArea className="h-[300px]">
              {documents.map((doc) => (
                <Button key={doc.id} variant="ghost" className="w-full justify-start mb-1" onClick={() => setCurrentDocument(doc)}>
                  <FileText className="mr-2 h-4 w-4" />
                  {doc.name}
                </Button>
              ))}
            </ScrollArea>
          </div>
          <Button className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Folder className="mr-2 h-4 w-4" />
            Folders
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => setChatPDFOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            ChatPDF
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Cog className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Top Action Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Grid className="h-6 w-6" />
            </Button>
            <div className="flex-1 mx-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input type="search" placeholder="Search documents..." className="pl-8" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost">
                      <Bell className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className="ml-4"
                icon={darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              />
            </div>
          </div>
        </header>

        {/* Central Workspace */}
        <main className="flex-1 overflow-hidden flex">
          {chatPDFOpen ? (
            // ChatPDF Interface
            <div className="flex-1 flex">
              {/* Chat Interface */}
              <div className="w-2/3 p-4 bg-white dark:bg-gray-800 flex flex-col">
                <ScrollArea className="flex-1 mb-4">
                  {chatHistory.map((message) => (
                    <div key={message.id} className={`mb-4 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-2 rounded-lg ${message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {message.content}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                <div>
                  <Textarea placeholder="Ask a question about the document..." className="mb-2" />
                  <div className="flex justify-between items-center">
                    <Button>
                      <Mic className="mr-2 h-4 w-4" />
                      Voice Input
                    </Button>
                    <Select defaultValue="detailed">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Response detail" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button>Send</Button>
                  </div>
                </div>
              </div>

              {/* Source Document Selection Drawer */}
              <div className={`w-1/3 bg-gray-100 dark:bg-gray-900 p-4 ${sourceDrawerOpen ? '' : 'hidden'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Select Source Documents</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSourceDrawerOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2 mb-2">
                      <Checkbox id={`doc-${doc.id}`} />
                      <Label htmlFor={`doc-${doc.id}`}>{doc.name}</Label>
                    </div>
                  ))}
                </ScrollArea>
                <Button className="w-full mt-4">Apply Selection</Button>
              </div>

              {/* Toggle for Source Document Drawer */}
              {!sourceDrawerOpen && (
                <Button
                  className="absolute right-4 top-20"
                  onClick={() => setSourceDrawerOpen(true)}
                >
                  Select Sources
                </Button>
              )}
            </div>
          ) : (
            // Original Document Display
            <>
              {/* Document Display Panel */}
              <div className="w-1/2 p-4 bg-white dark:bg-gray-800 overflow-auto">
                {currentDocument ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">{currentDocument.name}</h2>
                    <div className="bg-gray-200 dark:bg-gray-700 h-[600px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                      [Document Content Placeholder]
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Select a document to view
                  </div>
                )}
              </div>

              {/* Document Management Features */}
              {currentDocument && (
                <aside className="w-1/2 bg-white dark:bg-gray-800 p-4 border-l">
                  <h3 className="font-semibold mb-2">Document Info</h3>
                  <p>Name: {currentDocument.name}</p>
                  <p>Type: {currentDocument.type}</p>
                  <p>Date: {currentDocument.date}</p>
                  <p>Size: {currentDocument.size}</p>
                  <Tabs defaultValue="summary" className="mt-4">
                    <TabsList>
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="highlights">Highlights</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary">
                      <p className="text-sm">This document discusses the impact of AI on workplace productivity, covering automation, decision-making improvements, and potential job displacement concerns.</p>
                    </TabsContent>
                    <TabsContent value="highlights">
                      <ul className="text-sm list-disc pl-4">
                        <li>AI revolutionizing task automation</li>
                        <li>Machine learning improving decision-making</li>
                        <li>NLP enhancing communication</li>
                        <li>Job displacement concerns</li>
                        <li>Human-AI collaboration focus</li>
                      </ul>
                    </TabsContent>
                  </Tabs>
                </aside>
              )}
            </>
          )}
        </main>

        {/* Bottom Interaction Panel */}
        <footer className="bg-white dark:bg-gray-800 border-t p-4">
          <div className="flex justify-between items-center">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export Insights
            </Button>
            <Select defaultValue="gpt3">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt3">GPT-3</SelectItem>
                <SelectItem value="gpt4">GPT-4</SelectItem>
                <SelectItem value="custom">Custom Model</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </footer>
      </div>
    </div>
  )
}