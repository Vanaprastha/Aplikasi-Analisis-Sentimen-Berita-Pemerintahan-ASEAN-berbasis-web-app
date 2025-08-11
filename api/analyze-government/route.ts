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

// Mapping negara ke query yang sesuai
const countryQueries = {
  ID: ["pemerintah indonesia", "indonesia government", "jokowi", "presiden indonesia"],
  MY: ["pemerintah malaysia", "malaysia government", "anwar ibrahim", "perdana menteri malaysia"],
  SG: ["pemerintah singapura", "singapore government", "lee hsien loong", "perdana menteri singapura"],
  TH: ["pemerintah thailand", "thailand government", "prayut", "perdana menteri thailand"],
}

// Fungsi mapping label ke sentimen untuk model w11wo/indonesian-roberta-base-sentiment-classifier
function mapSentiment(label: string): string {
  const normalizedLabel = label.toLowerCase()

  if (["positive", "positif"].includes(normalizedLabel)) {
    return "Positif"
  } else if (["neutral", "netral"].includes(normalizedLabel)) {
    return "Netral"
  } else if (["negative", "negatif"].includes(normalizedLabel)) {
    return "Negatif"
  }

  return label
}

// Fungsi untuk analisis sentimen menggunakan model w11wo/indonesian-roberta-base-sentiment-classifier
async function analyzeSentiment(text: string) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY tidak ditemukan")
  }

  const response = await fetch(
    "https://api-inference.huggingface.co/models/w11wo/indonesian-roberta-base-sentiment-classifier",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: text,
      }),
      signal: AbortSignal.timeout(12000), // Reduced timeout
    },
  )

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

// Fungsi untuk mendapatkan berita menggunakan GNews API dengan multiple methods
async function getNewsFromGNews(country: string): Promise<any[]> {
  if (!process.env.GNEWS_API_KEY) {
    throw new Error("GNEWS_API_KEY tidak ditemukan")
  }

  // Ambil query untuk negara yang diminta
  const queries = countryQueries[country as keyof typeof countryQueries] || [`pemerintah ${country}`]

  // Gabungkan semua query dengan OR
  const query = queries.map((q) => `"${q}"`).join(" OR ")

  console.log(`[DEBUG] GNews query for ${country}: ${query}`)

  // Method 1: Try with fetch
  try {
    const params = new URLSearchParams({
      q: query,
      lang: "id",
      country: "id",
      max: "5",
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
      apikey: process.env.GNEWS_API_KEY,
    })

    const gnewsApiUrl = `https://gnews.io/api/v4/search?${params}`

    const response = await fetch(gnewsApiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
      signal: AbortSignal.timeout(8000), // Reduced timeout
    })

    if (!response.ok) {
      throw new Error(`GNews API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors && data.errors.length > 0) {
      throw new Error(`GNews API error: ${data.errors[0]}`)
    }

    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error("No articles found in GNews response")
    }

    console.log(`[DEBUG] Found ${data.articles.length} articles for ${country}`)

    // Transform ke format yang sama dengan Python script
    return data.articles.map((article: any) => ({
      title: article.title,
      url: article.url,
      publisher: { title: article.source.name },
      published_date: article.publishedAt,
    }))
  } catch (fetchError) {
    console.log(`[DEBUG] Fetch method failed for ${country}, trying HTTPS method...`)

    // Method 2: Try with https module
    return await getNewsWithHttps(country, query)
  }
}

// Fallback method using https module
async function getNewsWithHttps(country: string, query: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const https = require("https")
      const querystring = require("querystring")

      const params = querystring.stringify({
        q: query,
        lang: "id",
        country: "id",
        max: "5",
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
        apikey: process.env.GNEWS_API_KEY,
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
        timeout: 8000,
      }

      console.log(`[DEBUG] HTTPS request for ${country}`)

      const req = https.request(options, (res: any) => {
        let data = ""
        res.on("data", (chunk: any) => {
          data += chunk
        })

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const jsonData = JSON.parse(data)

              if (jsonData.errors && jsonData.errors.length > 0) {
                reject(new Error(`GNews API error: ${jsonData.errors[0]}`))
                return
              }

              if (!jsonData.articles || !Array.isArray(jsonData.articles)) {
                reject(new Error("No articles found in GNews response"))
                return
              }

              console.log(`[DEBUG] HTTPS found ${jsonData.articles.length} articles for ${country}`)

              const articles = jsonData.articles.map((article: any) => ({
                title: article.title,
                url: article.url,
                publisher: { title: article.source.name },
                published_date: article.publishedAt,
              }))

              resolve(articles)
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

      req.setTimeout(8000)
      req.end()
    } catch (error: any) {
      reject(new Error(`GNews HTTPS implementation error: ${error.message}`))
    }
  })
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
        ID: "Indonesia",
        MY: "Malaysia",
        SG: "Singapura",
        TH: "Thailand",
      }[country] || country

    console.log(`
=== Hasil Analisis Sentimen Berita Pemerintahan ${countryName} ===`)
    console.log(`Menggunakan model: w11wo/indonesian-roberta-base-sentiment-classifier`)

    // Ambil berita menggunakan GNews API
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

        // Analisis sentimen menggunakan model w11wo
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
      throw new Error("Tidak ada berita yang ditemukan")
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
