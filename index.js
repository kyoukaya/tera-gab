'use strict'

const util = require('./src/utils')
const config = util.config

class TeraGab {
    constructor(mod) {
        this.mod = mod
        this.enabled = false
        this.inComing = false
        this.outGoing = config['outgoingEnabled']
        this.hooks = []

        mod.command.add("gab", {
            $default() {
                mod.command.message('gab is ON')
                mod.command.message('Usage: gab [on | off]')
            },
            on() {
                this.enable()
            },
            off() {
                this.disable()
            }
        }, this)

        if (config['defaultEnabled']) {
            this.enable()
        }
    }

    buildRegexPattern() {
        this.regexPattern = ''
        // If a censored word is separated by >1 " " or ".", it won't get censored
        const whitespaceFlag = '[. ]?'
        const n_whiteSpaceFlag = whitespaceFlag.length

        for (const word of util.censoredWords) {
            let processed = ''
            let wordLen = word.length

            // Insert whitespace character pattern between each char of each word
            for (let c of word) {
                processed += c
                processed += whitespaceFlag
            }
            // Remove extraneous whitespaceFlag
            processed = processed.slice(0, -n_whiteSpaceFlag)
            this.regexPattern += '(' + processed + ')|'
        }
        // Remove extraneous '|'
        this.regexPattern = this.regexPattern.slice(0, -1)
    }

    decensor(def, ver, event) {
        // There's a zero-width space here.
        const zeroSpace = '​'
        // Shouldn't need a unicode flag.
        // Would be better if we didn't have to compile the regexp every time
        // but there's no nice, fast way to do a shallow copy.
        let exp = new RegExp(this.regexPattern, 'gi')

        for (let res = exp.exec(event.message); res !== null; res = exp.exec(event.message)) {
            let i = res['index']
            // Splice to the right
            event.message = event.message.slice(0, i + 1) + zeroSpace +
                event.message.slice(i + 1, event.message.length)
        }
        // May god have mercy on me
        if (def[0] === 'C') {
            this.mod.toServer(def, ver, event)
        } else {
            this.mod.toClient(def, ver, event)
        }
        // Block original packet
        return false
    }

    enable() {
        if (this.enabled) {
            this.mod.command.message("Already activated.")
            return
        }

        if (this.inComing) {
            for (let def in util.defs['IN_BOUND']) {
                let ver = util.defs['IN_BOUND'][def]['ver']
                let order = util.defs['IN_BOUND'][def]['order']

                this.hooks.push(
                    this.mod.hook(
                        def, ver, {
                            order: order
                        },
                        this.decensor.bind(this, def, ver)
                    )
                )
            }
            this.mod.command.message("Incoming chat decensor activated.")
        }

        if (this.outGoing) {
            for (let def in util.defs['OUT_BOUND']) {
                let ver = util.defs['OUT_BOUND'][def]['ver']
                let order = util.defs['OUT_BOUND'][def]['order']

                this.hooks.push(
                    this.mod.hook(
                        def, ver, {
                            order: order
                        },
                        this.decensor.bind(this, def, ver)
                    )
                )
            }
            this.mod.command.message("Outgoing chat decensor activated.")
        }

        this.buildRegexPattern()
        this.enabled = true
    }

    disable() {
        if (!this.enabled) {
            this.mod.command.message("Already disabled.")
            return
        }
        for (let hook of this.hooks) {
            this.mod.unhook(hook)
        }
        this.hooks = []
        this.enabled = false
        this.mod.command.message("Disabled.")
    }
}

module.exports = TeraGab
