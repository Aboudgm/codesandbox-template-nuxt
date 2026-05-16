const { Server } = require('socket.io')
const { Client } = require('ssh2')
const { connections } = require('./state')

function attach(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  })

  io.on('connection', (socket) => {
    socket.on('ssh:connect', ({ host, port = 22, username, password }) => {
      if (connections.has(socket.id)) {
        const old = connections.get(socket.id)
        try { old.stream?.end() } catch (_) {}
        try { old.conn?.end() } catch (_) {}
        connections.delete(socket.id)
      }

      const conn = new Client()
      const pass = password || ''

      conn.on('ready', () => {
        conn.shell(
          { term: 'xterm-256color', rows: 24, cols: 80 },
          (err, stream) => {
            if (err) {
              socket.emit('ssh:error', err.message)
              conn.end()
              return
            }

            connections.set(socket.id, { conn, stream, host, port, username })
            socket.emit('ssh:ready', { host, username })

            stream.on('data', (data) => {
              socket.emit('ssh:data', data.toString('binary'))
            })

            stream.stderr.on('data', (data) => {
              socket.emit('ssh:data', data.toString('binary'))
            })

            stream.on('close', () => {
              socket.emit('ssh:closed')
              connections.delete(socket.id)
            })
          }
        )
      })

      // Handle keyboard-interactive auth (common on embedded Linux / no-password setups)
      conn.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
        // Respond to every prompt with the password (or empty string if none given)
        const responses = prompts.map(() => pass)
        finish(responses)
      })

      conn.on('error', (err) => {
        // Give a friendlier message for auth failures
        if (err.message.includes('All configured authentication methods failed')) {
          socket.emit('ssh:error', 'Authentication failed — wrong password, or the device requires a specific auth method')
        } else {
          socket.emit('ssh:error', err.message)
        }
      })

      const connectOptions = {
        host,
        port: Number(port),
        username,
        readyTimeout: 12000,
        // Always try keyboard-interactive so no-password devices work
        tryKeyboard: true,
      }

      // Only add password field if one was provided
      if (pass) {
        connectOptions.password = pass
      }

      conn.connect(connectOptions)
    })

    socket.on('ssh:input', (data) => {
      const s = connections.get(socket.id)
      if (s?.stream) s.stream.write(data)
    })

    socket.on('ssh:resize', ({ cols, rows }) => {
      const s = connections.get(socket.id)
      if (s?.stream) s.stream.setWindow(rows, cols, 0, 0)
    })

    socket.on('ssh:disconnect', () => {
      const s = connections.get(socket.id)
      if (s) {
        try { s.stream?.end() } catch (_) {}
        try { s.conn?.end() } catch (_) {}
        connections.delete(socket.id)
      }
      socket.emit('ssh:closed')
    })

    socket.on('disconnect', () => {
      const s = connections.get(socket.id)
      if (s) {
        try { s.stream?.end() } catch (_) {}
        try { s.conn?.end() } catch (_) {}
        connections.delete(socket.id)
      }
    })
  })
}

module.exports = { attach }
