// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: robot;
const CryptoJS = importModule('Encrypting Nonsense')

const input = args.shortcutParameter

if (!input || !input.mode || !input.text) {
  Script.setShortcutOutput("Error: Invalid input")
  Script.complete()
  return
}

const password = Keychain.get("ENC_PASSWORD")
const key = CryptoJS.SHA256(password)
const mode = input.mode.toLowerCase()

let output

if (mode === "encrypt") {

  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(input.text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  output = iv.toString() + ":" + encrypted.toString()

} else if (mode === "decrypt") {

  try {
    if (input.text.includes(":")) {
      // New format — random IV
      const colonIndex = input.text.indexOf(":")
      const ivHex = input.text.slice(0, colonIndex)
      const encryptedText = input.text.slice(colonIndex + 1)
      const iv = CryptoJS.enc.Hex.parse(ivHex)

      const bytes = CryptoJS.AES.decrypt(encryptedText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      output = bytes.toString(CryptoJS.enc.Utf8) || "Error: Decryption failed"
    } else {
      // Legacy format — hardcoded IV (remove once old data is migrated)
      const iv = CryptoJS.enc.Utf8.parse("initialvector123")
      const bytes = CryptoJS.AES.decrypt(input.text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      output = bytes.toString(CryptoJS.enc.Utf8) || "Error: Decryption failed"
    }
  } catch (e) {
    output = "Error: Decryption failed"
  }

} else {
  output = "Error: Mode must be 'encrypt' or 'decrypt'"
}

Script.setShortcutOutput(output)
Script.complete()