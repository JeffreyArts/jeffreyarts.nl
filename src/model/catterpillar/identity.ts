export type IdentityField = {
    id: number;                 // 29-bit: 23 bits seconds/4 + 6 bits random
    name: string;               // max 32 chars, letters A-Z/a-z + space
    textureIndex: number;       // 0-1023
    colorSchemeIndex: number;   // 0-1023
    offset: number;             // 0-15
    gender: number;             // 0 | 1
    length: number;             // 0-31
    thickness: number;          // 0-63
}


// Generate and encode identity to QR-ready Base45 string of 29 + 96 + 10 + 10 + 4 + 5 + 5 + 1= 160 bits
class Identity {
    private static readonly BASE45_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"

    // --- Generate 29-bit ID ---
    generateId(): number {
        const now = new Date()
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const secondsSinceYear = Math.floor((now.getTime() - yearStart.getTime()) / 1000)
        const secondsDiv4 = Math.floor(secondsSinceYear / 4)
        const random6 = Math.floor(Math.random() * 64)
        return (secondsDiv4 << 6) | random6
    }

    // Encoding
    encode(json: IdentityField): string {
        const identity = this.validateIdentityJSON(json)
        const bytes = this.bitPack(identity)
        return this.base45Encode(bytes)
    }

    // Decoding
    decode(encoded: string): IdentityField {
        this.validateIdentityString(encoded)
        const bytes = this.base45Decode(encoded)
        return this.bitUnpack(bytes)
    }

    // --- Generate Identity from String ---
    async deriveIdentityFromHash(string: string): Promise<IdentityField> {
        const data = new TextEncoder().encode(string)
        const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data))
        let bitIndex = 0

        function readBits(n: number): number {
            let val = 0
            for (let i = 0; i < n; i++) {
                const byte = hash[Math.floor(bitIndex / 8)]
                const bit = (byte >> (7 - (bitIndex % 8))) & 1
                val = (val << 1) | bit
                bitIndex++
            }
            return val
        }

        const textureIndex = readBits(10)
        const colorSchemeIndex = readBits(10)
        const offset = readBits(4)
        const gender = readBits(1)
        const length = readBits(4) + 3
        const thickness = readBits(5) 

        return {
            id: this.generateId(),
            name: "",
            textureIndex,
            colorSchemeIndex,
            offset,
            gender,
            length,
            thickness
        }
    }

    stringToId(str: string): number {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0
        }
        return hash & 0x1FFFFFFF
    }

    // ---------------- VALIDATION ----------------

    private validateIdentityJSON(json: IdentityField): IdentityField {
        const { id, name, textureIndex, colorSchemeIndex, offset, gender, length, thickness } = json

        if (typeof id !== "number" || id < 0 || id > 0x1FFFFFFF)
            throw new Error("Invalid id")

        if (typeof name !== "string" || name.length > 32)
            throw new Error("Invalid name")

        if (!/^[A-Za-z ]*$/.test(name))
            throw new Error("Invalid name chars")

        if (textureIndex < 0 || textureIndex > 1023)
            throw new Error("Invalid textureIndex")

        if (colorSchemeIndex < 0 || colorSchemeIndex > 1023)
            throw new Error("Invalid colorSchemeIndex")

        if (offset < 0 || offset > 15)
            throw new Error("Invalid offset")

        
        if (gender !== 0 && gender !== 1)
            throw new Error("Invalid gender")

        if (length < 3 || length > 24)
            throw new Error("Invalid length")

        if (thickness < 8 || thickness > 40)
            throw new Error("Invalid thickness")

        return json
    }

    validateIdentityString(encodedString: string): string {
        for (const c of encodedString) {
            if (!Identity.BASE45_CHARS.includes(c)) {
                throw new Error(`Invalid Base45 character: '${c}'`)
            }
        }

        // if (encodedString.length !== 50) {
        //     throw new Error("Invalid Base45 length")
        // }

        return encodedString
    }

    // ---------------- CHAR CODING ----------------

    private encodeChar(c: string): number {
        if (c === " ") return 0
        if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 64
        if (c >= "a" && c <= "z") return c.charCodeAt(0) - 70
        throw new Error(`Invalid char: ${c}`)
    }

    private decodeChar(code: number): string {
        if (code === 0) return " "
        if (code >= 1 && code <= 26) return String.fromCharCode(code + 64)
        if (code >= 27 && code <= 52) return String.fromCharCode(code + 70)
        throw new Error(`Invalid char code: ${code}`)
    }

    // ---------------- BIT PACKING ----------------

    private push(bits: number[], value: number, size: number): void {
        for (let i = size - 1; i >= 0; i--) {
            bits.push((value >> i) & 1)
        }
    }

    private unPush(bits: number[], cursor: number, size: number) {
        let val = 0
        for (let i = 0; i < size; i++) {
            val = (val << 1) | bits[cursor++]
        }
        return { value: val, cursor }
    }

    private bitPack(identity: IdentityField): Uint8Array {
        const bits: number[] = []

        this.push(bits, identity.id, 29)

        const name = identity.name.padEnd(32, " ")
        for (const c of name) this.push(bits, this.encodeChar(c), 6)

        this.push(bits, identity.textureIndex, 10)
        this.push(bits, identity.colorSchemeIndex, 10)
        this.push(bits, identity.offset, 4)
        this.push(bits, identity.gender, 1)
        this.push(bits, identity.length - 3, 5)      // 3–24
        this.push(bits, identity.thickness - 8, 5)   // 8–40

        const bytes = new Uint8Array(Math.ceil(bits.length / 8))
        let byte = 0

        for (let i = 0; i < bits.length; i++) {
            byte = (byte << 1) | bits[i]
            if (i % 8 === 7) {
                bytes[i >> 3] = byte
                byte = 0
            }
        }

        if (bits.length % 8 !== 0) {
            const pad = 8 - (bits.length % 8)
            byte <<= pad
            bytes[bytes.length - 1] = byte
        }

        return bytes
    }

    private bitUnpack(bytes: Uint8Array): IdentityField {
        const bits: number[] = []
        for (const b of bytes) {
            for (let j = 7; j >= 0; j--) {
                bits.push((b >> j) & 1)
            }
        }

        let cursor = 0
        let r

        r = this.unPush(bits, cursor, 29)
        const id = r.value; cursor = r.cursor

        let name = ""
        for (let i = 0; i < 32; i++) {
            r = this.unPush(bits, cursor, 6)
            name += this.decodeChar(r.value)
            cursor = r.cursor
        }
        name = name.trimEnd()

        r = this.unPush(bits, cursor, 10)
        const textureIndex = r.value; cursor = r.cursor

        r = this.unPush(bits, cursor, 10)
        const colorSchemeIndex = r.value; cursor = r.cursor

        r = this.unPush(bits, cursor, 4)
        const offset = r.value; cursor = r.cursor

        r = this.unPush(bits, cursor, 1)
        const gender = r.value; cursor = r.cursor

        r = this.unPush(bits, cursor, 5)
        const length = r.value + 3; cursor = r.cursor

        r = this.unPush(bits, cursor, 5)
        const thickness = r.value + 8

        return { id, name, textureIndex, colorSchemeIndex, offset, gender, length, thickness }
    }

    // ---------------- BASE45 ----------------

    private base45Encode(bytes: Uint8Array): string {
        const chars = Identity.BASE45_CHARS
        let result = ""
        let i = 0
        while (i < bytes.length) {
            if (i + 1 < bytes.length) {
                const x = (bytes[i] << 8) | bytes[i + 1]
                result += chars[x % 45]
                result += chars[Math.floor(x / 45) % 45]
                result += chars[Math.floor(x / (45*45))]
                i += 2
            } else {
                const x = bytes[i]
                result += chars[x % 45]
                result += chars[Math.floor(x / 45)]
                i += 1
            }
        }
        return result
    }

    private base45Decode(str: string): Uint8Array {
        const chars = Identity.BASE45_CHARS
        const bytes: number[] = []
        let i = 0
        while (i < str.length) {
            if (i + 2 < str.length) {
                const c = chars.indexOf(str[i++])
                const d = chars.indexOf(str[i++])
                const e = chars.indexOf(str[i++])
                const x = c + d*45 + e*45*45
                bytes.push((x >> 8) & 0xff, x & 0xff)
            } else if (i + 1 < str.length) {
                const c = chars.indexOf(str[i++])
                const d = chars.indexOf(str[i++])
                const x = c + d*45
                bytes.push(x & 0xff)
            }
        }
        return new Uint8Array(bytes)
    }
}


export default Identity