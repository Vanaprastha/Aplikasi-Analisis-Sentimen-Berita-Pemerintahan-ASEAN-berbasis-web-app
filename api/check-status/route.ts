import { type NextRequest, NextResponse } from "next/server"

interface ApiStatusResponse {
  gnews: {
    connected: boolean
    status: string
    message: string
  }
  huggingface: {
    connected: boolean
    status: string
    message: string
  }
}

// Method 1: Axios-like implementation
async function tryGNewsWithCustomFetch(apiKey: string): Promise<any> {
  const url = `https://gnews.io/api/v4/search?q=test&lang=en&max=1&apikey=${apiKey}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

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

// Method 2: Direct TCP-like approach
async function tryGNewsWithRawHTTP(apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const net = require("net")
    const socket = new net.Socket()

    const host = "gnews.io"
    const port = 443
    const path = `/api/v4/search?q=test&lang=en&max=1&apikey=${apiKey}`

    let responseData = ""

    socket.setTimeout(5000)

    socket.connect(port, host, () => {
      const request = [
        `GET ${path} HTTP/1.1`,
        `Host: ${host}`,
        `User-Agent: curl/7.68.0`,
        `Accept: */*`,
        `Connection: close`,
        "",
        "",
      ].join("\r\n")

      socket.write(request)
    })

    socket.on("data", (data) => {
      responseData += data.toString()
    })

    socket.on("close", () => {
      try {
        const parts = responseData.split("\r\n\r\n")
        if (parts.length >= 2) {
          const body = parts.slice(1).join("\r\n\r\n")
          const jsonData = JSON.parse(body)
          resolve({ success: true, data: jsonData })
        } else {
          reject(new Error("Invalid HTTP response format"))
        }
      } catch (error) {
        reject(error)
      }
    })

    socket.on("error", (error) => {
      reject(error)
    })

    socket.on("timeout", () => {
      socket.destroy()
      reject(new Error("Socket timeout"))
    })
  })
}

// Method 3: Proxy-like approach
async function tryGNewsWithProxy(apiKey: string): Promise<any> {
  // Using a different approach - simulate browser request
  const url = `https://gnews.io/api/v4/search`

  const params = new URLSearchParams({
    q: "news",
    lang: "en",
    max: "1",
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
    signal: AbortSignal.timeout(5000),
  })

  return { success: true, response }
}

// Method 4: Alternative endpoint
async function tryGNewsAlternative(apiKey: string): Promise<any> {
  // Try different endpoint structure
  const baseUrl = "https://gnews.io/api/v4"

  const testUrls = [
    `${baseUrl}/search?q=bitcoin&apikey=${apiKey}`,
    `${baseUrl}/search?q=news&lang=en&apikey=${apiKey}`,
    `${baseUrl}/top-headlines?lang=en&apikey=${apiKey}`,
  ]

  for (const url of testUrls) {
    try {
      console.log(`Trying alternative URL: ${url.replace(apiKey, "***")}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "PostmanRuntime/7.32.3",
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        signal: AbortSignal.timeout(4000),
      })

      if (response.ok) {
        return { success: true, response, url }
      }
    } catch (error) {
      console.log(`Alternative URL failed: ${error}`)
      continue
    }
  }

  throw new Error("All alternative URLs failed")
}

// Method 5: Curl simulation
async function tryGNewsCurlStyle(apiKey: string): Promise<any> {
  const { spawn } = require("child_process")

  return new Promise((resolve, reject) => {
    const url = `https://gnews.io/api/v4/search?q=test&apikey=${apiKey}`

    const curl = spawn("curl", [
      "-s",
      "-X",
      "GET",
      "-H",
      "Accept: application/json",
      "-H",
      "User-Agent: curl/7.68.0",
      "--connect-timeout",
      "5",
      "--max-time",
      "10",
      url,
    ])

    let stdout = ""
    let stderr = ""

    curl.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    curl.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    curl.on("close", (code) => {
      if (code === 0 && stdout) {
        try {
          const jsonData = JSON.parse(stdout)
          resolve({ success: true, data: jsonData })
        } catch (error) {
          reject(new Error(`JSON parse error: ${error}`))
        }
      } else {
        reject(new Error(`Curl failed with code ${code}: ${stderr}`))
      }
    })

    curl.on("error", (error) => {
      reject(new Error(`Curl spawn error: ${error.message}`))
    })
  })
}

// Main GNews checker with all methods
async function checkGNewsAPI(): Promise<{ connected: boolean; status: string; message: string }> {
  try {
    if (!process.env.GNEWS_API_KEY) {
      return {
        connected: false,
        status: "no_key",
        message: "API key tidak ditemukan di environment variables",
      }
    }

    const apiKey = process.env.GNEWS_API_KEY
    console.log("Testing GNews API with AGGRESSIVE methods...")

    // Method 1: Custom Fetch
    try {
      console.log("🚀 Method 1: Custom Fetch")
      const result1 = await tryGNewsWithCustomFetch(apiKey)
      if (result1.success && result1.response.ok) {
        const data = await result1.response.json()
        console.log("✅ Method 1 SUCCESS:", { articles: data.articles?.length || 0 })

        if (data.errors?.length > 0) {
          return { connected: false, status: "api_error", message: `API Error: ${data.errors[0]}` }
        }

        return {
          connected: true,
          status: "connected",
          message: `Terhubung via Custom Fetch - ${data.articles?.length || 0} artikel`,
        }
      }
    } catch (error: any) {
      console.log("❌ Method 1 failed:", error.message)
    }

    // Method 2: Proxy-style
    try {
      console.log("🚀 Method 2: Proxy Style")
      const result2 = await tryGNewsWithProxy(apiKey)
      if (result2.success && result2.response.ok) {
        const data = await result2.response.json()
        console.log("✅ Method 2 SUCCESS:", { articles: data.articles?.length || 0 })

        if (data.errors?.length > 0) {
          return { connected: false, status: "api_error", message: `API Error: ${data.errors[0]}` }
        }

        return {
          connected: true,
          status: "connected",
          message: `Terhubung via Proxy Style - ${data.articles?.length || 0} artikel`,
        }
      }
    } catch (error: any) {
      console.log("❌ Method 2 failed:", error.message)
    }

    // Method 3: Alternative endpoints
    try {
      console.log("🚀 Method 3: Alternative Endpoints")
      const result3 = await tryGNewsAlternative(apiKey)
      if (result3.success && result3.response.ok) {
        const data = await result3.response.json()
        console.log("✅ Method 3 SUCCESS:", { articles: data.articles?.length || 0, url: result3.url })

        if (data.errors?.length > 0) {
          return { connected: false, status: "api_error", message: `API Error: ${data.errors[0]}` }
        }

        return {
          connected: true,
          status: "connected",
          message: `Terhubung via Alternative Endpoint - ${data.articles?.length || 0} artikel`,
        }
      }
    } catch (error: any) {
      console.log("❌ Method 3 failed:", error.message)
    }

    // Method 4: Curl simulation (if available)
    try {
      console.log("🚀 Method 4: Curl Simulation")
      const result4 = await tryGNewsCurlStyle(apiKey)
      if (result4.success) {
        const data = result4.data
        console.log("✅ Method 4 SUCCESS:", { articles: data.articles?.length || 0 })

        if (data.errors?.length > 0) {
          return { connected: false, status: "api_error", message: `API Error: ${data.errors[0]}` }
        }

        return {
          connected: true,
          status: "connected",
          message: `Terhubung via Curl - ${data.articles?.length || 0} artikel`,
        }
      }
    } catch (error: any) {
      console.log("❌ Method 4 failed:", error.message)
    }

    // Method 5: Raw HTTP (last resort)
    try {
      console.log("🚀 Method 5: Raw HTTP")
      const result5 = await tryGNewsWithRawHTTP(apiKey)
      if (result5.success) {
        const data = result5.data
        console.log("✅ Method 5 SUCCESS:", { articles: data.articles?.length || 0 })

        if (data.errors?.length > 0) {
          return { connected: false, status: "api_error", message: `API Error: ${data.errors[0]}` }
        }

        return {
          connected: true,
          status: "connected",
          message: `Terhubung via Raw HTTP - ${data.articles?.length || 0} artikel`,
        }
      }
    } catch (error: any) {
      console.log("❌ Method 5 failed:", error.message)
    }

    // All methods failed
    return {
      connected: false,
      status: "all_methods_failed",
      message: "Semua 5 metode koneksi gagal - cek koneksi internet atau API key",
    }
  } catch (error: any) {
    console.error("GNews API Error:", error)
    return {
      connected: false,
      status: "critical_error",
      message: `Critical error: ${error.message}`,
    }
  }
}

// Fungsi untuk mengecek Hugging Face API (unchanged)
async function checkHuggingFaceAPI(): Promise<{ connected: boolean; status: string; message: string }> {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return {
        connected: false,
        status: "no_key",
        message: "API key tidak ditemukan di environment variables",
      }
    }

    console.log("Testing Hugging Face API with key:", process.env.HUGGINGFACE_API_KEY.substring(0, 8) + "...")

    const modelName = "w11wo/indonesian-roberta-base-sentiment-classifier"
    const testUrl = `https://api-inference.huggingface.co/models/${modelName}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(testUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        inputs: "Saham ini menunjukkan performa yang sangat baik hari ini",
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    console.log(`Model ${modelName} Response Status:`, response.status)

    if (response.ok) {
      const result = await response.json()
      console.log(`Model ${modelName} Response:`, result)

      if (result.error && result.error.includes("loading")) {
        return {
          connected: true,
          status: "loading",
          message: "Model sedang loading, akan siap dalam beberapa menit",
        }
      }

      if (Array.isArray(result) && result.length > 0) {
        return {
          connected: true,
          status: "connected",
          message: `Terhubung dengan model: ${modelName}`,
        }
      }

      return {
        connected: true,
        status: "connected",
        message: `Terhubung dengan model: ${modelName}`,
      }
    } else {
      const errorText = await response.text()
      console.log("HF Error Response:", errorText.substring(0, 200))

      if (response.status === 401) {
        return {
          connected: false,
          status: "unauthorized",
          message: "API key tidak valid atau tidak memiliki akses",
        }
      } else if (response.status === 429) {
        return {
          connected: false,
          status: "rate_limit",
          message: "Rate limit exceeded, coba lagi nanti",
        }
      } else if (response.status === 503) {
        return {
          connected: false,
          status: "service_unavailable",
          message: "Model tidak tersedia saat ini, coba lagi nanti",
        }
      } else if (response.status === 404) {
        return {
          connected: false,
          status: "model_not_found",
          message: "Model tidak ditemukan, periksa nama model",
        }
      } else {
        return {
          connected: false,
          status: "http_error",
          message: `HTTP Error: ${response.status}`,
        }
      }
    }
  } catch (error: any) {
    console.error("Hugging Face API Error:", error)

    if (error.name === "AbortError") {
      return {
        connected: false,
        status: "timeout",
        message: "Koneksi timeout (>10 detik)",
      }
    }

    return {
      connected: false,
      status: "network_error",
      message: `Network error: ${error.message}`,
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== AGGRESSIVE API Status Check ===")
    console.log("Environment variables check:")
    console.log("GNEWS_API_KEY exists:", !!process.env.GNEWS_API_KEY)
    console.log("HUGGINGFACE_API_KEY exists:", !!process.env.HUGGINGFACE_API_KEY)

    console.log("\n--- Checking GNews API (5 AGGRESSIVE METHODS) ---")
    const gnewsStatus = await checkGNewsAPI()

    console.log("\n--- Checking Hugging Face API ---")
    const huggingfaceStatus = await checkHuggingFaceAPI()

    const response: ApiStatusResponse = {
      gnews: gnewsStatus,
      huggingface: huggingfaceStatus,
    }

    console.log("\n=== Final API Status Results ===")
    console.log("GNews:", gnewsStatus)
    console.log("Hugging Face:", huggingfaceStatus)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error checking API status:", error)
    return NextResponse.json(
      {
        gnews: {
          connected: false,
          status: "error",
          message: "Gagal mengecek status",
        },
        huggingface: {
          connected: false,
          status: "error",
          message: "Gagal mengecek status",
        },
      },
      { status: 500 },
    )
  }
}
