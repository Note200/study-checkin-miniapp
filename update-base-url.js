const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = process.env.PORT || '8080'
const targetFile = path.join(__dirname, 'config.js')

function isPrivateIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false
  return ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
}

function getPreferredIPv4() {
  const networkInterfaces = os.networkInterfaces()

  for (const interfaceName of Object.keys(networkInterfaces)) {
    const addresses = networkInterfaces[interfaceName] || []
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal && isPrivateIPv4(address.address)) {
        return address.address
      }
    }
  }

  return null
}

function buildConfig(ip) {
  return `// 开发环境接口地址（可由 update-base-url.js 自动更新）\nconst BASE_URL = 'http://${ip}:${PORT}'\n\nmodule.exports = {\n  BASE_URL\n}\n`
}

const customIp = process.argv[2]
const ip = customIp || getPreferredIPv4()

if (!ip) {
  console.error('[ERROR] No LAN IPv4 found. Connect Wi-Fi or Ethernet and try again.')
  process.exit(1)
}

fs.writeFileSync(targetFile, buildConfig(ip), 'utf8')
console.log(`[OK] BASE_URL updated: http://${ip}:${PORT}`)
console.log(`[OK] Saved to: ${targetFile}`)

