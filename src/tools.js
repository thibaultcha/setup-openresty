const path = require("path")
const core = require("@actions/core")
const exec = require("@actions/exec")
const tc = require("@actions/tool-cache")
const io = require("@actions/io")
const { DIR_WORK } = require("./constants")

const DIR_DOWNLOADS = path.join(DIR_WORK, "downloads")

async function sh(cmd, opts = {}) {
    await exec.exec("sh", ["-c", `${cmd}`], opts)
}

async function download(name, url, version) {
    let src = tc.find(name, version)

    if (!src) {
        core.info(`Downloading ${name} from ${url}`)
        let dl = await tc.downloadTool(url)

        if (/\.tar\.gz$/.exec(url)) {
            let dir_dl = path.join(DIR_DOWNLOADS, name)
            await io.mkdirP(dir_dl)

            core.info(`Extracting archive from ${dl}`)
            let tar = await tc.extractTar(dl, dir_dl, ["-xz", "--strip-components=1"])
            src = await tc.cacheDir(tar, name, version)

        } else {
            src = await tc.cacheFile(dl, name, name, version)
            src = path.join(src, name)
        }

    } else {
        core.info(`Reusing downloaded artifact at ${src}`)
    }

    let cpy = path.join(DIR_WORK, name)

    await io.mkdirP(DIR_WORK)
    await io.cp(src, cpy, { recursive: true, force: false })

    return cpy
}

module.exports.sh = sh
module.exports.download = download
