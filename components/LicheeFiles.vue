<template>
  <div class="files-panel">
    <!-- Toolbar -->
    <div class="files-toolbar">
      <div class="breadcrumb">
        <button
          v-for="(part, i) in breadcrumbParts"
          :key="i"
          class="crumb-btn"
          @click="navigateToCrumb(i)"
        >
          <i v-if="i === 0" class="fas fa-home"></i>
          <span v-else>{{ part }}</span>
        </button>
      </div>
      <div class="toolbar-right">
        <input
          v-model="pathInput"
          class="path-input"
          :placeholder="currentPath"
          @keyup.enter="navigateTo(pathInput)"
        />
        <button class="toolbar-btn" @click="refresh"><i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i></button>
        <button class="toolbar-btn" @click="navigateTo('/')" title="Go to root"><i class="fas fa-hdd"></i></button>
        <button class="toolbar-btn" @click="navigateTo('/home')" title="Home"><i class="fas fa-user"></i></button>
        <button class="toolbar-btn" @click="navigateTo('/etc')" title="Config"><i class="fas fa-cog"></i></button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="files-error">
      <i class="fas fa-exclamation-triangle"></i>
      <span>{{ error }}</span>
      <button class="err-retry-btn" @click="refresh"><i class="fas fa-redo"></i> Retry</button>
    </div>

    <!-- File list -->
    <div class="files-list">
      <div class="files-header">
        <span class="col-perms">Permissions</span>
        <span class="col-name">Name</span>
        <span class="col-size">Size</span>
        <span class="col-owner">Owner</span>
        <span class="col-date">Modified</span>
      </div>

      <div v-if="loading && !entries.length" class="files-loading">
        <i class="fas fa-circle-notch fa-spin"></i> Loading...
      </div>

      <div v-else-if="!entries.length && !loading" class="files-empty">
        <i class="fas fa-folder-open"></i> Directory is empty
      </div>

      <div
        v-for="entry in sortedEntries"
        :key="entry.name"
        :class="['file-row', entry.isDir ? 'is-dir' : 'is-file', { 'is-link': entry.isLink }]"
        @click="entry.isDir && navigate(entry.name)"
        @dblclick="!entry.isDir && previewFile(entry.name)"
      >
        <span class="col-perms mono">{{ entry.perms }}</span>
        <span class="col-name">
          <i :class="fileIcon(entry)"></i>
          {{ entry.name }}
          <span v-if="entry.isLink" class="link-badge">link</span>
        </span>
        <span class="col-size mono">{{ entry.isDir ? '—' : entry.size }}</span>
        <span class="col-owner mono">{{ entry.owner }}</span>
        <span class="col-date mono">{{ entry.date }} {{ entry.time }}</span>
      </div>
    </div>

    <!-- File preview -->
    <div v-if="preview.show" class="file-preview">
      <div class="preview-header">
        <span class="mono"><i class="fas fa-file-code"></i> {{ preview.name }}</span>
        <button class="close-btn" @click="preview.show = false"><i class="fas fa-times"></i></button>
      </div>
      <div v-if="preview.loading" class="preview-loading"><i class="fas fa-circle-notch fa-spin"></i></div>
      <pre v-else class="preview-content">{{ preview.content }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

const DIR_ICONS: Record<string, string> = {
  '/bin': 'fas fa-terminal', '/sbin': 'fas fa-terminal',
  '/etc': 'fas fa-cog', '/home': 'fas fa-user',
  '/lib': 'fas fa-book', '/proc': 'fas fa-microchip',
  '/sys': 'fas fa-bolt', '/dev': 'fas fa-plug',
  '/tmp': 'fas fa-trash-alt', '/var': 'fas fa-database',
  '/usr': 'fas fa-folder', '/root': 'fas fa-shield-alt',
  '/boot': 'fas fa-rocket',
}

const EXT_ICONS: Record<string, string> = {
  conf: 'fas fa-sliders-h', cfg: 'fas fa-sliders-h',
  sh: 'fas fa-terminal', bash: 'fas fa-terminal',
  py: 'fab fa-python', js: 'fab fa-js',
  json: 'fas fa-code', xml: 'fas fa-code',
  txt: 'fas fa-file-alt', log: 'fas fa-list-alt',
  gz: 'fas fa-file-archive', tar: 'fas fa-file-archive', zip: 'fas fa-file-archive',
  img: 'fas fa-compact-disc', bin: 'fas fa-microchip',
  so: 'fas fa-link', ko: 'fas fa-puzzle-piece',
}

export default Vue.extend({
  name: 'LicheeFiles',
  inject: ['$toast'],
  props: { socketId: { type: String, required: true } },
  data() {
    return {
      currentPath: '/',
      pathInput: '',
      entries: [] as any[],
      loading: false,
      error: '',
      preview: { show: false, name: '', content: '', loading: false },
    }
  },
  computed: {
    sortedEntries(): any[] {
      return [...this.entries].sort((a, b) => {
        if (a.name === '.' || a.name === '..') return -1
        if (b.name === '.' || b.name === '..') return 1
        if (a.isDir && !b.isDir) return -1
        if (!a.isDir && b.isDir) return 1
        return a.name.localeCompare(b.name)
      })
    },
    breadcrumbParts(): string[] {
      const parts = this.currentPath.split('/').filter(Boolean)
      return ['/', ...parts]
    },
  },
  mounted() {
    this.loadDir('/')
  },
  methods: {
    async loadDir(path: string) {
      this.loading = true
      this.error = ''
      try {
        const data = await this.$axios.$get('/api/files', {
          params: { path },
          headers: { 'x-socket-id': this.socketId },
        })
        this.entries = data.entries || []
        this.currentPath = data.path || path
        this.pathInput = ''
      } catch (e: any) {
        this.error = e.response?.data?.error || e.message
      }
      this.loading = false
    },
    navigate(name: string) {
      if (name === '.') return
      if (name === '..') {
        const parts = this.currentPath.split('/').filter(Boolean)
        parts.pop()
        this.loadDir('/' + parts.join('/') || '/')
        return
      }
      const path = (this.currentPath === '/' ? '' : this.currentPath) + '/' + name
      this.loadDir(path)
    },
    navigateTo(path: string) {
      if (path) this.loadDir(path)
    },
    navigateToCrumb(index: number) {
      const parts = this.breadcrumbParts.slice(1, index + 1)
      this.loadDir(parts.length === 0 ? '/' : '/' + parts.join('/'))
    },
    refresh() {
      this.loadDir(this.currentPath)
    },
    fileIcon(entry: any) {
      if (entry.isDir) {
        const fullPath = (this.currentPath === '/' ? '' : this.currentPath) + '/' + entry.name
        return DIR_ICONS[fullPath] || 'fas fa-folder'
      }
      const ext = entry.name.split('.').pop()?.toLowerCase() || ''
      if (entry.perms?.includes('x')) return 'fas fa-bolt'
      return EXT_ICONS[ext] || 'fas fa-file'
    },
    async previewFile(name: string) {
      const path = (this.currentPath === '/' ? '' : this.currentPath) + '/' + name
      this.preview = { show: true, name, content: '', loading: true }
      try {
        const data = await this.$axios.$post(
          '/api/exec',
          { command: `head -100 "${path}" 2>&1` },
          { headers: { 'x-socket-id': this.socketId } }
        )
        this.preview.content = data.output || '(empty file)'
      } catch (_) {
        this.preview.content = '(cannot read file)'
      }
      this.preview.loading = false
    },
  },
})
</script>

<style scoped>
.files-panel { display: flex; flex-direction: column; gap: 14px; height: 100%; }

.files-toolbar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.breadcrumb { display: flex; align-items: center; gap: 0; flex: 1; overflow: hidden; }
.crumb-btn {
  background: none; border: none; cursor: pointer;
  color: var(--text-dim); font-size: 12px; padding: 3px 6px;
  border-radius: 4px; transition: all 0.15s;
  display: flex; align-items: center; gap: 4px;
}
.crumb-btn:hover { background: var(--card2); color: var(--accent); }
.crumb-btn:not(:last-child)::after { content: '/'; color: var(--text-faint); margin-left: 2px; }
.crumb-btn i { font-size: 11px; color: var(--accent); }

.toolbar-right { display: flex; align-items: center; gap: 6px; }
.path-input {
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-size: 11px; font-family: 'JetBrains Mono', monospace;
  padding: 5px 10px; width: 200px; outline: none;
  transition: border-color 0.15s;
}
.path-input:focus { border-color: rgba(255,140,66,0.3); }
.path-input::placeholder { color: var(--text-faint); }

.toolbar-btn {
  background: var(--card2); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text-dim); font-size: 11px; padding: 5px 10px;
  cursor: pointer; transition: all 0.15s;
}
.toolbar-btn:hover { background: var(--accent-dim); color: var(--accent); border-color: rgba(255,140,66,0.2); }

.files-error {
  padding: 10px 14px; background: var(--red-dim);
  border: 1px solid rgba(248,113,113,0.2); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--red); display: flex; align-items: center; gap: 8px;
}
.err-retry-btn {
  margin-left: auto; background: var(--red-dim); border: 1px solid rgba(248,113,113,0.3);
  border-radius: 5px; color: var(--red); font-size: 11px; padding: 3px 10px; cursor: pointer;
  display: flex; align-items: center; gap: 5px; transition: background 0.15s; flex-shrink: 0;
}
.err-retry-btn:hover { background: rgba(248,113,113,0.2); }

.files-list {
  flex: 1; background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.files-header {
  display: grid; grid-template-columns: 120px 1fr 80px 100px 130px;
  padding: 8px 16px; gap: 8px;
  background: var(--card2); border-bottom: 1px solid var(--border);
  font-size: 10px; font-weight: 600; color: var(--text-faint);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.files-loading, .files-empty {
  padding: 40px; text-align: center;
  font-size: 13px; color: var(--text-faint);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}

.file-row {
  display: grid; grid-template-columns: 120px 1fr 80px 100px 130px;
  padding: 8px 16px; gap: 8px; align-items: center;
  border-bottom: 1px solid rgba(42,38,56,0.5);
  font-size: 12px; color: var(--text-dim);
  transition: background 0.1s;
}
.file-row:hover { background: rgba(42,38,56,0.7); }
.file-row.is-dir { cursor: pointer; }
.file-row.is-dir:hover .col-name { color: var(--accent); }
.file-row.is-file:hover { cursor: default; }
.file-row.is-file:hover .col-name { color: var(--text); }

.col-name { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.col-name i { font-size: 11px; width: 14px; flex-shrink: 0; }
.is-dir .col-name i { color: var(--accent); }
.is-file .col-name i { color: var(--text-faint); }
.col-name span:not(.link-badge) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-badge {
  font-size: 9px; padding: 1px 5px; border-radius: 4px;
  background: var(--blue-dim); color: var(--blue); flex-shrink: 0;
}
.mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.col-perms { color: var(--text-faint); }
.col-size { text-align: right; }

.file-preview {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.preview-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; background: var(--card2); border-bottom: 1px solid var(--border);
  font-size: 11px; color: var(--accent);
}
.close-btn { background: none; border: none; cursor: pointer; color: var(--text-faint); font-size: 12px; }
.close-btn:hover { color: var(--red); }
.preview-loading { padding: 20px; text-align: center; color: var(--text-faint); font-size: 12px; }
.preview-content {
  padding: 12px 14px; font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--text);
  white-space: pre-wrap; word-break: break-all;
  max-height: 280px; overflow-y: auto;
}
</style>
