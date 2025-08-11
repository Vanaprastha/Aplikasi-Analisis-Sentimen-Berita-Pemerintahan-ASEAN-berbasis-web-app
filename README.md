# 🏛️ ASEAN Government Sentiment Analysis

Aplikasi web untuk menganalisis sentimen berita pemerintahan dari 10 negara ASEAN menggunakan AI dan data real-time.

## 📋 Deskripsi

Aplikasi ini menganalisis sentimen berita pemerintahan dari seluruh negara ASEAN (10 negara) menggunakan:
- **GNews API** untuk mengambil berita bahasa Inggris real-time
- **Hugging Face AI Model** (siebert/sentiment-roberta-large-english) untuk analisis sentimen
- **Next.js 15** dengan App Router untuk frontend dan backend
- **Real-time processing** dengan multiple fallback methods

### 🌏 Negara yang Dianalisis
- 🇧🇳 Brunei Darussalam
- 🇰🇭 Kamboja  
- 🇮🇩 Indonesia
- 🇱🇦 Laos
- 🇲🇾 Malaysia
- 🇲🇲 Myanmar
- 🇵🇭 Filipina
- 🇸🇬 Singapura
- 🇹🇭 Thailand
- 🇻🇳 Vietnam

## ✨ Fitur Utama
### 🔄 Real-time Analysis
- Analisis sentimen berita terbaru secara real-time
- Progress tracking untuk setiap negara
- Status monitoring API connections

### 🤖 AI-Powered Sentiment Analysis
- Menggunakan model `siebert/sentiment-roberta-large-english`
- Klasifikasi: Positif, Netral, Negatif
- Confidence score untuk setiap prediksi

### 🛡️ Robust API Integration
- 5 metode berbeda untuk mengakses GNews API
- Automatic fallback jika satu metode gagal
- Error handling yang comprehensive

### 📊 Interactive Dashboard
- Kartu interaktif untuk setiap negara
- Statistik sentimen dengan visualisasi
- Detail modal untuk melihat semua berita
- Search dan filter functionality

### 📱 Responsive Design
- Optimized untuk desktop, tablet, dan mobile
- Modern UI dengan shadcn/ui components
- Dark/light mode support

### Prerequisites
- Node.js 18+ 
- npm atau yarn
- API Keys (GNews & Hugging Face)

### Installation

1. **Clone repository**
   \`\`\`bash
   git clone https://github.com/yourusername/asean-sentiment-analysis.git
   cd asean-sentiment-analysis
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # atau
   yarn install
   \`\`\`

3. **Setup environment variables**
   
   Buat file \`.env.local\` di root directory:
   \`\`\`env
   GNEWS_API_KEY=your_gnews_api_key_here
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here
   \`\`\`

4. **Run development server**
   \`\`\`bash
   npm run dev
   # atau
   yarn dev
   \`\`\`

5. **Open browser**
   
   Buka [http://localhost:3000](http://localhost:3000)

## 🔑 API Keys Setup

### GNews API
1. Daftar di [GNews.io](https://gnews.io)
2. Dapatkan API key gratis (100 requests/day)
3. Tambahkan ke \`.env.local\` sebagai \`GNEWS_API_KEY\`

### Hugging Face API
1. Daftar di [Hugging Face](https://huggingface.co)
2. Buat Access Token di Settings
3. Tambahkan ke \`.env.local\` sebagai \`HUGGINGFACE_API_KEY\`
