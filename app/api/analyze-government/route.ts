import { type NextRequest, NextResponse } from "next/server"

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
  totalArticles: number
}

// Mapping negara ke query sederhana - SELURUH NEGARA ASEAN
const countryQueries = {
  BN: "brunei government",
  KH: "cambodia government",
  ID: "indonesia government",
  LA: "laos government",
  MY: "malaysia government",
  MM: "myanmar government",
  PH: "philippines government",
  SG: "singapore government",
  TH: "thailand government",
  VN: "vietnam government",
}

// Fungsi mapping label ke sentimen untuk model siebert/sentiment-roberta-large-english
function mapSentiment(label: string): string {
  const normalizedLabel = label.toLowerCase()

  if (["positive"].includes(normalizedLabel)) {
    return "Positif"
  } else if (["neutral"].includes(normalizedLabel)) {
    return "Netral"
  } else if (["negative"].includes(normalizedLabel)) {
    return "Negatif"
  }

  return label
}

// Fungsi untuk analisis sentimen menggunakan model siebert/sentiment-roberta-large-english
async function analyzeSentiment(text: string) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY tidak ditemukan")
  }

  const response = await fetch("https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english", {
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      inputs: text,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.status}`)
  }

  const result = await response.json()

  if (result.error && result.error.includes("loading")) {
    throw new Error("Model sedang loading, coba lagi nanti")
  }

  if (Array.isArray(result) && result.length > 0) {
    const prediction = result[0]
    if (Array.isArray(prediction)) {
      const bestPrediction = prediction.reduce((prev, current) => (prev.score > current.score ? prev : current))
      return {
        label: bestPrediction.label,
        score: bestPrediction.score,
      }
    } else if (prediction.label && prediction.score) {
      return {
        label: prediction.label,
        score: prediction.score,
      }
    }
  }

  throw new Error("Unexpected response format dari Hugging Face")
}

// Method 1: Browser-style request (seperti status check yang berhasil)
async function tryGNewsBrowserStyle(apiKey: string, query: string): Promise<any> {
  console.log(`[DEBUG] Method 1: Browser-style request`)

  const url = `https://gnews.io/api/v4/search`
  const params = new URLSearchParams({
    q: query,
    lang: "en",
    max: "8",
    apikey: apiKey,
  })

  const response = await fetch(`${url}?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      DNT: "1",
      Origin: "https://gnews.io",
      Referer: "https://gnews.io/docs/v4",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(8000),
  })

  return { success: true, response }
}

// Method 2: Simple fetch dengan minimal headers
async function tryGNewsSimpleFetch(apiKey: string, query: string): Promise<any> {
  console.log(`[DEBUG] Method 2: Simple fetch`)

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&apikey=${apiKey}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  })

  return { success: true, response }
}

// Method 3: Curl-style request
async function tryGNewsCurlStyle(apiKey: string, query: string): Promise<any> {
  console.log(`[DEBUG] Method 3: Curl-style request`)

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&apikey=${apiKey}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "curl/7.68.0",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeoutId)
    return { success: true, response }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Method 4: HTTPS Module dengan search endpoint
async function tryGNewsHTTPS(apiKey: string, query: string): Promise<any> {
  console.log(`[DEBUG] Method 4: HTTPS Module`)

  return new Promise((resolve, reject) => {
    try {
      const https = require("https")
      const querystring = require("querystring")

      const params = querystring.stringify({
        q: query,
        lang: "en",
        max: "8",
        apikey: apiKey,
      })

      const options = {
        hostname: "gnews.io",
        port: 443,
        path: `/api/v4/search?${params}`,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        timeout: 10000,
      }

      const req = https.request(options, (res: any) => {
        let data = ""
        res.on("data", (chunk: any) => {
          data += chunk
        })

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const jsonData = JSON.parse(data)
              resolve({ success: true, data: jsonData })
            } else {
              reject(new Error(`GNews API HTTP error: ${res.statusCode}`))
            }
          } catch (parseError: any) {
            reject(new Error(`Error parsing GNews response: ${parseError.message}`))
          }
        })
      })

      req.on("error", (error: any) => {
        reject(new Error(`GNews HTTPS request error: ${error.message}`))
      })

      req.on("timeout", () => {
        req.destroy()
        reject(new Error("GNews HTTPS request timeout"))
      })

      req.setTimeout(10000)
      req.end()
    } catch (error: any) {
      reject(new Error(`GNews HTTPS implementation error: ${error.message}`))
    }
  })
}

// Method 5: Alternative query variations
async function tryGNewsAlternativeQueries(apiKey: string, country: string): Promise<any> {
  console.log(`[DEBUG] Method 5: Alternative query variations`)

  // Alternative queries untuk setiap negara ASEAN
  const getAlternativeQueries = (countryCode: string) => {
    const baseQuery = countryQueries[countryCode as keyof typeof countryQueries]

    switch (countryCode) {
      case "BN":
        return [baseQuery, "brunei politics", "brunei news", "brunei"]
      case "KH":
        return [baseQuery, "cambodia politics", "cambodia news", "cambodia"]
      case "ID":
        return [baseQuery, "indonesia politics", "indonesia news", "indonesia"]
      case "LA":
        return [baseQuery, "laos politics", "laos news", "laos"]
      case "MY":
        return [baseQuery, "malaysia politics", "malaysia news", "malaysia"]
      case "MM":
        return [baseQuery, "myanmar politics", "myanmar news", "myanmar"]
      case "PH":
        return [baseQuery, "philippines politics", "philippines news", "philippines"]
      case "SG":
        return [baseQuery, "singapore politics", "singapore news", "singapore"]
      case "TH":
        return [baseQuery, "thailand politics", "thailand news", "thailand"]
      case "VN":
        return [baseQuery, "vietnam politics", "vietnam news", "vietnam"]
      default:
        return [baseQuery, `${country.toLowerCase()} politics`, `${country.toLowerCase()} news`, country.toLowerCase()]
    }
  }

  const alternativeQueries = getAlternativeQueries(country)

  for (const altQuery of alternativeQueries) {
    try {
      console.log(`[DEBUG] Trying alternative query: "${altQuery}"`)

      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(altQuery)}&lang=en&max=8&apikey=${apiKey}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "PostmanRuntime/7.32.3",
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        signal: AbortSignal.timeout(6000),
      })

      if (response.ok) {
        return { success: true, response, query: altQuery }
      }
    } catch (error) {
      console.log(`[DEBUG] Alternative query "${altQuery}" failed: ${error}`)
      continue
    }
  }

  throw new Error("All alternative queries failed")
}

// Main function - HANYA menggunakan search endpoint
async function getNewsFromGNews(country: string): Promise<any[]> {
  if (!process.env.GNEWS_API_KEY) {
    throw new Error("GNEWS_API_KEY tidak ditemukan")
  }

  const apiKey = process.env.GNEWS_API_KEY
  const query = countryQueries[country as keyof typeof countryQueries] || `${country.toLowerCase()} government`

  console.log(`[DEBUG] 🚀 SEARCH ONLY: Using search endpoint methods for ${country}`)
  console.log(`[DEBUG] Query: "${query}" (lang=en, max=8)`)
  console.log(`[DEBUG] ❌ NO top-headlines - search endpoint only`)

  // Method 1: Browser-style request
  try {
    console.log(`[DEBUG] Method 1: Browser-style for ${country}`)
    const result1 = await tryGNewsBrowserStyle(apiKey, query)
    if (result1.success && result1.response.ok) {
      const data = await result1.response.json()
      console.log(`[DEBUG] ✅ Method 1 SUCCESS for ${country}: ${data.articles?.length || 0} articles`)

      // Check for API errors
      if (data.errors && data.errors.length > 0) {
        console.log(`[DEBUG] API Error detected: ${data.errors[0]}`)
        throw new Error(`API Error: ${data.errors[0]}`)
      }

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((article: any) => ({
          title: article.title,
          url: article.url,
          publisher: { title: article.source.name },
          published_date: article.publishedAt,
        }))
      }
    }
  } catch (error: any) {
    console.log(`[DEBUG] ❌ Method 1 failed for ${country}: ${error.message}`)
  }

  // Method 2: Simple fetch
  try {
    console.log(`[DEBUG] Method 2: Simple fetch for ${country}`)
    const result2 = await tryGNewsSimpleFetch(apiKey, query)
    if (result2.success && result2.response.ok) {
      const data = await result2.response.json()
      console.log(`[DEBUG] ✅ Method 2 SUCCESS for ${country}: ${data.articles?.length || 0} articles`)

      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors[0]}`)
      }

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((article: any) => ({
          title: article.title,
          url: article.url,
          publisher: { title: article.source.name },
          published_date: article.publishedAt,
        }))
      }
    }
  } catch (error: any) {
    console.log(`[DEBUG] ❌ Method 2 failed for ${country}: ${error.message}`)
  }

  // Method 3: Curl-style
  try {
    console.log(`[DEBUG] Method 3: Curl-style for ${country}`)
    const result3 = await tryGNewsCurlStyle(apiKey, query)
    if (result3.success && result3.response.ok) {
      const data = await result3.response.json()
      console.log(`[DEBUG] ✅ Method 3 SUCCESS for ${country}: ${data.articles?.length || 0} articles`)

      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors[0]}`)
      }

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((article: any) => ({
          title: article.title,
          url: article.url,
          publisher: { title: article.source.name },
          published_date: article.publishedAt,
        }))
      }
    }
  } catch (error: any) {
    console.log(`[DEBUG] ❌ Method 3 failed for ${country}: ${error.message}`)
  }

  // Method 4: HTTPS Module
  try {
    console.log(`[DEBUG] Method 4: HTTPS Module for ${country}`)
    const result4 = await tryGNewsHTTPS(apiKey, query)
    if (result4.success && result4.data) {
      const data = result4.data
      console.log(`[DEBUG] ✅ Method 4 SUCCESS for ${country}: ${data.articles?.length || 0} articles`)

      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors[0]}`)
      }

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((article: any) => ({
          title: article.title,
          url: article.url,
          publisher: { title: article.source.name },
          published_date: article.publishedAt,
        }))
      }
    }
  } catch (error: any) {
    console.log(`[DEBUG] ❌ Method 4 failed for ${country}: ${error.message}`)
  }

  // Method 5: Alternative queries
  try {
    console.log(`[DEBUG] Method 5: Alternative queries for ${country}`)
    const result5 = await tryGNewsAlternativeQueries(apiKey, country)
    if (result5.success && result5.response.ok) {
      const data = await result5.response.json()
      console.log(
        `[DEBUG] ✅ Method 5 SUCCESS for ${country}: ${data.articles?.length || 0} articles with query "${result5.query}"`,
      )

      if (data.errors && data.errors.length > 0) {
        throw new Error(`API Error: ${data.errors[0]}`)
      }

      if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
        return data.articles.map((article: any) => ({
          title: article.title,
          url: article.url,
          publisher: { title: article.source.name },
          published_date: article.publishedAt,
        }))
      }
    }
  } catch (error: any) {
    console.log(`[DEBUG] ❌ Method 5 failed for ${country}: ${error.message}`)
  }

  // Semua metode search gagal
  throw new Error(
    `Semua 5 metode search endpoint gagal untuk ${country}. Kemungkinan masalah API key, rate limit, atau tidak ada berita yang relevan.`,
  )
}

// Fungsi untuk menentukan rekomendasi
function getRecommendation(sentimentSummary: { Positif: number; Netral: number; Negatif: number }): string {
  const total = sentimentSummary.Positif + sentimentSummary.Netral + sentimentSummary.Negatif

  if (total === 0) return "NETRAL"

  const positiveRatio = sentimentSummary.Positif / total
  const negativeRatio = sentimentSummary.Negatif / total

  if (positiveRatio >= 0.6) return "POSITIF"
  if (negativeRatio >= 0.6) return "NEGATIF"
  return "NETRAL"
}

export async function POST(request: NextRequest) {
  try {
    const { country } = await request.json()

    if (!country) {
      return NextResponse.json({ error: "Country code is required" }, { status: 400 })
    }

    const countryName =
      {
        BN: "Brunei Darussalam",
        KH: "Kamboja",
        ID: "Indonesia",
        LA: "Laos",
        MY: "Malaysia",
        MM: "Myanmar",
        PH: "Filipina",
        SG: "Singapura",
        TH: "Thailand",
        VN: "Vietnam",
      }[country] || country

    console.log(`
=== SEARCH ONLY: Analisis Sentimen Berita Pemerintahan ${countryName} (English) ===`)
    console.log(`Menggunakan model: siebert/sentiment-roberta-large-english`)
    console.log(
      `Query: "${countryQueries[country as keyof typeof countryQueries] || `${country.toLowerCase()} government`}"`,
    )
    console.log(`Parameters: lang=en, max=8`)
    console.log(`🔍 SEARCH ENDPOINT ONLY - No top-headlines`)

    // Ambil berita menggunakan HANYA search endpoint
    const news = await getNewsFromGNews(country)

    const articles: NewsArticle[] = []
    const sentimentSummary = {
      Positif: 0,
      Netral: 0,
      Negatif: 0,
    }

    if (news.length > 0) {
      // Analisis sentimen untuk setiap berita
      for (let i = 0; i < news.length; i++) {
        const article = news[i]

        const title = article.title
        console.log(`${i + 1}. Analyzing: ${title}`)

        // Analisis sentimen menggunakan model siebert/sentiment-roberta-large-english
        const results = await analyzeSentiment(title)
        const label = results.label
        const score = results.score
        const sentiment = mapSentiment(label)

        const processedArticle: NewsArticle = {
          title: title,
          url: article.url,
          publisher: article.publisher.title,
          publishedDate: article.published_date,
          sentiment: sentiment,
          score: score,
          originalLabel: label,
        }

        articles.push(processedArticle)

        // Update sentiment summary
        if (sentiment === "Positif") {
          sentimentSummary.Positif++
        } else if (sentiment === "Netral") {
          sentimentSummary.Netral++
        } else if (sentiment === "Negatif") {
          sentimentSummary.Negatif++
        }

        console.log(`   Sentimen : ${sentiment} (score: ${score.toFixed(2)})`)

        // Delay 0.5 detik seperti di Python script
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Print ringkasan seperti di Python
      console.log(`Ringkasan Sentimen untuk pemerintahan ${countryName}:`)
      console.log(`  Positif : ${sentimentSummary.Positif}`)
      console.log(`  Netral  : ${sentimentSummary.Netral}`)
      console.log(`  Negatif : ${sentimentSummary.Negatif}`)
    } else {
      throw new Error("Tidak ada berita yang ditemukan dari GNews search endpoint")
    }

    const recommendation = getRecommendation(sentimentSummary)

    const analysis: GovernmentAnalysis = {
      country,
      articles,
      sentimentSummary,
      recommendation,
      totalArticles: articles.length,
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error in analyze-government API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
