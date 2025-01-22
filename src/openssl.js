const fs = require("fs")
const path = require("path")
const core = require("@actions/core")
const { sh, download } = require("./tools")

const OPENSSL_HOST="https://www.openssl.org"
const GITHUB_HOST="https://github.com"

async function setup_openssl(openssl_version) {
    let arr = openssl_version.match(/(?<semver>(?<maj>\d)\.(?<min>\d)(?:\.(?<patch>\d))?)-?(?<suffix>\S*)/)
    if (!arr) {
        return core.setFailed(`Unsupported OpenSSL version: ${openssl_version}`)
    }

    let openssl = arr.groups
    openssl.version = arr[0]

    let openssl_url

    switch (openssl.maj) {
        case "1":
            openssl_url = `${OPENSSL_HOST}/source/old/${openssl.semver}/openssl-${openssl.version}.tar.gz`
            break;

        case "3":
            openssl_url = `${GITHUB_HOST}/openssl/openssl/releases/download/openssl-${openssl.version}/openssl-${openssl.version}.tar.gz`
            break;

        default:
            return core.setFailed(`Unsupported OpenSSL version: ${openssl_version}`)
    }

    let openssl_src = await download("OpenSSL", openssl_url, openssl_version)

    try {
        let patch_ver

        switch (`${openssl.maj}.${openssl.min}`) {
            case "3.0":
                /* 3.0.x */
                patch_ver = openssl.version
                break;

            case "1.0":
                /* 1.0.2 */
                patch_ver = "1.0.2h"
                break;

            case "1.1":
                /* 1.1.0 */
                if (openssl.patch == "0") {
                    if (!openssl.suffix || openssl.suffix <= "c") {
                        /* <= 1.1.0c */
                        patch_ver = "1.1.0c"

                    } else if (openssl.suffix < "j") {
                        /* >= 1.1.0d */
                        patch_ver = "1.1.0d"

                    } else {
                        /* >= 1.1.0j */
                        patch_ver = "1.1.0j"
                    }

                    break;
                }

                if (!openssl.suffix || openssl.suffix < "c") {
                    /* 1.1.1 */
                    break;

                } else if (openssl.suffix == "c") {
                    /* 1.1.1c */
                    patch_ver = "1.1.1c"

                } else if (openssl.suffix == "d") {
                    /* 1.1.1d */
                    patch_ver = "1.1.1d"

                } else if (openssl.suffix == "e") {
                    /* 1.1.1e */
                    patch_ver = "1.1.1e"

                } else {
                    /* 1.1.1f */
                    patch_ver = "1.1.1f"
                }

            default:
                break;
        }

        if (patch_ver === undefined) {
            throw(`version ${openssl.version} does not have a compatible patch`)
        }

        core.info(`Applying OpenSSL patch version ${patch_ver}`)

        let openssl_patch_url = `https://raw.githubusercontent.com/openresty/openresty/master/patches/openssl-${patch_ver}-sess_set_get_cb_yield.patch`
        let openssl_patch  = await download("openssl-patch", openssl_patch_url, patch_ver)

        await sh(`patch --forward -p1 < ${openssl_patch}`, { cwd: openssl_src })

    } catch (e) {
        core.warning(`Failed applying OpenSSL patch: ${e}`)

    } finally  {
        if (openssl.maj == "1" && openssl.min == "0"
            && fs.existsSync(path.join(openssl_src, "Makefile"))) {
            /* 1.0.2 bug */
            fs.unlinkSync(path.join(openssl_src, "Makefile"))
        }

        return openssl_src
    }
}

/*
async function build_openssl(openssl_src, openssl) {
    let openssl_prefix = path.join(process.env.GITHUB_WORKSPACE, "openssl", openssl.version)
    let configure_cmd = ["./config",
        `--prefix=${openssl_prefix}`,
        `--openssldir=${openssl_prefix}/openssl`,
        "-g",
        "no-shared",
        "no-threads",
        "-DPURIFY"]

    if (openssl.min == "1") {
        // 1.1.x
        configure_cmd.push("no-unit-test")
        configure_cmd.push("enable-ssl3")
        configure_cmd.push("enable-ssl3-method")

        if (openssl.patch == "1") {
            // 1.1.1
            configure_cmd.push("enable-tls1_3")
        }

    } else {
        // 1.0.x
        configure_cmd.push("no-tests")
    }

    return openssl_prefix

    await sh(configure_cmd.join(" "), { cwd: openssl_src })
    await sh(`make -j${NPROC}`, { cwd: openssl_src })
    await sh("make install_sw", { cwd: openssl_src })
}
*/

module.exports.setup = setup_openssl
