![hero](tidigit-github.png)

<div align="center">
  <h1>Tidigit</h1>
  <p>Tidy Digital Kit aka. Tidigit is an open source library that's powering tools built at <a href="https://21n.org">21n</a></p>
</div>

<div align="center">

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](/LICENSE)
[![](https://img.shields.io/discord/831815510563749889?logo=discord&amp;logoColor=white)](https://discord.com/invite/9HJqKYTZKg)

</div>

# Tools
Below is the list of tools built using the Tidigit library.

| Name     | Website                          | Description                                                                 | Topics                                    |
|----------|----------------------------------|-----------------------------------------------------------------------------|-------------------------------------------|
| Memotron | [memotron.app](https://memotron.app) | **Your memory atlas**, a tool for managing your knowledge.                  | PKM, note‑taking, knowledge management    |
| Pointron | [pointron.app](https://pointron.app) | **Your focus haven**, a tool for tracking goals and managing your time.     | Focus, time management                    |
| Nucleus  | [nucleus.to](https://nucleus.to)     | **Your digital harmony**, a super app that combines all the tools above.    | Digital life, personal productivity       |

All of the above tools are intended for personal use and lack collaboration, sharing, and other team features.

*More tools coming soon...*


# Self hosting
Currently, only the frontend app can be self‑hosted on your own server. This means you cannot sync data between devices when self‑hosting. To deploy the offline‑only frontend at your own URL, follow these steps.

1. Clone/Fork the [client](https://github.com/21nOrg/client) repository
2. Set Environment Variables. Use any of `memotron`, `pointron`, or `nucleus` for `VITE_PRODUCT`
```bash
VITE_PRODUCT=memotron
VITE_STATIC_URL=https://cdn.21n.co
```
3. Deploy to the provider of your choice

# Contributing
We welcome contributions! Please see the [CONTRIBUTING](https://github.com/21nOrg/tidigit?tab=contributing-ov-file) file for details.

The project is built with [SvelteKit](https://kit.svelte.dev/) and [TailwindCSS](https://tailwindcss.com/) for the frontend client, and [Node.js](https://nodejs.org/) for the backend.

---
### License
This project is licensed under the AGPL-3.0 license. See the [LICENSE](LICENSE) file for details.

### Contact
For any questions or feedback, please contact us at [hello@21n.org](mailto:hello@21n.org).

❤️ We extend our gratitude to all the [OSS libraries and tools](https://github.com/21nOrg/tidigit/network/dependencies) that made this project possible.