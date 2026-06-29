<div align="center">

# 💖 Contributing to the Affective Music Intelligence Dashboard

First off, a massive thank you for even thinking about contributing! It’s developers and creators like you who make the open-source community such an incredible place to learn, build, and get inspired. 

Whether you want to squash some bugs, drop in some UI magic, level up the documentation, or fine-tune our ML pipeline—you are welcome here. 

[**Check out the live dashboard here!**](https://iamp1000.github.io/music-ml-dashboard/) 🚀

</div>

---

## 🛠️ Development Workflow

Ready to write some code? Here is the step-by-step guide to getting your local environment up and running.

### 1. Fork & Clone
Kick things off by forking the repository to your own GitHub account. Once that's done, pull it down to your local machine:

```bash
git clone [https://github.com/YOUR_USERNAME/music-ml-dashboard.git](https://github.com/YOUR_USERNAME/music-ml-dashboard.git)
cd music-ml-dashboard
```

### 2. Set Up Your Local Environment
Our stack is a three-headed beast, but it's super fun to work with! Here’s the breakdown:

* 🎨 **Frontend:** Next.js (App Router), TailwindCSS, Recharts
* ⚙️ **Backend API:** FastAPI, TiDB (MySQL)
* 🧠 **ML Engine:** PyTorch, Madmom

> [!NOTE]
> **Need help spinning these up?** > Head over to the main `README.md` for the exact `npm`, `venv`, and `uv` commands to get each service running locally.

### 3. Create a Branch
Always branch out from `main` for your work. Giving your branch a descriptive name helps everyone know exactly what you're cooking up!

```bash
git checkout -b feature/your-feature-name
```
> [!TIP]
> **Naming conventions:** Try using prefixes like `fix/typo-in-readme`, `feat/new-mood-chart`, or `docs/api-update`.

### 4. Make Your Changes
As you're getting your hands dirty in the code, keep a few of our core philosophies in mind:
* **Frontend:** We love our modern aesthetics. Stick to our Tailwind UI/UX patterns (think smooth glassmorphism and those sleek dark mode colors).
* **Backend:** Keep those FastAPI endpoints clean and well-documented with Python type hints.
* **ML Engine:** Keep an eye on GPU VRAM constraints. We want our PyTorch models to be powerful, but not at the cost of crashing the system!

### 5. Commit Your Work
We love clear, human-readable commit messages. It makes reviewing PRs a breeze.

```bash
git commit -m "feat: add WebSocket streaming for real-time mood updates"
```

### 6. Push & Pull Request
Send your code up to your fork:

```bash
git push origin feature/your-feature-name
```
Once pushed, head back to the original repository on GitHub. You'll see a big green **"Compare & pull request"** button. Click it, tell us a bit about what you built, and submit!

---

## 💡 What Can I Work On?

Not sure where to start? No worries! Head over to our **Issues** tab. We use labels to help you find the perfect task:

* 🌱 `good first issue` — Perfect if you're new to the codebase.
* 🆘 `help wanted` — We’re a bit stuck and would love your expert eyes on this.
* ✨ `enhancement` — Cool new features we’d love to see built.

### 🔥 High Priority Areas Right Now:
If you want to make an immediate impact, we are actively looking for help with:
1.  **Testing Frameworks:** We desperately need Jest tests for our React components and Pytest for our FastAPI routes.
2.  **CI/CD Pipelines:** Help us set up GitHub Actions to auto-run Snyk scans and tests on new PRs.
3.  **WebSocket Streaming:** We want to level up the `BioOptimizationGraph`. It's currently mocked, and we need to wire it up to a real FastAPI WebSocket connection for live data streaming.

---

## 🤝 Code of Conduct

At the end of the day, we are a community of learners, builders, and music nerds. Please be respectful, empathetic, and kind. Harassment, toxicity, or gatekeeping will not be tolerated. Let's keep this a safe space to create awesome things together.

**Thank you for contributing! Let's build something amazing.** 🎵