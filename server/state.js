// Shared SSH session state between socket server and API middleware
const connections = new Map()

module.exports = { connections }
