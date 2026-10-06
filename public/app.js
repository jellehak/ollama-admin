import { createApp, ref, computed, onMounted } from 'vue'

const DEFAULT_ENDPOINT = 'http://localhost:11434'

createApp({
  setup() {
    const endpoint = ref(localStorage.getItem('ollama-endpoint') || DEFAULT_ENDPOINT)
    const models = ref([])
    const runningModels = ref([])
    const loading = ref(false)
    const connected = ref(false)
    const error = ref('')
    const lastUpdated = ref('')
    const busyAction = ref('')
    const showPull = ref(false)
    const pullName = ref('')
    const createName = ref('')
    const modelfile = ref('FROM llama3.2\n\nPARAMETER temperature 0.7\nPARAMETER num_ctx 4096\n\nSYSTEM """You are a helpful assistant."""')
    const chatModel = ref('')
    const chatPrompt = ref('')
    const messages = ref([])
    const chatBusy = ref(false)

    const activityLabel = computed(() => models.value.length ? 'READY' : '—')
    const activityDetail = computed(() => models.value.length ? `${models.value.length} model${models.value.length === 1 ? '' : 's'} available` : 'No models found')
    const chatOpenLabel = computed(() => messages.value.length ? `${messages.value.length} MESSAGES` : 'OPEN CHAT')

    function apiUrl(path) {
      return `${endpoint.value.replace(/\/$/, '')}${path}`
    }

    async function request(path, options = {}) {
      const response = await fetch(apiUrl(path), { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return response.status === 204 ? null : response.json()
    }

    async function refreshAll() {
      loading.value = true
      error.value = ''
      try {
        const [tags, ps] = await Promise.all([request('/api/tags'), request('/api/ps')])
        models.value = tags.models || []
        runningModels.value = ps.models || []
        connected.value = true
        lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        if (!chatModel.value && models.value.length) chatModel.value = models.value[0].name
      } catch (err) {
        connected.value = false
        error.value = `${err.message}. Check the endpoint and that Ollama is running.`
      } finally {
        loading.value = false
      }
    }

    function saveEndpoint() {
      localStorage.setItem('ollama-endpoint', endpoint.value)
      refreshAll()
    }

    async function pullModel() {
      busyAction.value = 'pull'
      error.value = ''
      try {
        await request('/api/pull', { method: 'POST', body: JSON.stringify({ name: pullName.value, stream: false }) })
        pullName.value = ''
        showPull.value = false
        await refreshAll()
      } catch (err) { error.value = err.message } finally { busyAction.value = '' }
    }

    async function deleteModel(name) {
      if (!window.confirm(`Delete ${name}?`)) return
      busyAction.value = `delete:${name}`
      error.value = ''
      try {
        await request('/api/delete', { method: 'DELETE', body: JSON.stringify({ model: name }) })
        await refreshAll()
      } catch (err) { error.value = err.message } finally { busyAction.value = '' }
    }

    async function createModel() {
      if (!createName.value || !modelfile.value) return
      const fromMatch = modelfile.value.match(/^\s*FROM\s+(.+)\s*$/im)
      if (!fromMatch) {
        error.value = 'The Modelfile needs a FROM line with an installed base model.'
        return
      }
      busyAction.value = 'create'
      error.value = ''
      try {
        await request('/api/create', { method: 'POST', body: JSON.stringify({ model: createName.value, from: fromMatch[1], modelfile: modelfile.value, stream: false }) })
        createName.value = ''
        await refreshAll()
      } catch (err) { error.value = err.message } finally { busyAction.value = '' }
    }

    async function sendChat() {
      if (!chatPrompt.value.trim() || !chatModel.value) return
      const prompt = chatPrompt.value.trim()
      messages.value.push({ role: 'user', content: prompt })
      chatPrompt.value = ''
      chatBusy.value = true
      error.value = ''
      try {
        const result = await request('/api/chat', { method: 'POST', body: JSON.stringify({ model: chatModel.value, messages: [{ role: 'user', content: prompt }], stream: false }) })
        messages.value.push({ role: 'assistant', content: result.message?.content || 'No response returned.' })
      } catch (err) { error.value = err.message } finally { chatBusy.value = false }
    }

    function isRunning(name) { return runningModels.value.some(model => model.name === name) }
    function formatSize(bytes) { if (!bytes) return 'Unknown size'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}` }
    function formatDate(value) { return value ? new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unknown' }

    onMounted(refreshAll)
    return { endpoint, models, runningModels, loading, connected, error, lastUpdated, busyAction, showPull, pullName, createName, modelfile, chatModel, chatPrompt, messages, chatBusy, activityLabel, activityDetail, chatOpenLabel, refreshAll, saveEndpoint, pullModel, deleteModel, createModel, sendChat, isRunning, formatSize, formatDate }
  }
}).mount('#app')
