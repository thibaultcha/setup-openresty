const path = require("path")
const core = require("@actions/core")
const cpanm = require("./cpanm")
const openssl = require("./openssl")
const openresty = require("./openresty")

async function main() {
    let openssl_src
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

        let openresty_src = await openresty.setup(openresty_version)
        await openresty.build(openresty_src, openresty_prefix, openssl_src)

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
            let dir_cpan = await cpanm.setup()
            core.exportVariable("PERL5LIB", path.join(dir_cpan, "lib", "perl5"))
        }

    } catch (e) {
        return core.setFailed(`Failed installing Test::Nginx: ${e}`)
    }
}

main().catch(e => {
    core.setFailed(`Failed: ${e}`)
})
