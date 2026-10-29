"use client"

import { useState } from "react"
import { useLanguage } from "@/components/language-provider"
import { t } from "@/lib/i18n"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Globe,
  Database,
  Mail,
  Phone,
  User,
  Building,
  Search,
  Download,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  FileText,
  Link as LinkIcon,
} from "lucide-react"
import { toast } from "sonner"
import { emitToolSuccess } from "@/lib/credits/tool-success"

interface ScrapingJob {
  id: string
  name: string
  url: string
  dataTypes: string[]
  status: "idle" | "running" | "completed" | "error"
  progress: number
  results: number
}

interface ScrapedData {
  type: string
  value: string
  source: string
  confidence: number
}

export function DataScraperPro() {
  const { language } = useLanguage()
  const { user } = useUser()
  const tr = (key: string) => t(language, `dataScraperTool.${key}`)

  const [jobs, setJobs] = useState<ScrapingJob[]>([])
  const [currentJob, setCurrentJob] = useState<Partial<ScrapingJob>>({
    name: "",
    url: "",
    dataTypes: [],
  })
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const dataTypes = [
    { id: "email", name: tr("emailAddresses"), icon: Mail, description: tr("extractEmailAddresses") },
    { id: "phone", name: tr("phoneNumbers"), icon: Phone, description: tr("findPhoneNumbers") },
    { id: "names", name: tr("names"), icon: User, description: tr("extractNames") },
    { id: "companies", name: tr("companies"), icon: Building, description: tr("businessNames") },
    { id: "links", name: tr("links"), icon: LinkIcon, description: tr("urlsAndLinks") },
    { id: "text", name: tr("customText"), icon: FileText, description: tr("customPatterns") },
  ]

  const handleDataTypeToggle = (typeId: string) => {
    setSelectedDataTypes((prev) => (prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]))
  }

  const handleStartScraping = async () => {
    if (!currentJob.url || selectedDataTypes.length === 0) {
      toast.error(tr("enterUrlSelectType"))
      return
    }

    let urlObj: URL;
    try {
       urlObj = new URL(currentJob.url);
    } catch (e) {
       toast.error(tr("invalidUrlFormat"))
       return
    }

    const newJob: ScrapingJob = {
      id: Date.now().toString(),
      name: currentJob.name || `${tr("scrape")} ${urlObj.hostname}`,
      url: currentJob.url,
      dataTypes: selectedDataTypes,
      status: "running",
      progress: 0,
      results: 0,
    }

    setJobs((prev) => [...prev, newJob])
    setIsRunning(true)
    
    // Fake progress starter
    setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, progress: 10 } : job)))

    try {
      // Real API Call
      const response = await fetch('/api/tools/scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
        body: JSON.stringify({
          url: currentJob.url,
          dataTypes: selectedDataTypes
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || tr("scrapingFailedSimple"));
      }

      setScrapedData((prev) => [...prev, ...result.data]);
      
      setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { 
        ...job, 
        status: "completed", 
        progress: 100,
        results: result.count
      } : job)));

      if (typeof result?.warning === "string" && result.warning.trim()) {
        toast.warning(
          language === "zh"
            ? "目标页面可能有登录或风控限制，当前仅返回可见数据。"
            : result.warning
        );
      }

      if (Number(result.count) > 0) {
        emitToolSuccess("data-scraper")
      }
      toast.success(tr("scrapingCompleted").replace("{count}", String(result.count)));

    } catch (error: any) {
      console.error(error);
      setJobs((prev) => prev.map((job) => (job.id === newJob.id ? { ...job, status: "error", progress: 0 } : job)));
      toast.error(tr("scrapingFailed").replace("{error}", String(error?.message || tr("unknownError"))));
    } finally {
      setIsRunning(false)
      setCurrentJob({ name: "", url: "", dataTypes: [] })
      setSelectedDataTypes([])
    }
  }

  const exportData = (format: "csv" | "json") => {
    const dataStr = format === "json" ? JSON.stringify(scrapedData, null, 2) : convertToCSV(scrapedData)
    const blob = new Blob([dataStr], { type: format === "json" ? "application/json" : "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scraped-data.${format}`
    a.click()
  }

  const convertToCSV = (data: ScrapedData[]) => {
    const headers = [tr("type"), tr("value"), tr("source"), tr("confidence")]
    const rows = data.map((item) => [item.type, item.value, item.source, item.confidence.toString()])
    return [headers, ...rows].map((row) => row.join(",")).join("\n")
  }

  const getStatusBadgeVariant = (status: ScrapingJob['status']) => {
    switch(status) {
      case 'completed': return 'default'
      case 'running': return 'secondary'
      case 'error': return 'destructive'
      default: return 'outline'
    }
  }

  const statusLabel = (status: ScrapingJob["status"]) => {
    if (status === "running") return tr("running")
    if (status === "completed") return tr("completed")
    if (status === "error") return tr("error")
    return tr("idle")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Tabs defaultValue="scraper" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scraper">{tr("scraper")}</TabsTrigger>
            <TabsTrigger value="data">{tr("data")}</TabsTrigger>
            <TabsTrigger value="settings">{tr("settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="scraper" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {tr("webScraper")}
                </CardTitle>
                <CardDescription>{tr("extractDataFromWebsites")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 border-2 border-dashed rounded-lg bg-muted/10 space-y-4">
                  <div className="space-y-2">
                     <Label className="text-base font-medium flex items-center gap-2">
                       <LinkIcon className="w-4 h-4 text-primary" /> {tr("targetUrl")}
                     </Label>
                     <div className="flex gap-2">
                       <Input
                          id="target-url"
                          value={currentJob.url || ""}
                          onChange={(e) => setCurrentJob((prev) => ({ ...prev, url: e.target.value }))}
                          placeholder="https://example.com"
                          className="h-10 font-mono text-sm"
                        />
                     </div>
                     <p className="text-xs text-muted-foreground pl-1">{tr("startingPointForJob")}</p>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                     <Label className="text-sm font-medium">{tr("jobName")} <span className="text-muted-foreground font-normal">({tr("optional")})</span></Label>
                     <Input
                        id="job-name"
                        value={currentJob.name || ""}
                        onChange={(e) => setCurrentJob((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder={tr("myScrappingJob")}
                        className="h-9"
                      />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium">{tr("dataTypesToExtract")}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dataTypes.map((dataType) => {
                      const Icon = dataType.icon
                      const isSelected = selectedDataTypes.includes(dataType.id)

                      return (
                        <div
                          key={dataType.id}
                          className={`
                            cursor-pointer rounded-lg border p-3 flex items-start gap-3 transition-all hover:bg-muted/50
                            ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : ""}
                          `}
                          onClick={() => handleDataTypeToggle(dataType.id)}
                        >
                          <div className={`p-2 rounded-md ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{dataType.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{dataType.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selectedDataTypes.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-4 h-4" />
                    <span>{tr("selectAtLeastOneDataType")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      {tr("dataFound")}
                    </CardTitle>
                    <CardDescription>{scrapedData.length} {tr("recordsExtracted")}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportData("csv")} disabled={scrapedData.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportData("json")} disabled={scrapedData.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {scrapedData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <div className="bg-muted/30 p-4 rounded-full mb-4">
                        <Search className="w-8 h-8 opacity-40" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">{tr("noDataExtracted")}</h3>
                    <p className="text-sm">{tr("runJobToSeeData")}</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b bg-muted/5 flex items-center gap-4">
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue placeholder={tr("filterByType")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{tr("allTypes")}</SelectItem>
                          <SelectItem value="email">{tr("emailAddresses")}</SelectItem>
                          <SelectItem value="phone">{tr("phoneNumbers")}</SelectItem>
                          <SelectItem value="names">{tr("names")}</SelectItem>
                          <SelectItem value="companies">{tr("companies")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={tr("searchWithinResults")}
                          className="pl-9 h-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {scrapedData
                          .filter(item => filterType === "all" || item.type === filterType)
                          .filter(item => !searchQuery || item.value.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((item, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3">
                            <div className="flex items-start gap-3 overflow-hidden">
                              <div className="mt-1 shrink-0">
                                {(() => {
                                  const dataType = dataTypes.find((dt) => dt.id === item.type)
                                  const Icon = dataType?.icon || FileText
                                  return (
                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                       <Icon className="w-4 h-4" />
                                    </div>
                                  )
                                })()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{item.value}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{item.type}</Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                        <Globe className="w-3 h-3" />
                                        {new URL(item.source).hostname}
                                    </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-muted-foreground pl-11 sm:pl-0">
                                <span className={item.confidence > 80 ? "text-green-600" : "text-yellow-600"}>{item.confidence}% {tr("match")}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Eye className="w-3 h-3" />
                                </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {tr("scraperSettings")}
                </CardTitle>
                <CardDescription>{tr("configureScrapingBehavior")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">{tr("respectRobotsTxt")}</Label>
                      <p className="text-xs text-muted-foreground">{tr("followWebsiteGuidelines")}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <Label className="text-base">{tr("useProxyRotation")}</Label>
                        <p className="text-xs text-muted-foreground">{tr("rotateIPAddresses")}</p>
                     </div>
                     <Switch />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{tr("requestDelay")}</Label>
                      <Select defaultValue="2">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{tr("oneSecond")}</SelectItem>
                          <SelectItem value="2">{tr("twoSeconds")}</SelectItem>
                          <SelectItem value="5">{tr("fiveSeconds")}</SelectItem>
                          <SelectItem value="10">{tr("tenSeconds")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{tr("delayBetweenRequests")}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>{tr("maxPagesPerJob")}</Label>
                      <Select defaultValue="100">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">{tr("tenPages")}</SelectItem>
                          <SelectItem value="50">{tr("fiftyPages")}</SelectItem>
                          <SelectItem value="100">{tr("hundredPages")}</SelectItem>
                          <SelectItem value="500">{tr("fiveHundredPages")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{tr("limitPagesHint")}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-4 space-y-6">
          {/* Status Card */}
          <Card className="shadow-lg border-t-4 border-t-primary sticky top-6">
              <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-lg flex items-center justify-between">
                      {tr("activeJobs")}
                      <Badge variant="secondary">{isRunning ? tr("running") : tr("ready")}</Badge>
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                 {/* Overall Stats */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 p-3 rounded-lg text-center border">
                        <span className="block text-2xl font-bold">{scrapedData.length}</span>
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">{tr("itemsFound")}</span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg text-center border">
                        <span className="block text-2xl font-bold">{jobs.length}</span>
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">{tr("jobsRun")}</span>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <Button 
                        size="lg" 
                        className="w-full h-12 text-lg shadow-sm"
                        onClick={handleStartScraping}
                        disabled={!currentJob.url || selectedDataTypes.length === 0 || isRunning}
                    >
                        {isRunning ? (
                            <>
                            <Pause className="w-5 h-5 mr-2" />
                            {tr("scraping")}
                            </>
                        ) : (
                            <>
                            <Play className="w-5 h-5 mr-2" />
                            {tr("startScraping")}
                            </>
                        )}
                    </Button>
                    {!currentJob.url && !isRunning && (
                       <p className="text-xs text-center text-muted-foreground pt-2">{tr("enterUrlToStart")}</p>
                    )}
                 </div>

                 {/* Recent Jobs List */}
                 <div className="space-y-3 pt-2">
                     <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <Database className="w-3 h-3" /> {tr("recentActivity")}
                     </h4>
                     {jobs.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 italic border-t border-dashed">
                           {tr("noJobsRunYet")}
                        </div>
                     ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                           {[...jobs].reverse().slice(0, 5).map(job => (
                              <div key={job.id} className="p-3 border rounded-md text-sm bg-background hover:bg-muted/20 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                     <span className="font-medium truncate max-w-[120px]">{job.name}</span>
                                     <Badge variant={getStatusBadgeVariant(job.status)} className="text-[10px] h-5 px-1.5">{statusLabel(job.status)}</Badge>
                                  </div>
                                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-2">
                                      <div className="bg-primary h-full transition-all duration-500" style={{width: `${job.progress}%`}} />
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                      <span className="truncate max-w-[140px]">{new URL(job.url).hostname}</span>
                                      <span>{job.results} {tr("items")}</span>
                                  </div>
                              </div>
                           ))}
                        </div>
                     )}
                 </div>
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
