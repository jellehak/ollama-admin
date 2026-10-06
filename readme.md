Tiny client against Ollama’s API:

- `GET /api/tags` — list models
- `POST /api/pull` — download a model
- `DELETE /api/delete` — delete a model
- `POST /api/create` — create a model from a Modelfile
- `GET /api/ps` — show loaded models
- `POST /api/chat` or `/api/generate` — run requests

# Install
```sh
git clone https://github.com/jellehak/ollama-admin
cd ollama-admin
npx serve public
```

# Tech
Use vue 3 from importmap, keep it simple and lightweight. use index.html, style.css and app.js. svg logo + manifest

# Design
Minimalistic, rounded edges
