# Contributing to Affective Music Intelligence Dashboard

First off, thank you for considering contributing to the Affective Music Intelligence Dashboard! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

We welcome all contributions, whether it's fixing bugs, improving documentation, designing better UI/UX, or adding new features to the Machine Learning pipeline.

## 🚀 Live Application
Check out the live dashboard here: [https://iamp1000.github.io/music-ml-dashboard/](https://iamp1000.github.io/music-ml-dashboard/)

## 🛠 Development Workflow

### 1. Fork and Clone
Fork the repository on GitHub, and then clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/music-ml-dashboard.git
cd music-ml-dashboard
```

### 2. Setting Up Your Local Environment
Our stack is split into three main parts:
- **Frontend**: Next.js (App Router), TailwindCSS, Recharts
- **Backend API**: FastAPI, TiDB (MySQL)
- **ML Engine**: PyTorch, Madmom

Please refer to the `README.md` for detailed instructions on how to start each service locally using `npm`, `venv`, and `uv`.

### 3. Creating a Branch
Create a branch for your feature or bug fix:
```bash
git checkout -b feature/your-feature-name
```
*(Please use descriptive branch names like `fix/typo-in-readme` or `feat/new-mood-chart`)*

### 4. Making Changes
As you make your changes:
* **Frontend**: Ensure you follow our Tailwind UI/UX patterns (glassmorphism, dark mode colors).
* **Backend**: Keep the FastAPI endpoints well-documented with type hints.
* **ML**: Try to keep GPU VRAM constraints in mind when adding new PyTorch models.

### 5. Committing
We prefer clear, descriptive commit messages:
```bash
git commit -m "Add WebSocket streaming for real-time mood updates"
```

### 6. Pushing and Creating a Pull Request
Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```
Then, go to the original repository on GitHub and click **"Compare & pull request"**.

## 💡 What Can I Work On?
If you're looking for ideas, check out the **Issues** tab on GitHub. Look for issues with these labels:
- `good first issue` - Perfect for newcomers!
- `help wanted` - We're stuck and could use an expert's eye.
- `enhancement` - New features we'd love to see.

### High Priority Areas:
- **Testing**: We need Jest tests for our React components and Pytest for our FastAPI routes.
- **CI/CD**: Setting up GitHub Actions to automatically run Snyk scans and tests on PRs.
- **WebSocket Streaming**: Converting the currently mocked `BioOptimizationGraph` to use a real FastAPI WebSocket connection for live data.

## 🤝 Code of Conduct
Please remember to be respectful and kind. We are a community of learners and builders. Harassment or toxic behavior will not be tolerated.

Thank you for contributing! 🎵
