const core = require("@actions/core")
const path = require("path")
const { sh, download } = require("./tools")
const { DIR_WORK, NPROC } = require("./constants")

const OPENRESTY_HOST="https://openresty.org"
const DIR_BUILD = path.join(DIR_WORK, "build")

async function setup_openresty(openresty_version) {
    let openresty_src

    try {
        let openresty_url = `${OPENRESTY_HOST}/download/openresty-${openresty_version}.tar.gz`
        openresty_src = await download("OpenResty", openresty_url, openresty_version)

    } catch (e) {
        return core.setFailed(`Failed building OpenResty: ${e}`)
    }

    return openresty_src
}

async function build_openresty(openresty_version, openresty_src, openresty_prefix, openssl_src) {
    let configure_opt = core.getInput("opt")
    let with_cc = core.getInput("cc")
    let with_cc_opt = core.getInput("cc-opt")
    let with_ld_opt = core.getInput("ld-opt")
    let with_debug = core.getBooleanInput("debug")
    let with_no_pool = core.getBooleanInput("no-pool-patch")
    let with_openssl_opt = core.getInput("openssl-opt")

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
        core.info("openssl-version not supplied, building without SSL")

        let arr = openresty_version.match(/(?<maj>\d+)\.(?<min>\d+)\.(?<patch>\d+)\.(?<suffix>\d+)/)
        if (!arr) {
            throw new Error(`Failed parsing OpenResty version (${openresty_version})`)
        }

        let maj = parseInt(arr.groups.maj, 10)
        let min = parseInt(arr.groups.min, 10)

        if (maj == 1 && min >= 15) {
            configure_cmd.push("--without-stream_ssl_module")
        }

        if (maj == 1 && min >= 13) {
            /* remove the module entirely, no support without SSL */
            configure_cmd.push("--without-stream_lua_module")
        }

        if (maj == 1 && min <= 13) {
            /* avoid a compilation bug with ngx_libc_crypt */
            configure_cmd.push("--without-http_auth_basic_module")
        }

        configure_cmd.push("--without-http_ssl_module")
    }

    await sh(configure_cmd.join(" "), { cwd: openresty_src })
    await sh(`make -j${NPROC}`, { cwd: openresty_src })
    await sh("make install", { cwd: openresty_src })

    return openresty_prefix
}

module.exports.setup = setup_openresty
module.exports.build = build_openresty
