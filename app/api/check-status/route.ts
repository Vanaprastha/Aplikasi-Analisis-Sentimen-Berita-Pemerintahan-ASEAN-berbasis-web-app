import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== API Status Check Started ===")

  const results = {
    gnews: {
      connected: false,
      status: "disconnected",
      message: "Tidak terhubung",
    },
    huggingface: {
      connected: false,
      status: "disconnected",
      message: "Tidak terhubung",
    },
  }

  // Test GNews API
  console.log("Testing GNews API...")
  if (process.env.GNEWS_API_KEY) {
    try {
      // Method 1: Browser-style request (yang berhasil di status check sebelumnya)
      const gnewsUrl = `https://gnews.io/api/v4/search`
      const params = new URLSearchParams({
        q: "test",
        lang: "en",
        max: "1",
        apikey: process.env.GNEWS_API_KEY,
      })

      const gnewsResponse = await fetch(`${gnewsUrl}?${params}`, {
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

      if (gnewsResponse.ok) {
        const gnewsData = await gnewsResponse.json()
        if (gnewsData.articles && Array.isArray(gnewsData.articles)) {
          results.gnews = {
            connected: true,
            status: "connected",
            message: `Terhubung via Browser-style - ${gnewsData.articles.length} artikel (English)`,
          }
          console.log("✅ GNews API: Connected via Browser-style")
        } else if (gnewsData.errors) {
          results.gnews = {
            connected: false,
            status: "error",
            message: `API Error: ${gnewsData.errors[0]}`,
          }
          console.log(`❌ GNews API Error: ${gnewsData.errors[0]}`)
        }
      } else {
        // Fallback ke Curl-style jika browser-style gagal
        console.log("Browser-style failed, trying Curl-style...")

        const curlUrl = `https://gnews.io/api/v4/search?q=test&lang=en&max=1&apikey=${process.env.GNEWS_API_KEY}`
        const curlResponse = await fetch(curlUrl, {
          method: "GET",
          headers: {
            "User-Agent": "curl/7.68.0",
            Accept: "*/*",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(8000),
        })

        if (curlResponse.ok) {
          const curlData = await curlResponse.json()
          if (curlData.articles && Array.isArray(curlData.articles)) {
            results.gnews = {
              connected: true,
              status: "connected",
              message: `Terhubung via Curl - ${curlData.articles.length} artikel (English)`,
            }
            console.log("✅ GNews API: Connected via Curl-style")
          }
        }
      }
    } catch (error: any) {
      results.gnews = {
        connected: false,
        status: "error",
        message: `Connection error: ${error.message}`,
      }
      console.log(`❌ GNews API Error: ${error.message}`)
    }
  } else {
    results.gnews = {
      connected: false,
      status: "no-key",
      message: "API key tidak ditemukan",
    }
    console.log("❌ GNews API: No API key")
  }

  // Test Hugging Face API
  console.log("Testing Hugging Face API...")
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: "This is a test sentence for sentiment analysis.",
          }),
          signal: AbortSignal.timeout(15000),
        },
      )

      if (hfResponse.ok) {
        const hfData = await hfResponse.json()
        if (Array.isArray(hfData) && hfData.length > 0) {
          results.huggingface = {
            connected: true,
            status: "connected",
            message: "Terhubung dengan model: siebert/sentiment-roberta-large-english (English Sentiment)",
          }
          console.log("✅ Hugging Face API: Connected")
        }
      } else {
        results.huggingface = {
          connected: false,
          status: "error",
          message: `HTTP ${hfResponse.status}: ${hfResponse.statusText}`,
        }
        console.log(`❌ Hugging Face API Error: ${hfResponse.status}`)
      }
    } catch (error: any) {
      if (error.message.includes("loading")) {
        results.huggingface = {
          connected: true,
          status: "loading",
          message: "Model sedang loading, coba lagi dalam beberapa menit",
        }
        console.log("⏳ Hugging Face API: Model loading")
      } else {
        results.huggingface = {
          connected: false,
          status: "error",
          message: `Connection error: ${error.message}`,
        }
        console.log(`❌ Hugging Face API Error: ${error.message}`)
      }
    }
  } else {
    results.huggingface = {
      connected: false,
      status: "no-key",
      message: "API key tidak ditemukan",
    }
    console.log("❌ Hugging Face API: No API key")
  }

  console.log("=== Final API Status Results ===")
  console.log("GNews:", results.gnews)
  console.log("Hugging Face:", results.huggingface)

  return NextResponse.json(results)
}
