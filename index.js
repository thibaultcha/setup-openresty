const { cpus } = require("os")
const path = require("path")
const fs = require("fs")
const core = require("@actions/core")
const exec = require("@actions/exec")
const tc = require("@actions/tool-cache")
const io = require("@actions/io")

const OPENRESTY_HOST="https://openresty.org"
const OPENSSL_HOST="https://www.openssl.org"
const OPENSSL_PATCH_VER="1.1.1f"
const DIR_WORK = path.join(process.env.GITHUB_WORKSPACE, "work")
const DIR_BUILD = path.join(DIR_WORK, "build")
const DIR_DOWNLOADS = path.join(DIR_WORK, "downloads")
const NPROC = cpus().length

function getBoolInput(name, opts) {
    let v = core.getInput(name, opts)
    if (v) {
        return /^\s*(true|1)\s*$/i.test(v)
    }
}

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
            let filename = path.parse(url).base
            src = await tc.cacheFile(dl, filename, name, version)
            src = path.join(src, filename)
        }

    } else {
        core.info(`Reusing downloaded artifact at ${dir}`)
    }

    return src
}

async function build_openssl(openssl_src, openssl) {
    let openssl_prefix = path.join(process.env.GITHUB_WORKSPACE, "openssl", openssl.version)
    let configure_cmd = ["./config",
        `--prefix=${openssl_prefix}`,
        `--openssldir=${openssl_prefix}/openssl`,
        "-g",
        "shared",
        "no-threads",
        "-DPURIFY"]

    if (openssl.min == 1) {
        /* 1.1.x */
        configure_cmd.push("no-unit-test")
        configure_cmd.push("enable-ssl3")
        configure_cmd.push("enable-ssl3-method")

        if (openssl.patch == 1) {
            /* 1.1.1 */
            configure_cmd.push("enable-tls1_3")
        }

    } else {
        /* 1.0.x */
        configure_cmd.push("no-tests")
    }

    await sh(configure_cmd.join(" "), { cwd: openssl_src })
    await sh(`make -j${NPROC}`, { cwd: openssl_src })
    await sh("make install_sw", { cwd: openssl_src })
}

async function build_openresty(openresty_src, openresty_version, openssl_src) {
    let configure_opt = core.getInput("opt")
    let with_cc = core.getInput("with-cc")
    let with_cc_opt = core.getInput("with-cc-opt")
    let with_ld_opt = core.getInput("with-ld-opt")
    let with_debug = getBoolInput("with-debug")
    let with_no_pool = getBoolInput("with-no-pool-patch")
    let with_openssl_opt = core.getInput("with-openssl-opt")

    let openresty_prefix = path.join(process.env.GITHUB_WORKSPACE, "openresty", openresty_version)
    let configure_cmd = [`./configure`,
                         `--builddir=${DIR_BUILD}`,
                         `--prefix=${openresty_prefix}`,
                         `-j${NPROC}`]

    if (with_cc) {
        configure_cmd.push(`--with-cc=${with_cc}`)
    }

    if (with_cc_opt) {
        configure_cmd.push(`--with-cc-opt="${with_cc_opt}"`)
    }

    if (with_ld_opt) {
        configure_cmd.push(`--with-ld-opt="${with_ld_opt}"`)
    }

    if (configure_opt) {
        configure_cmd.push(configure_opt)
    }

    if (with_debug) {
        configure_cmd.push("--with-debug")
    }

    if (with_no_pool) {
        configure_cmd.push("--with-no-pool-patch")
    }

    if (openssl_src) {
        configure_cmd.push(`--with-openssl=${openssl_src}`)

        if (with_openssl_opt) {
            configure_cmd.push(`--with-openssl-opt=${with_openssl_opt}`)
        }

    } else {
        core.info("with-openssl-version not supplied, building without SSL")

        configure_cmd.push("--without-stream_ssl_module")
        configure_cmd.push("--without-http_ssl_module")
    }

    await sh(configure_cmd.join(" "), { cwd: openresty_src }).catch()
    await sh(`make -j${NPROC}`, { cwd: openresty_src }).catch()
    await sh("make install", { cwd: openresty_src }).catch()

    return openresty_prefix
}

async function main() {
    let openssl_src
    let openssl_version = core.getInput("with-openssl-version")

    if (openssl_version) {

        /* OpenSSL */

        let arr = openssl_version.match(/(?<semver>(?<maj>\d)\.(?<min>\d)(?:\.(?<patch>\d))?)-?(?<suffix>\S*)/)
        if (!arr || arr.groups.maj != 1) {
            return core.setFailed(`Unsupported OpenSSL version: ${openssl_version}`)
        }

        let openssl = arr.groups
        openssl.version = arr[0]

        let openssl_url = `${OPENSSL_HOST}/source/old/${openssl.semver}/openssl-${openssl.version}.tar.gz`
        openssl_src = await download("OpenSSL", openssl_url, openssl_version).catch()

        try {
            core.info(`Applying OpenSSL patch version ${OPENSSL_PATCH_VER}`)

            let openssl_patch_url = `https://raw.githubusercontent.com/openresty/openresty/master/patches/openssl-${OPENSSL_PATCH_VER}-sess_set_get_cb_yield.patch`
            let openssl_patch  = await download("openssl-patch", openssl_patch_url, OPENSSL_PATCH_VER)

            sh(`patch --forward -p1 < ${openssl_patch}`, { cwd: openssl_src })

        } catch (e) {
            core.warning(`Failed applying OpenSSL patch: ${e}`)

        } finally  {
            await build_openssl(openssl_src, openssl).catch()
        }
    }

    /* OpenResty */

    let openresty_version = core.getInput("version", { required: true })
    let openresty_url = `${OPENRESTY_HOST}/download/openresty-${openresty_version}.tar.gz`
    let openresty_src = await download("OpenResty", openresty_url, openresty_version).catch()
    let openresty_prefix = await build_openresty(openresty_src, openresty_version, openssl_src).catch()

    /* $PATH */

    core.addPath(path.join(`${openresty_prefix}`, "bin"))
    core.addPath(path.join(`${openresty_prefix}`, "nginx", "sbin"))
}

main().catch(err => {
    core.setFailed(`Failed installing OpenResty: ${err}`)
})
