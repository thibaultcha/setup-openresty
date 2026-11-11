const path = require("path")
const core = require("@actions/core")
const cpanm = require("./cpanm")
const openssl = require("./openssl")
const openresty = require("./openresty")

async function main() {
    let openssl_src
    let test_nginx_pin = "Test::Nginx"
    try {
        /* OpenSSL */
        let openssl_version = core.getInput("openssl-version")
        if (openssl_version) {
            openssl_src = await openssl.setup(openssl_version)
        }

    } catch (e) {
        return core.setFailed(`Failed setting up OpenSSL: ${e}`)
    }

    try {
        /* OpenResty */
        let openresty_version = core.getInput("version", { required: true })
        let openresty_prefix = path.join(process.env.GITHUB_WORKSPACE, "openresty", openresty_version)

        let res = await openresty.setup(openresty_version)
        await openresty.build(openresty_version, res.openresty_src,
                              openresty_prefix, openssl_src,
                              res.pcre_src)

        /* Test::Nginx 0.31+ runs nginx with '-e', which the nginx core
         * bundled by OpenResty releases shipping nginx below 1.19.4 does
         * not support (the 4th version component is the OpenResty patch
         * version, not part of the nginx core version) */
        let arr = openresty_version.match(/(?<maj>\d+)\.(?<min>\d+)\.(?<patch>\d+)\.(?<suffix>\d+)/)
        if (arr) {
            let nginx_ver = parseInt(`${arr.groups.maj}${String(arr.groups.min).padStart(2, "0")}` +
                                     `${String(arr.groups.patch).padStart(2, "0")}`, 10)
            if (nginx_ver < 11904) {
                test_nginx_pin = '"Test::Nginx~< 0.31"'
            }
        }

        core.addPath(path.join(`${openresty_prefix}`, "bin"))
        core.addPath(path.join(`${openresty_prefix}`, "nginx", "sbin"))
        core.setOutput("OPENRESTY_PREFIX", openresty_prefix)

    } catch (e) {
        return core.setFailed(`Failed setting up OpenResty: ${e}`)
    }

    try {
        /* Test::Nginx */
        let test_nginx = core.getBooleanInput("test-nginx")
        if (test_nginx) {
            let dir_cpan = await cpanm.setup(test_nginx_pin)
            core.exportVariable("PERL5LIB", path.join(dir_cpan, "lib", "perl5"))
        }

    } catch (e) {
        return core.setFailed(`Failed installing Test::Nginx: ${e}`)
    }
}

main().catch(e => {
    core.setFailed(`Failed: ${e}`)
})
