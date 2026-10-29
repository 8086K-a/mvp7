"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Hash,
  Copy,
  Download,
  Trash2,
  Type,
  AlignLeft,
  ArrowRight,
  ArrowUpDown,
  FileText,
  MoveHorizontal,
  RefreshCw,
  Settings2
} from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"
import { MpDownloadButton } from "@/components/mp-download-button"

export function TextUtilities() {
  const { language } = useLanguage()
  const tr = (key: string) => t(language, `textUtilitiesTool.${key}`)

  const [inputText, setInputText] = useState('')
  const [processedText, setProcessedText] = useState('')
  const [activeTab, setActiveTab] = useState("input")

  // Auto-switch to output tab when text is processed
  useEffect(() => {
    if (processedText && processedText !== inputText) {
      setActiveTab("output")
    }
  }, [processedText])

  // Text statistics
  const getTextStats = (text: string) => {
    if (!text) return { characters: 0, charactersNoSpaces: 0, words: 0, sentences: 0, paragraphs: 0, lines: 0 }
    
    const characters = text.length
    const charactersNoSpaces = text.replace(/\s/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0
    const lines = text.split('\n').length

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      lines
    }
  }

  // Case conversion functions
  const processText = (processor: (text: string) => string) => {
    if (!inputText) return
    const result = processor(inputText)
    setProcessedText(result)
    toast.success(tr("textProcessed"))
    emitToolSuccess("text-utilities")
  }

  const convertToUpperCase = () => processText(t => t.toUpperCase())
  const convertToLowerCase = () => processText(t => t.toLowerCase())
  const convertToTitleCase = () => processText(t => t.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()))
  const convertToSentenceCase = () => processText(t => t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()))
  
  const convertToCamelCase = () => processText(t => 
    t.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '')
  )
  
  const convertToPascalCase = () => processText(t => 
    t.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '')
  )
  
  const convertToSnakeCase = () => processText(t => 
    t.replace(/\W+/g, ' ').trim().split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('_')
  )
  
  const convertToKebabCase = () => processText(t => 
    t.replace(/\W+/g, ' ').trim().split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('-')
  )

  // Text formatting functions
  const removeDuplicateLines = () => processText(t => [...new Set(t.split('\n'))].join('\n'))
  const removeEmptyLines = () => processText(t => t.split('\n').filter(line => line.trim() !== '').join('\n'))
  const sortLines = (ascending = true) => processText(t => {
    const lines = t.split('\n')
    return (ascending ? lines.sort((a, b) => a.localeCompare(b)) : lines.sort((a, b) => b.localeCompare(a))).join('\n')
  })
  const reverseLines = () => processText(t => t.split('\n').reverse().join('\n'))
  const addLineNumbers = () => processText(t => t.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n'))
  const trimWhitespace = () => processText(t => t.split('\n').map(line => line.trim()).join('\n'))

  // Utility functions
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(tr("copy") + " " + tr("completed"))
    } catch (error) {
      toast.error("Failed to copy")
    }
  }

  const downloadAsFile = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    toast.success(tr("downloadStarted"))
  }

  const clearAll = () => {
    setInputText('')
    setProcessedText('')
    toast.success(tr("clearAll"))
  }

  const useProcessedAsInput = () => {
    setInputText(processedText)
    setProcessedText('')
    setActiveTab("input")
    toast.success(tr("appliedToInput"))
  }

  const stats = getTextStats(activeTab === 'output' && processedText ? processedText : inputText)

  const ToolsPanel = (
    <div className="space-y-6">
      <Card>
          <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  {tr("textStatistics")}
              </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-2 gap-4 text-center">
              <div className="p-2 bg-muted/30 rounded border">
                  <div className="text-2xl font-bold font-mono">{stats.characters}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{tr("characters")}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded border">
                  <div className="text-2xl font-bold font-mono">{stats.words}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{tr("words")}</div>
              </div>
               <div className="p-2 bg-muted/30 rounded border">
                  <div className="text-2xl font-bold font-mono">{stats.lines}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{tr("lines")}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded border">
                  <div className="text-2xl font-bold font-mono">{stats.sentences}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{tr("sentences")}</div>
              </div>
          </CardContent>
      </Card>

      {/* Case Actions */}
      <Card>
          <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Type className="w-4 h-4" />
                  {tr("caseConversion")}
              </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={convertToUpperCase} className="justify-start">
                  <span className="text-xs">{tr("uppercase")}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={convertToLowerCase} className="justify-start">
                  <span className="text-xs">{tr("lowercase")}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={convertToTitleCase} className="justify-start">
                  <span className="text-xs">{tr("titleCase")}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={convertToSentenceCase} className="justify-start">
                  <span className="text-xs">{tr("sentenceCase")}</span>
              </Button>
              <Separator className="col-span-2 my-1" />
              <Button variant="ghost" size="sm" onClick={convertToCamelCase} className="justify-start h-8 text-xs font-mono text-muted-foreground hover:text-foreground">
                  {tr("camelCase")}
              </Button>
              <Button variant="ghost" size="sm" onClick={convertToPascalCase} className="justify-start h-8 text-xs font-mono text-muted-foreground hover:text-foreground">
                  {tr("pascalCase")}
              </Button>
              <Button variant="ghost" size="sm" onClick={convertToSnakeCase} className="justify-start h-8 text-xs font-mono text-muted-foreground hover:text-foreground">
                  {tr("snakeCase")}
              </Button>
              <Button variant="ghost" size="sm" onClick={convertToKebabCase} className="justify-start h-8 text-xs font-mono text-muted-foreground hover:text-foreground">
                  {tr("kebabCase")}
              </Button>
          </CardContent>
      </Card>

       {/* Formatting Actions */}
       <Card>
          <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <AlignLeft className="w-4 h-4" />
                  {tr("textFormatting")}
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
              <Button variant="secondary" size="sm" onClick={removeDuplicateLines} className="w-full justify-start font-normal">
                  <RefreshCw className="w-3.5 h-3.5 mr-2 opacity-70" />
                  {tr("removeDuplicateLines")}
              </Button>
              <Button variant="secondary" size="sm" onClick={removeEmptyLines} className="w-full justify-start font-normal">
                   <MoveHorizontal className="w-3.5 h-3.5 mr-2 opacity-70" />
                  {tr("removeEmptyLines")}
              </Button>
              <Button variant="secondary" size="sm" onClick={trimWhitespace} className="w-full justify-start font-normal">
                  <FileText className="w-3.5 h-3.5 mr-2 opacity-70" />
                  {tr("trimWhitespace")}
              </Button>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                   <Button variant="outline" size="sm" onClick={() => sortLines(true)} className="text-xs">
                       {tr("sortLinesAscending")}
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => sortLines(false)} className="text-xs">
                       {tr("sortLinesDescending")}
                   </Button>
                   <Button variant="outline" size="sm" onClick={reverseLines} className="col-span-2 text-xs">
                       <ArrowUpDown className="w-3 h-3 mr-1" /> {tr("reverseLines")}
                   </Button>
                   <Button variant="outline" size="sm" onClick={addLineNumbers} className="col-span-2 text-xs">
                       # {tr("addLineNumbers")}
                   </Button>
              </div>
          </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Editor Area */}
      <div className="lg:col-span-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
             <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="input">{tr("inputTab")}</TabsTrigger>
              <TabsTrigger value="output" disabled={!processedText}>{tr("outputTab")}</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Settings2 className="w-3.5 h-3.5 mr-2" />
                                {tr("tools")}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>{tr("tools")}</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 pb-8">
                                {ToolsPanel}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
                <Button variant="outline" size="sm" onClick={clearAll} className="h-8 text-destructive hover:text-destructive">
                   <Trash2 className="w-3.5 h-3.5 mr-2" />
                   {tr("clear")}
                </Button>
            </div>
          </div>

          <TabsContent value="input" className="mt-0">
            <Card className="h-[600px] flex flex-col border-dashed shadow-sm">
                <Textarea
                    placeholder={tr("enterText")}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm leading-relaxed"
                />
            </Card>
          </TabsContent>

          <TabsContent value="output" className="mt-0">
            <Card className="h-[600px] flex flex-col border-primary/20 shadow-md bg-muted/5 relative">
                <Textarea
                    value={processedText}
                    readOnly
                    className="flex-1 resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm leading-relaxed bg-transparent"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={useProcessedAsInput} className="gap-2 shadow-sm">
                        <ArrowRight className="w-3.5 h-3.5" />
                        {tr("useAsInput")}
                    </Button>
                    <Button size="sm" onClick={() => copyToClipboard(processedText)} className="gap-2 shadow-sm">
                        <Copy className="w-3.5 h-3.5" />
                        {tr("copy")}
                    </Button>
                    <MpDownloadButton
                      blob={new Blob([processedText], { type: 'text/plain' })}
                      filename="processed.txt"
                      size="sm"
                      variant="outline"
                      disabled={!processedText}
                    />
                </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Column: Tools & Stats (Desktop Only) */}
      <div className="hidden lg:block lg:col-span-4 space-y-6">
        <div className="sticky top-6">
            {ToolsPanel}
        </div>
      </div>
    </div>
  )
}
