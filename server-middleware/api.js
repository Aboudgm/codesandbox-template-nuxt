const express = require('express')
const { connections } = require('../server/state')

const app = express()
app.use(express.json())

function getSession(req) {
  return connections.get(req.headers['x-socket-id'])
}

function exec(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve('')
      let out = ''
      stream.on('data', (d) => { out += d })
      stream.stderr.on('data', (d) => { out += d })
      stream.on('close', () => resolve(out.trim()))
    })
  })
}

app.get('/ping', (req, res) => {
  const s = getSession(req)
  res.json({ connected: !!s, host: s?.host || null })
})

app.get('/stats', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })

  const [cpuRaw, memRaw, diskRaw, uptimeRaw, tempRaw, loadRaw, hostnameRaw, kernelRaw, archRaw] =
    await Promise.all([
      exec(s.conn, "top -bn1 2>/dev/null | grep -i 'cpu\\|%Cpu' | head -1 | awk '{for(i=1;i<=NF;i++) if($i~/[0-9]/ && $(i+1)~/us|id/) {print $i; exit}}' || cat /proc/loadavg | awk '{printf \"%.0f\", $1*10}'"),
      exec(s.conn, "free -m 2>/dev/null | awk 'NR==2{printf \"%d %d\", $3, $2}'"),
      exec(s.conn, "df -h / 2>/dev/null | awk 'NR==2{printf \"%s %s %s\", $3, $2, $5}'"),
      exec(s.conn, "uptime 2>/dev/null | sed 's/.*up //' | sed 's/,.*//'"),
      exec(s.conn, "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0"),
      exec(s.conn, "cat /proc/loadavg 2>/dev/null"),
      exec(s.conn, "hostname 2>/dev/null"),
      exec(s.conn, "uname -r 2>/dev/null"),
      exec(s.conn, "uname -m 2>/dev/null"),
    ])

  const memParts = memRaw.split(' ')
  const memUsed = parseInt(memParts[0]) || 0
  const memTotal = parseInt(memParts[1]) || 256
  const memPct = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0

  const diskParts = diskRaw.split(' ')
  const diskPct = parseInt((diskParts[2] || '0%').replace('%', '')) || 0

  const tempC = Math.round(parseInt(tempRaw || '0') / 1000) || 0
  const actualTemp = tempC > 1 ? tempC : parseInt(tempRaw || '0')

  const loadParts = loadRaw.split(' ')

  let cpuPct = parseFloat(cpuRaw) || 0
  if (cpuPct > 100) cpuPct = Math.min(100, cpuPct)

  res.json({
    cpu: { pct: Math.round(cpuPct), load: loadParts[0] || '0.00' },
    memory: { used: memUsed, total: memTotal, pct: memPct },
    disk: { used: diskParts[0] || '?', total: diskParts[1] || '?', pct: diskPct },
    temperature: actualTemp,
    uptime: uptimeRaw || 'unknown',
    load: { one: loadParts[0] || '0', five: loadParts[1] || '0', fifteen: loadParts[2] || '0' },
    hostname: hostnameRaw || 'licheerv',
    kernel: kernelRaw || 'unknown',
    arch: archRaw || 'riscv64',
  })
})

app.get('/processes', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })

  const raw = await exec(
    s.conn,
    "ps aux 2>/dev/null | sort -rn -k3 | head -20 || ps -eo pid,comm,pcpu,pmem,stat 2>/dev/null | head -20"
  )

  const lines = raw.split('\n').filter(Boolean)
  const header = lines[0] || ''
  const procs = lines.slice(1).map((line) => {
    const parts = line.trim().split(/\s+/)
    if (header.includes('USER')) {
      return {
        user: parts[0] || '',
        pid: parts[1] || '',
        cpu: parts[2] || '0',
        mem: parts[3] || '0',
        stat: parts[7] || '',
        cmd: parts.slice(10).join(' ') || parts[parts.length - 1] || '',
      }
    }
    return {
      user: '',
      pid: parts[0] || '',
      cpu: parts[2] || '0',
      mem: parts[3] || '0',
      stat: parts[4] || '',
      cmd: parts[1] || '',
    }
  })

  res.json({ processes: procs })
})

app.get('/files', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })

  const path = (req.query.path || '/').replace(/[;&|`$]/g, '')
  const raw = await exec(s.conn, `ls -la --time-style=+"%Y-%m-%d %H:%M" "${path}" 2>&1`)
  const lines = raw.split('\n').filter(Boolean)

  const entries = []
  for (const line of lines) {
    if (line.startsWith('total') || line.startsWith('ls:')) continue
    const m = line.match(/^([drwxlstST\-]{10})\s+\d+\s+(\S+)\s+\S+\s+(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/)
    if (m) {
      entries.push({
        perms: m[1],
        owner: m[2],
        size: m[3],
        date: m[4],
        time: m[5],
        name: m[6],
        isDir: m[1].startsWith('d'),
        isLink: m[1].startsWith('l'),
      })
    }
  }

  res.json({ path, entries })
})

app.get('/network', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })

  const [ifaces, routes, rxTx] = await Promise.all([
    exec(s.conn, "ip addr 2>/dev/null || ifconfig 2>/dev/null"),
    exec(s.conn, "ip route 2>/dev/null || route -n 2>/dev/null"),
    exec(s.conn, "cat /proc/net/dev 2>/dev/null | tail -n +3"),
  ])

  const ifaceList = []
  const ifaceBlocks = ifaces.split(/\n(?=\d+:)/)
  for (const block of ifaceBlocks) {
    const nameMatch = block.match(/^\d+:\s+(\S+)/)
    if (!nameMatch) continue
    const name = nameMatch[1].replace(':', '')
    const ipMatch = block.match(/inet\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/)
    const macMatch = block.match(/link\/ether\s+([0-9a-f:]+)/i)
    const stateMatch = block.match(/state\s+(\S+)/i)
    ifaceList.push({
      name,
      ip: ipMatch ? `${ipMatch[1]}/${ipMatch[2]}` : null,
      mac: macMatch ? macMatch[1] : null,
      state: stateMatch ? stateMatch[1] : 'UNKNOWN',
      up: block.includes('UP'),
    })
  }

  const netStats = {}
  for (const line of rxTx.split('\n')) {
    const m = line.trim().match(/^(\S+):\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/)
    if (m) {
      netStats[m[1].replace(':', '')] = {
        rx: formatBytes(parseInt(m[2])),
        tx: formatBytes(parseInt(m[3])),
      }
    }
  }

  res.json({ interfaces: ifaceList, routes: routes.trim(), stats: netStats })
})

app.get('/gpio', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })

  const exported = await exec(s.conn, "ls /sys/class/gpio 2>/dev/null | grep -v 'export\\|unexport\\|gpiochip'")
  const pins = []
  for (const pin of exported.split('\n').filter(Boolean)) {
    const num = pin.replace('gpio', '')
    const [dir, val] = await Promise.all([
      exec(s.conn, `cat /sys/class/gpio/${pin}/direction 2>/dev/null`),
      exec(s.conn, `cat /sys/class/gpio/${pin}/value 2>/dev/null`),
    ])
    pins.push({ num, name: pin, direction: dir || 'in', value: parseInt(val) || 0 })
  }

  res.json({ pins })
})

app.post('/gpio/export', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })
  const { pin } = req.body
  if (!/^\d+$/.test(String(pin))) return res.status(400).json({ error: 'Invalid pin' })
  await exec(s.conn, `echo ${pin} > /sys/class/gpio/export 2>/dev/null; echo out > /sys/class/gpio/gpio${pin}/direction 2>/dev/null`)
  res.json({ ok: true })
})

app.post('/gpio/write', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })
  const { pin, value } = req.body
  if (!/^\d+$/.test(String(pin)) || (value !== 0 && value !== 1)) return res.status(400).json({ error: 'Invalid' })
  await exec(s.conn, `echo ${value} > /sys/class/gpio/gpio${pin}/value 2>/dev/null`)
  res.json({ ok: true })
})

app.post('/exec', async (req, res) => {
  const s = getSession(req)
  if (!s) return res.status(401).json({ error: 'Not connected' })
  const { command } = req.body
  if (!command || typeof command !== 'string') return res.status(400).json({ error: 'No command' })
  const safe = command.slice(0, 512)
  const output = await exec(s.conn, safe)
  res.json({ output })
})

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

module.exports = app
