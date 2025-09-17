# 🌱 Growdoro

<div align="center">
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![InstantDB](https://img.shields.io/badge/InstantDB-Latest-purple?style=for-the-badge)](https://www.instantdb.com/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
  
  **A beautiful, gamified productivity app where focus sessions grow your digital garden**
  
  [Demo](https://your-demo-url.com) • [Documentation](#documentation) • [Contributing](CONTRIBUTING.md) • [Report Bug](https://github.com/yourusername/growdoro/issues)
  
</div>

---

## ✨ Features

- 🎮 **Isometric Garden View** - Beautiful 3D isometric garden that grows as you complete focus sessions
- ⏱️ **Focus Timer** - Pomodoro-style focus sessions to boost productivity
- 🌻 **Plant Collection** - Unlock and collect various plants by completing sessions
- 👤 **User Profiles** - Create your unique garden space with custom username
- 💳 **Premium Features** - Support the project with optional premium subscription
- 🔐 **Secure Authentication** - Google OAuth integration for easy sign-in
- 📊 **Progress Tracking** - Track your focus sessions and garden growth over time

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- An [InstantDB](https://www.instantdb.com/) account
- Google OAuth credentials (for authentication)
- Stripe account (optional, for payment features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/growdoro.git
   cd growdoro
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # InstantDB Configuration
   NEXT_PUBLIC_INSTANT_APP_ID=your_instant_app_id
   INSTANT_ADMIN_TOKEN=your_instant_admin_token
   
   # Google OAuth
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   NEXT_PUBLIC_GOOGLE_CLIENT_NAME=your_app_name
   
   # Stripe (Optional)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   
   
   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up InstantDB schema**
   ```bash
   npx instant-cli push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [InstantDB](https://www.instantdb.com/) - Real-time database
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication:** Google OAuth via InstantDB Auth
- **Payments:** [Stripe](https://stripe.com/)
- **Animations:** [Motion](https://motion.dev/)
- **Icons:** [Phosphor Icons](https://phosphoricons.com/)

## 📁 Project Structure

```
growdoro/
├── app/                      # Next.js app directory
│   ├── (public)/            # Public user profiles
│   ├── api/                 # API routes
│   ├── components/          # React components
│   ├── contexts/            # React contexts
│   └── constants/           # App constants
├── lib/                     # Utility functions
├── public/                  # Static assets
│   ├── blocks/             # Block textures
│   └── plants/             # Plant images
├── instant.schema.ts        # InstantDB schema
└── instant.perms.ts        # InstantDB permissions
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Key Components

- **`IsometricGarden`** - Main garden view component
- **`AuthButton`** - Authentication flow handler
- **`ProfileCreationModal`** - New user onboarding
- **`BlockSlideover`** - Plant selection interface
- **`MainSlideover`** - Session timer and controls

### Database Schema

The app uses InstantDB with the following main entities:
- **profiles** - User profiles with usernames
- **blocks** - Garden blocks and plants
- **sessions** - Focus session records
- **$users** - InstantDB user accounts

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development process
- How to submit pull requests
- Coding standards
- Testing guidelines

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please check if it's already been reported in our [issues](https://github.com/yourusername/growdoro/issues), then feel free to create a new issue with:

- **Bug Reports:** Clear description, steps to reproduce, expected vs actual behavior
- **Feature Requests:** Clear description, use case, potential implementation ideas

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Plant artwork and sprites from [source]
- Isometric engine inspiration from [source]
- Community contributors and supporters

## 💬 Community & Support

- **Discord:** [Join our community](https://discord.gg/your-invite)
- **Twitter:** [@yourhandle](https://twitter.com/yourhandle)
- **Email:** support@growdoro.com

## 🚧 Roadmap

- [ ] Mobile responsive design
- [ ] Multiplayer gardens
- [ ] More plant varieties
- [ ] Achievement system
- [ ] Dark mode
- [ ] Export garden as image
- [ ] API for third-party integrations

---

<div align="center">
  Made with 💚 by the Growdoro community
</div>