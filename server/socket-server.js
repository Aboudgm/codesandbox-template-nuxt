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

      conn.on('error', (err) => {
        socket.emit('ssh:error', err.message)
      })

      conn.connect({ host, port: Number(port), username, password, readyTimeout: 10000 })
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
