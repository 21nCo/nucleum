![hero](tidigit-github.png)

<div align="center">
  <h1>Tidigit</h1>
  <p>Tidy digital kit aka. Tidigit is an open source repository that powers the suite of products designed to help 21st century digital humans manage their digital lives in an efficient way.</p>
</div>

<div align="center">

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](/LICENSE)
[![](https://img.shields.io/discord/831815510563749889?logo=discord&amp;logoColor=white)](https://discord.com/invite/9HJqKYTZKg)

</div>

# Products
Below is the list of apps built using Tidigit.

| App      | Website                          | Description                                                                 | Topics                                    |
|----------|----------------------------------|-----------------------------------------------------------------------------|-------------------------------------------|
| Nucleus  | [nucleus.to](https://nucleus.to)     | **Your digital harmony**, a super app that combines all of the tools listed below in a coherent way.    | Digital life, personal productivity       |
| Memotron | [memotron.app](https://memotron.app) | **Your memory atlas**, a tool for managing your digital memory and personal knowledge.                  | PKM, note‑taking, knowledge management    |
| Pointron | [pointron.app](https://pointron.app) | **Your focus haven**, a tool for tracking your goals and managing your time.     | Focus, time management                    |

All of the above tools are intended for personal use and lack collaboration, sharing, and other team features.

*More tools coming soon...*


# Self hosting
Currently, only the frontend app can be self‑hosted on your own server. This means you cannot sync data between devices when self‑hosting. To deploy the offline‑only frontend at your own URL, follow these steps.

1. Clone/Fork this repository
2. This is a turbo repo with `/apps` folder containing apps that can be deployed. Choose the app sub-folder corresponding to the Tidigit product you want to run.
3. Set the below environment variables.
```bash
VITE_PRODUCT={{memotron | pointron | nucleus }}
VITE_STATIC_URL=https://cdn.21n.org
```
3. Deploy to the provider of your choice

*Full app deployment including backend on Cloudflare (Cloudflare workers + Cloudflare D1 + Cloudflare R2) will be available soon...*

# Contributing
We welcome contributions! Please see the [CONTRIBUTING](https://github.com/21nOrg/tidigit?tab=contributing-ov-file) file for details.

The project is built with [SvelteKit](https://kit.svelte.dev/) and [TailwindCSS](https://tailwindcss.com/) for the frontend client, and [Node.js](https://nodejs.org/) for the backend.

---
### License
This project is licensed under the AGPL-3.0 license. See the [LICENSE](LICENSE) file for details.

### Contact
For any questions or feedback, please contact us at [hello@21n.org](mailto:hello@21n.org).

❤️ We extend our gratitude to all the [OSS libraries and tools](https://github.com/21nOrg/tidigit/network/dependencies) that made this project possible.
