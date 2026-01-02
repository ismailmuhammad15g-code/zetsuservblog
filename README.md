# ZetsuServ Blog

A modern, feature-rich technical blog platform built for developers and tech enthusiasts. Share your knowledge, explore tutorials, and connect with a community of like-minded individuals.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)

## ✨ Features

- **📝 Rich Content Management** - Create, edit, and publish blog posts with Markdown support
- **🔐 User Authentication** - Secure registration and login powered by Supabase
- **👥 Community Posts** - Users can contribute their own technical articles
- **📌 Pinned & Official Posts** - Highlight important announcements from administrators
- **🏷️ Categories & Tags** - Organize content with customizable categories
- **🔍 Search & Filter** - Powerful search functionality to find relevant content
- **💬 Comments System** - Engage with readers through post comments
- **🔖 Bookmarks** - Save favorite posts for later reading
- **📊 View Counts** - Track post popularity
- **🎨 Modern UI** - Clean, responsive design with shadcn/ui components
- **🌙 Smooth Animations** - Beautiful transitions and scroll effects
- **📱 Mobile Responsive** - Optimized for all device sizes

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (Authentication, Database, Storage) |
| **State Management** | TanStack Query (React Query) |
| **Routing** | React Router DOM |
| **Forms** | React Hook Form, Zod |
| **Charts** | Recharts |
| **Icons** | Lucide React |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- A Supabase project (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ismailmuhammad15g-code/zetsuservblog.git
   cd zetsuservblog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:dev` | Build for development |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and deploy (requires Netlify CLI) |

## 🚀 Deployment

The project is configured for seamless deployment on **Netlify**.

1. Connect your repository to Netlify.
2. The `netlify.toml` file will automatically handle build settings and redirects.
3. Push to `main` to trigger a deploy.

### Manual Deployment
```bash
npm run deploy
```

## 📁 Project Structure

```
zetsuservblog/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # shadcn/ui components
│   │   └── admin/       # Admin panel components
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Third-party integrations (Supabase)
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── supabase/            # Supabase configuration
└── ...config files
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  <strong>مطور بواسطة: Ismail Mohammad</strong><br>
  <em>العمر: 15 سنة</em><br>
  <em>الشغف: الذكاء الاصطناعي وتطوير البرمجيات</em><br>
  <em>مبني بحب للمجتمع التقني</em>
</p>
