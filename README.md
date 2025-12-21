![hero](nucleus-git-banner.png)

<div align="center">
  <h1>Nucleus</h1>
  <p>Meticulously crafted super apps to help you manage your digital life efficiently.</p>
</div>
  <p align="center">
    <a href="https://nucleus.to">Website</a>
    ·
    <a href="https://docs.nucleus.to">Documentation</a>
    ·
    <a href="https://docs.nucleus.to/roadmap">Roadmap</a>
  </p>
<div align="center">
<br />

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](/LICENSE)
[![Tests](https://github.com/21nOrg/nucleus/actions/workflows/tests.yml/badge.svg)](https://github.com/21nOrg/nucleus/actions/workflows/tests.yml)
</div>

<div align="center">

[![Discord](https://img.shields.io/discord/831815510563749889?logo=discord&amp;logoColor=white)](https://discord.com/invite/9HJqKYTZKg)
[![YouTube](https://img.shields.io/youtube/channel/views/UCEE8Uvy4krxIGXAGy2q5wrA?style=flat&logo=youtube&logoColor=white&color=FF0000&label=@21nCo)](https://www.youtube.com/@21nCo)
[![Reddit](https://img.shields.io/reddit/subreddit-subscribers/nucleus?style=flat&logo=reddit&logoColor=white&color=FF4500&label=r/nucleus)](https://reddit.com/r/nucleus)
[![Twitter Follow](https://img.shields.io/twitter/follow/21nCompany?style=flat&logo=twitter&logoColor=white&color=1DA1F2&label=X%20@toNucleus)](https://twitter.com/toNucleus)


</div>


# Applications

| App      | Website                          | Description                                                                 | Topics                                    |
|----------|----------------------------------|-----------------------------------------------------------------------------|-------------------------------------------|
| Nucleus  | [nucleus.to](https://nucleus.to)     | **Your digital harmony**, a super app that combines all of the tools listed below in a cohesive manner.    | Digital life, Personal productivity       |
| Memotron | [memotron.app](https://memotron.app) | **Your memory atlas**, a tool for managing your digital memory and personal knowledge.                  | Digital memory, PKM, Note‑taking, Knowledge management    |
| Pointron | [pointron.app](https://pointron.app) | **Your focus haven**, a tool for tracking your goals and managing your time.     | Focus, Time management, Goal tracking                    |

**Note:** All of the above tools are designed for personal use and lack team/group features like collaboration, sharing, etc.

*More tools coming soon...*


# Self hosting
Currently, only the frontend apps can be self‑hosted on your own server. This means you cannot sync data between devices when self‑hosting. To deploy the offline‑only frontend at your own URL, follow these steps.

1. Clone/Fork this repository
2. This is a turbo repo with `/apps` folder containing apps that can be deployed. Choose the app sub-folder corresponding to the app you want to run.
3. Set the environment variables.
4. Deploy to the provider of your choice

```env
VITE_PRODUCT={{memotron | pointron | nucleus }}
VITE_STATIC_URL=https://cdn.21n.org
```

*Full app deployment including backend will be available soon...*

# Contributing
We welcome contributions! Please see the [CONTRIBUTING](https://github.com/21nOrg/nucleus?tab=contributing-ov-file) file for details.

The project is built with [SvelteKit](https://kit.svelte.dev/) and [TailwindCSS](https://tailwindcss.com/) for the frontend client, and [Node.js](https://nodejs.org/) for the backend.

---
### License
This project is licensed under the AGPL-3.0 license. See the [LICENSE](LICENSE) file for details.

### Contact
For any questions, security reporting or feedback, please contact us at [hello@21n.org](mailto:hello@21n.org).

❤️ We extend our deepest gratitude to all the [OSS libraries and tools](https://github.com/21nOrg/nucleus/network/dependencies) that made this project possible.
