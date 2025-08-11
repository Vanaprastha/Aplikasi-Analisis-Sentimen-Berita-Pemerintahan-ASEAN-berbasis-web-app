"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Search,
  BarChart3,
  Eye,
  Calendar,
  Zap,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Globe,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NewsArticle {
  title: string
  url: string
  publisher: string
  publishedDate: string
  sentiment: string
  score: number
  originalLabel: string
}

interface GovernmentAnalysis {
  country: string
  articles: NewsArticle[]
  sentimentSummary: {
    Positif: number
    Netral: number
    Negatif: number
  }
  recommendation: string
  lastUpdated: string
  totalArticles: number
}

interface ApiStatus {
  gnews: {
    connected: boolean
    status: string
    message: string
    lastChecked: Date | null
  }
  huggingface: {
    connected: boolean
    status: string
    message: string
    lastChecked: Date | null
  }
}

// SELURUH NEGARA ASEAN
const countries = [
  { code: "BN", name: "Brunei", fullName: "Brunei Darussalam Government", color: "bg-yellow-500", flag: "🇧🇳" },
  { code: "KH", name: "Kamboja", fullName: "Cambodia Government", color: "bg-blue-600", flag: "🇰🇭" },
  { code: "ID", name: "Indonesia", fullName: "Indonesia Government", color: "bg-red-500", flag: "🇮🇩" },
  { code: "LA", name: "Laos", fullName: "Laos Government", color: "bg-red-600", flag: "🇱🇦" },
  { code: "MY", name: "Malaysia", fullName: "Malaysia Government", color: "bg-blue-500", flag: "🇲🇾" },
  { code: "MM", name: "Myanmar", fullName: "Myanmar Government", color: "bg-yellow-600", flag: "🇲🇲" },
  { code: "PH", name: "Filipina", fullName: "Philippines Government", color: "bg-blue-700", flag: "🇵🇭" },
  { code: "SG", name: "Singapura", fullName: "Singapore Government", color: "bg-green-500", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", fullName: "Thailand Government", color: "bg-purple-500", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", fullName: "Vietnam Government", color: "bg-red-700", flag: "🇻🇳" },
]

export default function GovernmentSentimentAnalyzer() {
  const [analyses, setAnalyses] = useState<GovernmentAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCountry, setCurrentCountry] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastDataFetch, setLastDataFetch] = useState<Date | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<GovernmentAnalysis | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    gnews: {
      connected: false,
      status: "unchecked",
      message: "Belum dicek",
      lastChecked: null,
    },
    huggingface: {
      connected: false,
      status: "unchecked",
      message: "Belum dicek",
      lastChecked: null,
    },
  })
  const [checkingApi, setCheckingApi] = useState(false)

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    setCheckingApi(true)

    try {
      const response = await fetch("/api/check-status", {
        method: "GET",
      })

      if (response.ok) {
        const status = await response.json()
        setApiStatus({
          gnews: {
            ...status.gnews,
            lastChecked: new Date(),
          },
          huggingface: {
            ...status.huggingface,
            lastChecked: new Date(),
          },
        })
      }
    } catch (error) {
      console.error("Error checking API status:", error)
      setApiStatus({
        gnews: {
          connected: false,
          status: "error",
          message: "Gagal mengecek koneksi",
          lastChecked: new Date(),
        },
        huggingface: {
          connected: false,
          status: "error",
          message: "Gagal mengecek koneksi",
          lastChecked: new Date(),
        },
      })
    } finally {
      setCheckingApi(false)
    }
  }

  const getStatusIcon = (connected: boolean, status: string) => {
    if (status === "unchecked") {
      return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
    if (connected) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (connected: boolean, status: string) => {
    if (status === "unchecked") {
      return "bg-gray-50 text-gray-700 border-gray-200"
    }
    if (connected) {
      return "bg-green-50 text-green-700 border-green-200"
    }
    return "bg-red-50 text-red-700 border-red-200"
  }

  const filteredCountries = countries.filter(
    (country) =>
      country.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredAnalyses = analyses.filter((analysis) =>
    analysis.country.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const analyzeGovernments = async () => {
    if (!apiStatus.gnews.connected || !apiStatus.huggingface.connected) {
      setError("Kedua API harus terhubung untuk menjalankan analisis")
      return
    }

    setLoading(true)
    setAnalyses([])
    setProgress(0)
    setError(null)
    setLastDataFetch(new Date())

    try {
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i]
        setCurrentCountry(country.name)
        setProgress((i / countries.length) * 100)

        try {
          const response = await fetch("/api/analyze-government", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ country: country.code }),
          })

          if (response.ok) {
            const analysis = await response.json()
            analysis.lastUpdated = new Date().toISOString()
            setAnalyses((prev) => [...prev, analysis])
          } else {
            const errorData = await response.json()
            console.error(`Error analyzing ${country.name}:`, errorData.error)
          }
        } catch (countryError) {
          console.error(`Error analyzing ${country.name}:`, countryError)
        }

        // Delay seperti di code Python (0.5 detik)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      setProgress(100)
    } catch (error) {
      console.error("Error analyzing governments:", error)
      setError("Terjadi kesalahan saat menganalisis pemerintahan")
    } finally {
      setLoading(false)
      setCurrentCountry("")
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "Positif":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "Negatif":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positif":
        return "bg-green-50 text-green-700 border-green-200"
      case "Negatif":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "POSITIF":
        return "bg-green-500 hover:bg-green-600 text-white shadow-green-100"
      case "NEGATIF":
        return "bg-red-500 hover:bg-red-600 text-white shadow-red-100"
      default:
        return "bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-100"
    }
  }

  const getCountryColor = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode)
    return country?.color || "bg-gray-500"
  }

  const getCountryFlag = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode)
    return country?.flag || "🏛️"
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTotalSentimentStats = () => {
    const total = { Positif: 0, Netral: 0, Negatif: 0 }
    analyses.forEach((analysis) => {
      total.Positif += analysis.sentimentSummary.Positif
      total.Netral += analysis.sentimentSummary.Netral
      total.Negatif += analysis.sentimentSummary.Negatif
    })
    return total
  }

  const totalStats = getTotalSentimentStats()

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="bg-gray-50 rounded-3xl p-8 mb-6 border border-gray-200 shadow-lg">
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              🏛️ <span className="text-blue-600">Analisis Sentimen</span>{" "}
              <span className="text-red-600">Pemerintahan ASEAN</span>
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              Menggunakan GNews API & Model AI siebert/sentiment-roberta-large-english
            </p>
            <p className="text-sm text-gray-500 mb-6">
              🇬🇧 English News Analysis - 10 Negara ASEAN - Max: 8 per negara - Search Endpoint Only
            </p>

            {/* API Status Section */}
            <div className="mb-6">
              <div className="flex justify-center items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Status Koneksi API</h3>
                <Button
                  onClick={checkApiStatus}
                  disabled={checkingApi}
                  variant="outline"
                  size="sm"
                  className="ml-2 bg-transparent"
                >
                  {checkingApi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* GNews API Status */}
                <div
                  className={`p-4 rounded-xl border ${getStatusColor(apiStatus.gnews.connected, apiStatus.gnews.status)}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(apiStatus.gnews.connected, apiStatus.gnews.status)}
                    <div>
                      <h4 className="font-semibold">GNews API</h4>
                      <p className="text-sm opacity-75">English News Source</p>
                    </div>
                    {apiStatus.gnews.connected ? (
                      <Wifi className="h-5 w-5 text-green-500 ml-auto" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-sm font-medium">{apiStatus.gnews.message}</p>
                  {apiStatus.gnews.lastChecked && (
                    <p className="text-xs opacity-60 mt-1">Dicek: {formatTime(apiStatus.gnews.lastChecked)}</p>
                  )}
                </div>

                {/* Hugging Face API Status */}
                <div
                  className={`p-4 rounded-xl border ${getStatusColor(apiStatus.huggingface.connected, apiStatus.huggingface.status)}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(apiStatus.huggingface.connected, apiStatus.huggingface.status)}
                    <div>
                      <h4 className="font-semibold">Hugging Face API</h4>
                      <p className="text-sm opacity-75">English Sentiment Model</p>
                    </div>
                    {apiStatus.huggingface.connected ? (
                      <Wifi className="h-5 w-5 text-green-500 ml-auto" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-500 ml-auto" />
                    )}
                  </div>
                  <p className="text-sm font-medium">{apiStatus.huggingface.message}</p>
                  {apiStatus.huggingface.lastChecked && (
                    <p className="text-xs opacity-60 mt-1">Dicek: {formatTime(apiStatus.huggingface.lastChecked)}</p>
                  )}
                </div>
              </div>

              {/* API Status Alert */}
              {(!apiStatus.gnews.connected || !apiStatus.huggingface.connected) && (
                <Alert className="mt-4 max-w-2xl mx-auto bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>API Tidak Terhubung:</strong> Pastikan kedua API terhubung sebelum menjalankan analisis.
                    Periksa API key dan koneksi internet Anda.
                  </AlertDescription>
                </Alert>
              )}

              {apiStatus.gnews.connected && apiStatus.huggingface.connected && (
                <Alert className="mt-4 max-w-2xl mx-auto bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Semua API Terhubung:</strong> Sistem siap melakukan analisis dengan data real-time dari
                    GNews (English) dan model AI Hugging Face (English Sentiment).
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Time Display */}
            <div className="flex justify-center gap-6 mb-6">
              <div className="bg-white rounded-2xl px-6 py-3 border border-gray-300 shadow-md">
                <div className="flex items-center gap-2 text-gray-800">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Waktu Sekarang:</span>
                  <span className="font-mono text-lg text-blue-600">{formatTime(currentTime)}</span>
                </div>
              </div>

              {lastDataFetch && (
                <div className="bg-white rounded-2xl px-6 py-3 border border-gray-300 shadow-md">
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Data Terakhir:</span>
                    <span className="font-mono text-sm text-green-600">{formatDateTime(lastDataFetch)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Overview */}
            {analyses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-500 rounded-xl p-4 shadow-lg">
                  <div className="text-center">
                    <Globe className="h-8 w-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{analyses.length}</div>
                    <div className="text-blue-100 text-sm">Negara ASEAN</div>
                  </div>
                </div>
                <div className="bg-green-500 rounded-xl p-4 shadow-lg">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{totalStats.Positif}</div>
                    <div className="text-green-100 text-sm">Berita Positif</div>
                  </div>
                </div>
                <div className="bg-yellow-500 rounded-xl p-4 shadow-lg">
                  <div className="text-center">
                    <Minus className="h-8 w-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{totalStats.Netral}</div>
                    <div className="text-yellow-100 text-sm">Berita Netral</div>
                  </div>
                </div>
                <div className="bg-red-500 rounded-xl p-4 shadow-lg">
                  <div className="text-center">
                    <TrendingDown className="h-8 w-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{totalStats.Negatif}</div>
                    <div className="text-red-100 text-sm">Berita Negatif</div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="mb-6 max-w-2xl mx-auto bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={analyzeGovernments}
                disabled={loading || !apiStatus.gnews.connected || !apiStatus.huggingface.connected}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Menganalisis {currentCountry || "Pemerintahan"}...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-6 w-6" />
                    Analisis 10 Negara ASEAN (8 berita)
                  </>
                )}
              </Button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Cari negara ASEAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder-gray-500 rounded-2xl w-64 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Progress */}
        {loading && (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 border border-gray-300 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  <span className="text-gray-800 font-semibold">
                    Menganalisis: <span className="text-orange-500">{currentCountry}</span>
                  </span>
                </div>
              </div>
              <Progress value={progress} className="w-full max-w-md mx-auto h-3 bg-gray-200" />
              <div className="text-center mt-2 text-gray-600 text-sm">
                {analyses.length} dari {countries.length} negara ASEAN selesai ({progress.toFixed(0)}%)
              </div>
            </div>
          </div>
        )}

        {/* Government Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnalyses.map((analysis, index) => (
            <Card
              key={index}
              className="bg-white border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group hover:border-gray-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full ${getCountryColor(analysis.country)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                    >
                      {getCountryFlag(analysis.country)}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {countries.find((c) => c.code === analysis.country)?.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {countries.find((c) => c.code === analysis.country)?.fullName}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getRecommendationColor(analysis.recommendation)} shadow-lg`}>
                    {analysis.recommendation}
                  </Badge>
                </div>
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {analysis.totalArticles} berita • {formatDateTime(new Date(analysis.lastUpdated))}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Sentiment Summary */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Ringkasan Sentimen
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-700">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Positif
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-500"
                              style={{
                                width: `${analysis.totalArticles > 0 ? (analysis.sentimentSummary.Positif / analysis.totalArticles) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-green-600 min-w-[20px]">
                            {analysis.sentimentSummary.Positif}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-700">
                          <Minus className="h-4 w-4 text-yellow-600" />
                          Netral
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 transition-all duration-500"
                              style={{
                                width: `${analysis.totalArticles > 0 ? (analysis.sentimentSummary.Netral / analysis.totalArticles) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-yellow-600 min-w-[20px]">
                            {analysis.sentimentSummary.Netral}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-700">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          Negatif
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 transition-all duration-500"
                              style={{
                                width: `${analysis.totalArticles > 0 ? (analysis.sentimentSummary.Negatif / analysis.totalArticles) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-red-600 min-w-[20px]">
                            {analysis.sentimentSummary.Negatif}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Articles */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview Berita
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {analysis.articles.slice(0, 2).map((article, articleIndex) => (
                        <div
                          key={articleIndex}
                          className="bg-gray-50 border-l-4 border-gray-300 pl-3 py-2 rounded-r-lg"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            {getSentimentIcon(article.sentiment)}
                            <Badge
                              variant="outline"
                              className={`text-xs ${getSentimentColor(article.sentiment)} border-0`}
                            >
                              {article.sentiment}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                              {article.originalLabel}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">{article.title}</p>
                          <p className="text-xs text-gray-500">
                            {article.publisher} • Score: {article.score.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-3 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl"
                          onClick={() => setSelectedCountry(analysis)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Semua Berita ({analysis.totalArticles})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white border-gray-300 text-gray-900">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${getCountryColor(analysis.country)} flex items-center justify-center text-white font-bold`}
                            >
                              {getCountryFlag(analysis.country)}
                            </div>
                            Detail Analisis {countries.find((c) => c.code === analysis.country)?.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {analysis.articles.map((article, articleIndex) => (
                            <div key={articleIndex} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <div className="flex items-start gap-3 mb-3">
                                {getSentimentIcon(article.sentiment)}
                                <Badge className={`${getSentimentColor(article.sentiment)} border-0`}>
                                  {article.sentiment} ({article.score.toFixed(2)})
                                </Badge>
                                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                  Original: {article.originalLabel}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                              <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                                <span>{article.publisher}</span>
                                <span>{new Date(article.publishedDate).toLocaleDateString("id-ID")}</span>
                              </div>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 text-sm underline"
                              >
                                Baca selengkapnya <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {analyses.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-3xl p-12 border border-gray-200 shadow-lg">
              <div className="text-6xl mb-4">🏛️</div>
              <p className="text-gray-800 text-xl mb-4">Siap untuk menganalisis sentimen pemerintahan ASEAN?</p>
              <p className="text-gray-600 mb-2">Pastikan kedua API terhubung untuk analisis real-time</p>
              <p className="text-sm text-gray-500">
                🇬🇧 GNews API (English) → Model AI siebert/sentiment-roberta-large-english → Analisis 10 Negara ASEAN
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-lg">
            <p className="text-gray-600 text-sm">
              Powered by GNews API & siebert/sentiment-roberta-large-english •{" "}
              <span className="text-blue-600 font-semibold">{formatTime(currentTime)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              🇬🇧 English Analysis - 10 Negara ASEAN - Search Endpoint Only - Max: 8 results, Delay: 0.5s
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
